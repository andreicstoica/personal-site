export type BookshelfKind = "book" | "article";

export type CoverTheme =
	| "ink"
	| "primary"
	| "secondary"
	| "accent"
	| "warning"
	| "paper";

export type CoverLayout = "stack" | "banner" | "diagonal" | "corner";

export type BookshelfItem = {
	id: string;
	kind: BookshelfKind;
	title: string;
	author: string;
	year?: string;
	url?: string;
	note?: string;
	/** Optional cover image under /public/images/bookshelf/ */
	cover?: string;
	/** Typographic cover when no image is set */
	poster: {
		theme: CoverTheme;
		layout: CoverLayout;
	};
};

/**
 * Books and articles for the About bookshelf.
 * Add items as the owner provides them.
 */
export const bookshelf: BookshelfItem[] = [
	{
		id: "what-is-code",
		kind: "article",
		title: "What Is Code?",
		author: "Paul Ford",
		year: "2015",
		url: "https://www.bloomberg.com/graphics/2015-paul-ford-what-is-code/",
		note: "Bloomberg Businessweek’s deep dive into how software actually works.",
		poster: { theme: "primary", layout: "banner" },
	},
	{
		id: "2026-advice",
		kind: "article",
		title: "The Old World Is Dying",
		author: "Jasmine Sun",
		year: "2026",
		url: "https://jasmi.news/p/2026-advice",
		note: "Opinionated advice for graduating into the age of AI.",
		poster: { theme: "warning", layout: "diagonal" },
	},
];

export function getBookshelfByKind(kind: BookshelfKind): BookshelfItem[] {
	return bookshelf.filter((item) => item.kind === kind);
}
