import { tool } from "ai";
import { z } from "astro/zod";
import type {
	OpenPageOutput,
	ReadPostOutput,
	SceneControlsOutput,
	SearchPostsOutput,
} from "./chatTypes";
import { guidePostSearch, guidePosts, pageSections } from "./guideContent";
import { siteRoutes } from "./memorySelect";
import { resolveOpenPage } from "./siteSections";

/** About 2,500 tokens: enough for the argument of a post, and a cap on what
 *  one call adds to the next model step. */
const POST_CHARS = 10_000;

/** Three passages of up to 700 characters: enough to answer from, or to
 *  pick the one post worth reading in full. */
const SEARCH_HITS = 3;

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
				// The model sometimes passes the URL's last segment instead of the
				// list's slug; both name the same post.
				const wanted = slug.replace(/\/$/, "").split("/").pop() ?? slug;
				const post = guidePosts().find(
					(item) =>
						item.slug === wanted ||
						item.url?.replace(/\/$/, "").endsWith(`/${wanted}`),
				);
				if (!post?.url) throw new Error(`Unknown post ${slug}`);
				return {
					title: post.title,
					url: post.url,
					...(post.date ? { date: post.date } : {}),
					text: post.text.slice(0, POST_CHARS),
				};
			},
		}),
		search_posts: tool({
			description:
				"Search the text of Andrei's blog posts by keywords, for a topic the post titles and tags do not show.",
			inputSchema: z.object({
				query: z.string().max(200).describe("A few keywords"),
			}),
			execute: async ({ query }): Promise<SearchPostsOutput> => ({
				hits: guidePostSearch()
					.search(query, SEARCH_HITS)
					.flatMap((hit) =>
						hit.slug && hit.url
							? [
									{
										slug: hit.slug,
										title: hit.title,
										url: hit.url,
										...(hit.date ? { date: hit.date } : {}),
										excerpt: hit.text,
									},
								]
							: [],
					),
			}),
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
		show_scene_controls: tool({
			description:
				"Show buttons under the reply that change the banner at the top of the page: its place, weather, and time of day.",
			inputSchema: z.object({}),
			execute: async (): Promise<SceneControlsOutput> => ({ shown: true }),
		}),
	};
}
