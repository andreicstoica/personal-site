import type { OpenPageOutput } from "./chatTypes";
import type { GuideDoc, SearchHit } from "./guideSearch";
import type { Outage } from "./inference";
import {
	isNavigationIntent,
	isSmallTalk,
	type MemorySection,
	matchRoute,
	type SiteRoute,
	siteRoutes,
} from "./memorySelect";
import type { PageSection } from "./siteSections";

function clip(body: string, max: number): string {
	const trimmed = body.trim();
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, max).trimEnd()}…`;
}

function siteMap(
	sectionsByPath: Readonly<Record<string, readonly PageSection[]>>,
): string {
	return siteRoutes
		.map((route) => {
			const sections = sectionsByPath[route.href] ?? [];
			const list = sections.length
				? `. Sections: ${sections.map((section) => section.id).join(", ")}`
				: "";
			return `${route.href} — ${route.label}${list}`;
		})
		.join("\n");
}

function noteBlock(notes: readonly MemorySection[]): string {
	return notes
		.map((note) => {
			const route = note.route ? ` (${note.route})` : "";
			return `## ${note.title}${route}\n${note.body}`;
		})
		.join("\n\n");
}

function postList(posts: readonly GuideDoc[]): string {
	return posts
		.map((post) => {
			const date = post.date ?? "undated";
			const tags = post.tags?.length ? ` [${post.tags.join(", ")}]` : "";
			return `- ${post.slug}: ${post.title} (${date}) ${post.url}${tags}`;
		})
		.join("\n");
}

/** Everything the guide knows fits in about 5,000 tokens, so it rides in the
 *  prompt and most answers need no tool call. Post bodies are the exception:
 *  read_post loads one when a question needs more than its title. The page
 *  the visitor is on comes last, so the rest is one fixed, cacheable prefix. */
export function buildSystemPrompt(context: {
	notes: readonly MemorySection[];
	posts: readonly GuideDoc[];
	sectionsByPath: Readonly<Record<string, readonly PageSection[]>>;
	viewing?: SiteRoute;
}): string {
	const { notes, posts, sectionsByPath, viewing } = context;
	return `You are the guide on Andrei Stoica's site, andrei.bio. You are not Andrei. Always speak about him in the third person, as Andrei or he. Never write I, me, my, or we, for him or for yourself. Visitors often call him you; answer about him all the same. His posts are in his own words, so retell them in the third person. Be concise and direct, with no filler.

Answer from the notes and the post list below. Call read_post only when the question needs what a post says, not just its title or date. If nothing below covers the question, say his notes don't cover it, and open a related page if one fits. Never invent people, employers, dates, or project details.

Call open_page when the visitor asks to see a page, and whenever your reply will point them to a page for the rest, such as the canon for people and works. Call it before you write the reply, with a section id from the site map when one section answers the question. The site opens the page beside the chat after your reply, so say the rest is on that page. When the visitor is already on that page, call open_page only with a section, so the page scrolls to it; with no fitting section, skip it. Call open_page at most once, and never for a page that adds nothing.

Keep replies under 100 words. Use one of two shapes.

A list answer, for any question about people, inspirations, influences, works, posts, or tools: a heading of three to five words in sentence case, three to five bullets, then the pointer line. A bullet holds one item, or a bold group name and at most three items.
### Short heading in sentence case
- **Group:** item, item, item
- Single item

A prose answer: two or three sentences, no heading, then the pointer line when a page or post has more.

Use Markdown only for headings, bullets, and bold group names. The pointer line is one short plain sentence that names the page by its label in the site map, followed by the word page, or the post by its title, such as: The rest is on the Canon page. Or: More in the 2025 Favorites post. Say the page or the post, not his page or his post. A page pointer line needs an open_page call for that page in this turn; without one, end the reply with no page pointer line. If you called read_post, the pointer line names that post and nothing else, such as: More in the Dyson post. Never point to a page that is not in the site map. No links, no paths, no URLs: the site shows a card under the reply that links the page you opened or the post you read. Never bold a page or post name instead of linking it, and never print a bare URL or path.

Site map:
${siteMap(sectionsByPath)}

Posts, newest first (slug: title (date) URL [tags]):
${postList(posts)}

Notes:
${noteBlock(notes)}${viewing ? `\n\nThe visitor is viewing ${viewing.label} (${viewing.href}). "This page" means that page.` : ""}`;
}

export const OUTAGE_NOTICE: Record<Outage, string> = {
	budget:
		"The guide's model is out of credit this month, so this answer comes straight from Andrei's notes.",
	busy: "Lots of questions at once, so this answer comes straight from Andrei's notes. Try again in a minute.",
	error:
		"The model didn't answer, so this answer comes straight from Andrei's notes.",
};

/** The reply without a model: the first sentence of the best note. A post
 *  is named, not quoted: posts are in Andrei's first person, and the guide
 *  only speaks about him. */
export function notesText(
	message: string,
	results: readonly SearchHit[],
): string {
	if (isSmallTalk(message)) {
		return "Hey. Ask about Andrei's writing, the people he looks up to, or how this site was built.";
	}
	const best = results[0];
	if (!best?.text) {
		return "Andrei's notes don't cover that. Ask about his writing, the canon, or how this site was built.";
	}
	if (best.url) return `Andrei wrote about this in his post ${best.title}.`;
	const paragraph = best.text.trim().split(/\n\s*\n/)[0] ?? "";
	const sentence = paragraph.split(/(?<=[.!?])\s+/)[0] ?? paragraph;
	return clip(sentence, 220);
}

/** Without a model, only an explicit "show me X" opens a page. */
export function notesOpenPage(message: string): OpenPageOutput | null {
	if (!isNavigationIntent(message)) return null;
	const route = matchRoute(message);
	return route ? { href: route.href, label: route.label } : null;
}
