import {
	createGuideSearch,
	createPassageFinder,
	type GuideDoc,
	type GuideSearch,
	noteDocs,
	postDocs,
	postIndex,
	type SearchHit,
} from "./guideSearch";
import { fileStem, parseKnowledgeFile } from "./knowledge";
import { loadMemorySections } from "./memory";

export { loadMemorySections as guideNotes };

import {
	experienceSections,
	markdownSections,
	type PageSection,
} from "./siteSections";

const pageFiles = import.meta.glob("../content/pages/*.md", {
	eager: true,
	query: "?raw",
	import: "default",
});

// Posts at the top of the folder only; `posts/archive` has no URLs to cite.
const postFiles = import.meta.glob("../content/knowledge/posts/*.md", {
	eager: true,
	query: "?raw",
	import: "default",
});

function pageBody(slug: string): string {
	const raw = pageFiles[`../content/pages/${slug}.md`];
	if (typeof raw !== "string") return "";
	return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

/** Sections the guide can scroll to, by path. Every id here must exist on
 *  the rendered page: MarkdownSections and ExperienceRow use the same ids. */
export const pageSections: Readonly<Record<string, readonly PageSection[]>> = {
	"/": experienceSections(),
	"/about": markdownSections(pageBody("about")),
	"/canon": markdownSections(pageBody("canon")),
	"/colophon": markdownSections(pageBody("colophon")),
	"/fitness": [
		...markdownSections(pageBody("race")),
		...markdownSections(pageBody("outdoors")),
	],
};

let posts: GuideDoc[] | undefined;
let search: GuideSearch | undefined;

/** Blog posts from the knowledge library, newest first. */
export function guidePosts(): GuideDoc[] {
	posts ??= postIndex(
		postDocs(
			Object.entries(postFiles).flatMap(([path, raw]) =>
				typeof raw === "string"
					? [{ slug: fileStem(path), file: parseKnowledgeFile(raw) }]
					: [],
			),
		),
	);
	return posts;
}

export function guideSearch(): GuideSearch {
	search ??= createGuideSearch([
		...noteDocs(loadMemorySections()),
		...guidePosts(),
	]);
	return search;
}

let passages: ((question: string) => SearchHit[]) | undefined;

/** The post passages the route adds to one turn's prompt. */
export function guidePassages(question: string): SearchHit[] {
	passages ??= createPassageFinder(guidePosts());
	return passages(question);
}
