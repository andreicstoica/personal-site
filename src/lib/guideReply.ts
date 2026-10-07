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
import { captionWords, type SceneParts } from "./weather/scene";

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
	/** What the visitor's banner shows now. */
	scene?: SceneParts;
	/** Post passages the route picked for this question. */
	passages?: readonly SearchHit[];
}): string {
	const { notes, posts, sectionsByPath, viewing, scene, passages } = context;
	return `You are the guide on Andrei Stoica's site, andrei.bio, and you are not Andrei. Speak about him in the third person (Andrei, he), never as I, me, my, or we, even when a visitor calls him you, a post is in his own words, or you are only saying hello. Be concise and direct.

Answer only from what is below: the notes, the post list, and any passages from his posts at the end. Never invent people, employers, dates, or project details. If nothing below covers the question, say his notes don't cover it.

Decide on tools before you write anything: you cannot call one once the reply has started.
- read_post: when the answer needs what a post says beyond its title or a passage below.
- open_page: when a page has the rest of the answer, such as the canon for people and works, or when the visitor asks to see a page. Pass a section id from the site map when one section fits. Call it at most once; on the page the visitor is already on, use it only to scroll to a section.
- show_scene_controls: whenever the visitor mentions the banner, the picture or landscape at the top of the page, or its place, weather, or light, including how it was made. Then say the buttons below the reply change it. The end of this prompt says what the banner shows now.

Write under 100 words. For people, works, or tools, write a short heading and three to five bullets; otherwise two or three sentences. End with one plain pointer line when a page or post has more, such as: The rest is on the Canon page. Or: More in the post "2025 Favorites". The site shows a card that links it, so never print a URL or path.

Site map:
${siteMap(sectionsByPath)}

Posts, newest first (slug: title (date) URL [tags]):
${postList(posts)}

Notes:
${noteBlock(notes)}${turnContext({ viewing, scene, passages })}`;
}

/** The part of the prompt that changes from turn to turn. It comes last, so
 *  everything above it stays one cacheable prefix. */
function turnContext(context: {
	viewing?: SiteRoute;
	scene?: SceneParts;
	passages?: readonly SearchHit[];
}): string {
	const lines: string[] = [];
	if (context.viewing)
		lines.push(
			`The visitor is viewing ${context.viewing.label} (${context.viewing.href}). "This page" means that page.`,
		);
	if (context.scene) {
		const words = captionWords(context.scene);
		lines.push(
			`The banner at the top of the page shows a ${words.weather} ${words.time} at ${words.place}.`,
		);
	}
	if (context.passages?.length)
		lines.push(
			`Passages from his posts for this question:\n${context.passages
				.map(
					(hit) =>
						`- ${hit.slug}: ${hit.title}${hit.date ? ` (${hit.date})` : ""}\n"${hit.text}"`,
				)
				.join("\n")}`,
		);
	return lines.map((line) => `\n\n${line}`).join("");
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
