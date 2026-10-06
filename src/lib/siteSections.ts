import type { OpenPageOutput } from "./chatTypes";
import { experiences } from "./experience";
import { parseMarkdownContent } from "./markdownUtils";
import { routeByHref } from "./memorySelect";

/** A part of a page the guide can scroll to. `id` is the element id. */
export type PageSection = { id: string; label: string };

/** Lowercase words joined by hyphens. Astro gives rendered markdown headings
 *  the same id for plain titles ("Running" → "running"), so one function
 *  covers both the custom section renderer and Astro's own headings. */
export function sectionId(title: string): string {
	return (
		title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "section"
	);
}

/** Canon headings are lowercase in the source and capitalized by CSS. */
function sentenceCase(title: string): string {
	const trimmed = title.trim();
	return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function markdownSections(body: string): PageSection[] {
	return parseMarkdownContent(body)
		.filter((section) => section.title.trim())
		.map((section) => ({
			id: sectionId(section.title),
			label: sentenceCase(section.title),
		}));
}

export function experienceRowId(name: string): string {
	return `row-${sectionId(name)}`;
}

export function experienceSections(): PageSection[] {
	return experiences.map((experience) => ({
		id: experienceRowId(experience.name),
		label: experience.name,
	}));
}

/** Matches a section by id or label, so "Movies" and "movies" both work. */
export function findSection(
	sections: readonly PageSection[],
	wanted: string,
): PageSection | undefined {
	const key = wanted.trim().toLowerCase();
	return sections.find(
		(section) =>
			section.id === key ||
			section.label.toLowerCase() === key ||
			section.id === sectionId(key),
	);
}

/** Resolves an open_page call to a known route and, when it names one, a
 *  known section. An unknown section opens the page at the top. */
export function resolveOpenPage(
	path: string,
	section: string | undefined,
	sectionsByPath: Readonly<Record<string, readonly PageSection[]>>,
): OpenPageOutput | null {
	const route = routeByHref(path);
	if (!route) return null;
	const found = section
		? findSection(sectionsByPath[route.href] ?? [], section)
		: undefined;
	return {
		href: route.href,
		label: route.label,
		...(found ? { section: found } : {}),
	};
}

const SITE_LINK =
	/\]\((?:https:\/\/(?:www\.)?andrei\.bio)?(\/[a-z0-9/-]*)(?:#([a-z0-9-]+))?\)/gi;

/** The first page of this site a reply links to, such as "[Canon]
 *  (/canon#movies)", resolved against the known routes and sections. */
export function linkedPage(
	text: string,
	sectionsByPath: Readonly<Record<string, readonly PageSection[]>>,
): OpenPageOutput | null {
	for (const match of text.matchAll(SITE_LINK)) {
		const path = match[1] ?? "";
		const page = resolveOpenPage(
			path.length > 1 ? path.replace(/\/$/, "") : path,
			match[2],
			sectionsByPath,
		);
		if (page) return page;
	}
	return null;
}
