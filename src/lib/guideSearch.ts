import MiniSearch from "minisearch";
import type { MemorySection } from "./memorySelect";

/** One searchable source: a memory note (a site path) or a post (a URL). */
export type GuideDoc = {
	id: string;
	title: string;
	text: string;
	/** A site path, for notes about a page. */
	href?: string;
	/** An external URL, for posts. */
	url?: string;
	/** ISO date (YYYY-MM-DD), for posts. */
	date?: string;
	/** File name in `rag/data`, for posts; the id `read_post` takes. */
	slug?: string;
	tags?: string[];
};

export type SearchHit = {
	title: string;
	/** For posts: the id read_post takes. */
	slug?: string;
	href?: string;
	url?: string;
	date?: string;
	text: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function noteDocs(sections: readonly MemorySection[]): GuideDoc[] {
	return sections.map((section) => ({
		id: `note:${section.id}`,
		title: section.title,
		text: section.body,
		...(section.route ? { href: section.route } : {}),
	}));
}

/** Posts with a blog URL and a body, from `rag/data` metadata and text.
 *  Older newsletter text without a URL stays out: the guide cannot cite it. */
export function postDocs(
	entries: ReadonlyArray<{ slug: string; meta: unknown; text: unknown }>,
): GuideDoc[] {
	const posts: GuideDoc[] = [];
	for (const { slug, meta, text } of entries) {
		if (!isRecord(meta)) continue;
		if (meta.type !== "blog" && meta.type !== "essay") continue;
		const url = meta.sourceUrl;
		const title = meta.title;
		if (typeof url !== "string" || !url.startsWith("https://blog.andrei.bio/"))
			continue;
		if (typeof title !== "string") continue;
		if (typeof text !== "string" || !text.trim()) continue;
		const date =
			typeof meta.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(meta.date)
				? meta.date
				: undefined;
		const tags = Array.isArray(meta.tags)
			? meta.tags.filter((tag): tag is string => typeof tag === "string")
			: [];
		posts.push({
			id: `post:${slug}`,
			slug,
			title,
			text,
			url,
			tags,
			...(date ? { date } : {}),
		});
	}
	return posts;
}

/** Posts newest first; undated posts go last. */
export function postIndex(docs: readonly GuideDoc[]): GuideDoc[] {
	return docs
		.filter((doc) => doc.slug && doc.url)
		.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

type Chunk = { id: string; docId: string; title: string; text: string };

const CHUNK_CHARS = 900;
const HIT_CHARS = 700;

const STOP = new Set(
	"a an and are as at be but by can did do does for from has have how i in is it its me my of on or so that the their this to was what when where which who why will with you your about tell show hi hey hello thanks".split(
		" ",
	),
);

/** Paragraph-aligned chunks, so a hit quotes whole thoughts. A long
 *  paragraph becomes its own chunk rather than being cut mid-sentence. */
export function chunkText(text: string, max = CHUNK_CHARS): string[] {
	const paragraphs = text
		.split(/\n\s*\n/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean);
	const chunks: string[] = [];
	let current = "";
	for (const paragraph of paragraphs) {
		if (current && current.length + paragraph.length + 2 > max) {
			chunks.push(current);
			current = "";
		}
		current = current ? `${current}\n\n${paragraph}` : paragraph;
	}
	if (current) chunks.push(current);
	return chunks;
}

function clip(text: string, max: number): string {
	if (text.length <= max) return text;
	return `${text.slice(0, max).trimEnd()}…`;
}

/** A word in at most this many posts is rare: a name, a place, a product.
 *  Common words match most posts and point nowhere. */
const RARE_IN_POSTS = 2;
const RARE_MIN_LENGTH = 4;
const PASSAGES = 2;
/** A matched chunk plus its neighbors: the answer often sits a paragraph
 *  away from the rare word ("tuned" in one, "RunPod" in the next). */
const PASSAGE_CHARS = 1800;

function words(text: string): Set<string> {
	return new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

type PostChunk = { id: string; slug: string; index: number; text: string };

/** Post passages for one question, chosen by code rather than by the model
 *  deciding to search. Only a rare word in the question counts, so broad
 *  questions, which the notes and post titles answer, get no passages. */
export function createPassageFinder(
	posts: readonly GuideDoc[],
): (question: string) => SearchHit[] {
	const bySlug = new Map<string, { post: GuideDoc; chunks: PostChunk[] }>();
	for (const post of posts) {
		if (!post.slug) continue;
		const slug = post.slug;
		bySlug.set(slug, {
			post,
			chunks: chunkText(post.text).map((text, index) => ({
				id: `${slug}#${index}`,
				slug,
				index,
				text,
			})),
		});
	}
	const vocabulary = posts.map((post) => ({
		slug: post.slug,
		words: words(`${post.title} ${post.text}`),
	}));
	// Exact words only: fuzzy matching would reach a post without the word.
	const index = new MiniSearch<PostChunk>({
		fields: ["text"],
		storeFields: ["slug", "index"],
		processTerm: (term) => term.toLowerCase(),
	});
	index.addAll([...bySlug.values()].flatMap((entry) => entry.chunks));

	return (question) => {
		const rare: string[] = [];
		for (const term of words(question)) {
			if (term.length < RARE_MIN_LENGTH) continue;
			const having = vocabulary.filter((post) => post.words.has(term)).length;
			if (having > 0 && having <= RARE_IN_POSTS) rare.push(term);
		}
		if (rare.length === 0) return [];
		const hits: SearchHit[] = [];
		const seen = new Set<string>();
		for (const result of index.search(rare.join(" "))) {
			const slug = String(result.slug);
			const entry = bySlug.get(slug);
			if (!entry || seen.has(slug)) continue;
			seen.add(slug);
			const at = Number(result.index);
			const window = entry.chunks
				.slice(Math.max(0, at - 1), at + 2)
				.map((chunk) => chunk.text)
				.join("\n\n");
			hits.push({
				title: entry.post.title,
				slug,
				...(entry.post.url ? { url: entry.post.url } : {}),
				...(entry.post.date ? { date: entry.post.date } : {}),
				text: clip(window, PASSAGE_CHARS),
			});
			if (hits.length >= PASSAGES) break;
		}
		return hits;
	};
}

/** Keyword search over notes and posts, for the answer the guide gives
 *  when no model is reachable. */
export type GuideSearch = {
	search(query: string, limit?: number): SearchHit[];
};

export function createGuideSearch(docs: readonly GuideDoc[]): GuideSearch {
	const byId = new Map(docs.map((doc) => [doc.id, doc]));
	const chunks: Chunk[] = docs.flatMap((doc) =>
		chunkText(doc.text).map((text, index) => ({
			id: `${doc.id}#${index}`,
			docId: doc.id,
			title: doc.title,
			text,
		})),
	);
	const index = new MiniSearch<Chunk>({
		fields: ["title", "text"],
		storeFields: ["docId", "text"],
		processTerm: (term) => {
			const lower = term.toLowerCase();
			return lower.length < 2 || STOP.has(lower) ? null : lower;
		},
		// Short terms match too much by prefix or typo ("hi" → "highlights").
		searchOptions: {
			boost: { title: 3 },
			// Notes are written to answer questions; posts only mention things.
			boostDocument: (_id, _term, stored) =>
				String(stored?.docId).startsWith("note:") ? 3 : 1,
			prefix: (term) => term.length >= 4,
			fuzzy: (term) => (term.length >= 5 ? 0.15 : false),
		},
	});
	index.addAll(chunks);

	return {
		search(query, limit = 4) {
			const seen = new Set<string>();
			const hits: SearchHit[] = [];
			for (const result of index.search(query)) {
				const doc = byId.get(String(result.docId));
				if (!doc || seen.has(doc.id)) continue;
				seen.add(doc.id);
				hits.push({
					title: doc.title,
					...(doc.slug ? { slug: doc.slug } : {}),
					...(doc.href ? { href: doc.href } : {}),
					...(doc.url ? { url: doc.url } : {}),
					...(doc.date ? { date: doc.date } : {}),
					text: clip(String(result.text), HIT_CHARS),
				});
				if (hits.length >= limit) break;
			}
			return hits;
		},
	};
}
