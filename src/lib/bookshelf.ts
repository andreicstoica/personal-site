export type BookshelfKind = 'book' | 'article';

export type PosterTheme =
	| 'ink'
	| 'primary'
	| 'secondary'
	| 'accent'
	| 'warning'
	| 'paper';

export type PosterLayout = 'stack' | 'banner' | 'diagonal' | 'corner';

export type BookshelfItem = {
	id: string;
	kind: BookshelfKind;
	title: string;
	author: string;
	/** Optional year or date string shown on the poster */
	year?: string;
	/** External link when available */
	url?: string;
	/** Short why-it-matters note */
	note?: string;
	/** Show first when using featured filter */
	featured?: boolean;
	/** Optional real cover/poster image under /public/images/bookshelf/ */
	cover?: string;
	poster: {
		theme: PosterTheme;
		layout: PosterLayout;
	};
};

/**
 * Books and articles for the About bookshelf.
 * Populate from the owner's list — leave empty until then.
 */
export const bookshelf: BookshelfItem[] = [];

export function getBookshelfByKind(kind: BookshelfKind): BookshelfItem[] {
	return bookshelf.filter((item) => item.kind === kind);
}
