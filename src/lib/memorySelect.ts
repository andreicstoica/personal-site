export type MemorySection = {
	id: string;
	title: string;
	route?: string;
	body: string;
};

export type SiteRoute = {
	href: string;
	label: string;
	aliases: string[];
};

export const siteRoutes: readonly SiteRoute[] = [
	{
		href: "/",
		label: "Home",
		aliases: ["home", "homepage", "home page", "work history", "resume"],
	},
	{
		href: "/about",
		label: "About",
		aliases: ["about page", "about you", "who are you", "bio"],
	},
	{
		href: "/canon",
		label: "Canon",
		aliases: ["canon", "inspirations", "inspiration"],
	},
	{
		href: "/colophon",
		label: "Colophon",
		aliases: ["colophon", "design system", "this site"],
	},
	{
		href: "/fitness",
		label: "Fitness",
		aliases: ["fitness", "running", "outdoors", "hiking"],
	},
	{
		href: "/projects/blob-game",
		label: "Blob Game",
		aliases: ["blob game", "blob", "sublobination"],
	},
	{
		href: "/projects/courtly",
		label: "Courtly",
		aliases: ["courtly", "tennis app"],
	},
	{
		href: "/projects/algos-visualized",
		label: "Algos, Visualized",
		aliases: ["algos visualized", "algos", "algorithm visualizer", "dijkstra"],
	},
	{
		href: "/projects/tarot-chat",
		label: "Daily Tarot",
		aliases: ["daily tarot", "tarot"],
	},
	{
		href: "/projects/stance-health",
		label: "Stance Health",
		aliases: ["stance health", "stance", "mystance"],
	},
	{
		href: "/projects/holdfast-network",
		label: "Holdfast Network",
		aliases: ["holdfast", "aquaculture"],
	},
	{
		href: "/projects/refract",
		label: "Refract",
		aliases: ["refract"],
	},
];

const STOP = new Set([
	"the",
	"and",
	"for",
	"with",
	"you",
	"your",
	"about",
	"what",
	"who",
	"how",
	"can",
	"are",
	"was",
	"did",
	"does",
	"have",
	"has",
	"this",
	"that",
	"from",
	"tell",
	"please",
	"me",
	"my",
	"his",
	"her",
	"their",
	"just",
	"like",
	"into",
	"show",
	"open",
	"take",
	"want",
	"know",
	"any",
	"some",
	"been",
]);

const NAV_INTENT =
	/\b(show|open|take me|go to|navigate|visit|pull up|bring me|where (?:is|can i (?:find|see)))\b/i;

function tokens(value: string): string[] {
	const raw = value.toLowerCase().match(/[a-z0-9][a-z0-9'+-]*/g) ?? [];
	const out: string[] = [];
	for (const token of raw) {
		for (const part of token.split(/[+-]/)) {
			if (part.length > 2 && !STOP.has(part)) out.push(part);
		}
	}
	return out;
}

function slug(value: string): string {
	const normalized = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return normalized || "section";
}

function mentions(haystack: string, alias: string): boolean {
	const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, "i").test(haystack);
}

export function routeByHref(href: string): SiteRoute | undefined {
	return siteRoutes.find((route) => route.href === href);
}

export function isNavigationIntent(message: string): boolean {
	return NAV_INTENT.test(message);
}

export function isSmallTalk(message: string): boolean {
	const trimmed = message.trim();
	return /^(hi|hello|hey|thanks|thank you|yo|sup|howdy|what'?s up|how are you|ok|okay|cool|nice|wow)[!.?\s]*$/i.test(
		trimmed,
	);
}

export function matchRoute(message: string): SiteRoute | null {
	let bestLength = 0;
	const winners: SiteRoute[] = [];
	for (const route of siteRoutes) {
		let local = 0;
		for (const alias of route.aliases) {
			if (mentions(message, alias) && alias.length > local)
				local = alias.length;
		}
		if (local === 0) continue;
		if (local > bestLength) {
			bestLength = local;
			winners.length = 0;
			winners.push(route);
		} else if (local === bestLength) {
			winners.push(route);
		}
	}
	if (winners.length !== 1) return null;
	return winners[0] ?? null;
}

function parseFrontmatter(block: string): Record<string, string> {
	const fields: Record<string, string> = {};
	for (const line of block.split("\n")) {
		const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
		const key = match?.[1];
		const value = match?.[2];
		if (!key || value === undefined) continue;
		fields[key] = value.replace(/^["']|["']$/g, "").trim();
	}
	return fields;
}

function sectionFrom(
	fileId: string,
	title: string,
	inheritedRoute: string | undefined,
	body: string,
): MemorySection | null {
	const lines = body.replace(/^\n/, "").split("\n");
	let route = inheritedRoute;
	if (lines[0]?.startsWith("route:")) {
		route = lines[0].slice("route:".length).trim();
		lines.shift();
	}
	const text = lines.join("\n").trim();
	if (!title.trim() || !text) return null;
	const known = route ? routeByHref(route) : undefined;
	return {
		id: `${fileId}-${slug(title)}`,
		title: title.trim(),
		route: known?.href,
		body: text,
	};
}

export function parseMemoryMarkdown(raw: string): MemorySection[] {
	const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
	const fm = fmMatch?.[1] ? parseFrontmatter(fmMatch[1]) : {};
	const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;
	const fileId = fm.id ?? "memory";
	const chunks = body.split(/^## /m);
	const sections: MemorySection[] = [];
	const preamble = chunks[0] ?? "";
	const preambleSection = sectionFrom(
		fileId,
		fm.title ?? "Notes",
		fm.route,
		preamble,
	);
	if (preambleSection) sections.push(preambleSection);
	for (const chunk of chunks.slice(1)) {
		const newline = chunk.indexOf("\n");
		const title = (newline === -1 ? chunk : chunk.slice(0, newline)).trim();
		const rest = newline === -1 ? "" : chunk.slice(newline + 1);
		const section = sectionFrom(fileId, title, undefined, rest);
		if (section) sections.push(section);
	}
	return sections;
}

function hits(token: string, bag: Set<string>): boolean {
	if (bag.has(token)) return true;
	if (token.length < 3) return false;
	for (const item of bag) {
		if (item.startsWith(token) || (item.length >= 3 && token.startsWith(item)))
			return true;
	}
	return false;
}

function scoreSection(queryTokens: string[], section: MemorySection): number {
	const titleTokens = new Set(tokens(section.title));
	const bodyTokens = new Set(tokens(section.body));
	let score = 0;
	for (const token of queryTokens) {
		if (hits(token, titleTokens)) score += 4;
		else if (hits(token, bodyTokens)) score += 1;
	}
	return score;
}

export function selectMemory(
	sections: readonly MemorySection[],
	message: string,
	limit = 3,
	budget = 3800,
): MemorySection[] {
	if (isSmallTalk(message)) return [];
	const queryTokens = tokens(message);
	if (queryTokens.length === 0) return [];
	const ranked = sections
		.map((section) => ({ section, score: scoreSection(queryTokens, section) }))
		.filter((row) => row.score > 0)
		.sort((a, b) => b.score - a.score);
	const best = ranked[0];
	if (!best) return [];
	const picked: MemorySection[] = [];
	let chars = 0;
	for (const row of ranked) {
		if (picked.length >= limit) break;
		if (row.score < best.score && row.score < 2) continue;
		if (chars + row.section.body.length > budget && picked.length > 0) continue;
		picked.push(row.section);
		chars += row.section.body.length;
	}
	return picked;
}

export function extractNavigateHref(text: string): {
	text: string;
	href: string | null;
} {
	const pattern = /\[\[navigate:(\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?)\]\]/gi;
	let href: string | null = null;
	const stripped = text
		.replace(pattern, (_match, candidate: string) => {
			if (routeByHref(candidate)) href = candidate;
			return "";
		})
		.replace(/\n{3,}/g, "\n\n")
		.trim();
	return { text: stripped, href };
}
