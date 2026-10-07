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

const postMeta = import.meta.glob("../../rag/data/*.json", {
	eager: true,
	import: "default",
});

const postText = import.meta.glob("../../rag/data/*.txt", {
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
let postSearch: GuideSearch | undefined;

/** Blog posts from `rag/data`, newest first. */
export function guidePosts(): GuideDoc[] {
	posts ??= postIndex(
		postDocs(
			Object.entries(postMeta).map(([path, meta]) => ({
				slug: path.replace(/^.*\//, "").replace(/\.json$/, ""),
				meta,
				text: postText[path.replace(/\.json$/, ".txt")],
			})),
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

/** Post bodies only: the notes already ride in the model's prompt. */
export function guidePostSearch(): GuideSearch {
	postSearch ??= createGuideSearch(guidePosts());
	return postSearch;
}

let passages: ((question: string) => SearchHit[]) | undefined;

/** The post passages the route adds to one turn's prompt. */
export function guidePassages(question: string): SearchHit[] {
	passages ??= createPassageFinder(guidePosts());
	return passages(question);
}
