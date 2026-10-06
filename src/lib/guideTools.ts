import { tool } from "ai";
import { z } from "astro/zod";
import type { OpenPageOutput, ReadPostOutput } from "./chatTypes";
import { guidePosts, pageSections } from "./guideContent";
import { siteRoutes } from "./memorySelect";
import { resolveOpenPage } from "./siteSections";

/** About 2,500 tokens: enough for the argument of a post, and a cap on what
 *  one call adds to the next model step. */
const POST_CHARS = 10_000;

export function guideTools() {
	const [firstPath, ...otherPaths] = siteRoutes.map((route) => route.href);
	if (!firstPath) throw new Error("siteRoutes is empty");
	return {
		read_post: tool({
			description:
				"Read one of Andrei's blog posts in full, by its slug from the post list.",
			inputSchema: z.object({
				slug: z.string().max(80).describe("A slug from the post list"),
			}),
			execute: async ({ slug }): Promise<ReadPostOutput> => {
				const post = guidePosts().find((item) => item.slug === slug);
				if (!post?.url) throw new Error(`Unknown post ${slug}`);
				return {
					title: post.title,
					url: post.url,
					...(post.date ? { date: post.date } : {}),
					text: post.text.slice(0, POST_CHARS),
				};
			},
		}),
		open_page: tool({
			description:
				"Open a page of this site beside the chat, scrolled to a section when one is given.",
			inputSchema: z.object({
				path: z.enum([firstPath, ...otherPaths]),
				section: z
					.string()
					.max(80)
					.optional()
					.describe("A section id from the site map"),
			}),
			execute: async ({ path, section }): Promise<OpenPageOutput> => {
				const opened = resolveOpenPage(path, section, pageSections);
				if (!opened) throw new Error(`Unknown page ${path}`);
				return opened;
			},
		}),
	};
}
