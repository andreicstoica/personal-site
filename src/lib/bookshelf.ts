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
		id: "zen-motorcycle",
		kind: "book",
		title: "Zen and the Art of Motorcycle Maintenance",
		author: "Robert Pirsig",
		year: "1974",
		poster: { theme: "paper", layout: "stack" },
	},
	{
		id: "paper-menagerie",
		kind: "book",
		title: "The Paper Menagerie and Other Stories",
		author: "Ken Liu",
		year: "2016",
		poster: { theme: "accent", layout: "banner" },
	},
	{
		id: "three-body-problem",
		kind: "book",
		title: "The Three-Body Problem",
		author: "Cixin Liu",
		year: "2008",
		poster: { theme: "ink", layout: "diagonal" },
	},
	{
		id: "power-broker",
		kind: "book",
		title: "The Power Broker",
		author: "Robert Caro",
		year: "1974",
		poster: { theme: "ink", layout: "corner" },
	},
	{
		id: "power-law",
		kind: "book",
		title: "The Power Law",
		author: "Sebastian Mallaby",
		year: "2022",
		poster: { theme: "primary", layout: "stack" },
	},
	{
		id: "lyndon-johnson-series",
		kind: "book",
		title: "The Years of Lyndon Johnson",
		author: "Robert Caro",
		year: "1982–",
		note: "The four-volume LBJ series.",
		poster: { theme: "secondary", layout: "banner" },
	},
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
