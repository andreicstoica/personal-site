// Parses one /api/chat stream and scores it against a case from
// specs/guide-eval.json. Pure, so the runner stays a thin loop over cases.

export type EvalCase = {
	id: string;
	kind: string;
	q: string;
	turns?: { role: "user" | "assistant"; text: string }[];
	/** What the visitor's banner shows, sent with the question. */
	bannerScene?: { place: string; weather: string; time: string };
	/** Every group must appear in the reply; a group is a list of alternatives. */
	facts?: string[][];
	/** The page the reply should open or point to. */
	page?: string;
	/** Whether the reply should carry the banner's scene controls; false
	 *  when left out. */
	scene?: boolean;
	noTools?: string[];
};

export type Turn = {
	text: string;
	tools: string[];
	/** Pages opened by open_page or pointed to by the route's fallback. */
	pages: string[];
	scene: boolean;
	/** Posts whose passages the route added to the prompt. */
	passages?: string[];
	notice?: string;
	model?: string;
	ms?: number;
	inputTokens?: number;
	cachedTokens?: number;
	outputTokens?: number;
};

export function parseStream(body: string): Turn {
	const turn: Turn = { text: "", tools: [], pages: [], scene: false };
	for (const line of body.split("\n")) {
		if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
		let chunk: Record<string, unknown>;
		try {
			chunk = JSON.parse(line.slice(6));
		} catch {
			continue;
		}
		const data = chunk.data as Record<string, unknown> | undefined;
		const output = chunk.output as Record<string, unknown> | undefined;
		switch (chunk.type) {
			case "text-delta":
				turn.text += String(chunk.delta ?? "");
				break;
			case "tool-input-available":
				turn.tools.push(String(chunk.toolName));
				break;
			case "tool-output-available":
				if (typeof output?.href === "string") turn.pages.push(output.href);
				break;
			case "data-page":
				if (typeof data?.href === "string") turn.pages.push(data.href);
				break;
			case "data-scene":
				turn.scene = true;
				break;
			case "data-passages":
				turn.passages = Array.isArray(data?.posts)
					? data.posts.map((post: { title?: string }) => String(post.title))
					: [];
				break;
			case "data-notice":
				turn.notice = String(data?.text ?? "");
				break;
			case "message-metadata":
				Object.assign(turn, chunk.messageMetadata);
				break;
		}
	}
	if (turn.tools.includes("show_scene_controls")) turn.scene = true;
	turn.text = turn.text.trim();
	return turn;
}

// Post titles in his own words are quoted, not spoken.
const QUOTED_TITLES = /Why I.m Quitting[^.]*/gi;
const FIRST_PERSON = /\b(I|I'm|I've|I'd|me|my|mine|we|our)\b/;
// gpt-oss channel text that a host failed to parse, such as "post.analysisWe".
const LEAK = /assistantfinal|\banalysis(?=[A-Z])/;
const URL_OR_PATH = /https?:\/\/|(?:^|\s)\/[a-z]+(?:\/|\b)/;

/** gpt-oss sets non-breaking spaces and hyphens and curly quotes, so facts
 *  are matched on plain text. */
export function plain(text: string): string {
	return text
		.replace(/[\u00a0\u2007\u2009\u202f]/g, " ")
		.replace(/[\u2010\u2011\u2012\u2013]/g, "-")
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201c\u201d]/g, '"');
}

export type Score = { pass: boolean; failures: string[] };

export function scoreTurn(test: EvalCase, turn: Turn): Score {
	const failures: string[] = [];
	if (turn.notice) failures.push(`fell back to notes: ${turn.notice}`);
	if (!turn.text) failures.push("empty reply");
	const text = plain(turn.text);
	const lower = text.toLowerCase();
	for (const group of test.facts ?? []) {
		if (!group.some((fact) => lower.includes(fact.toLowerCase())))
			failures.push(`missing ${group.join(" | ")}`);
	}
	if (test.page && !turn.pages.includes(test.page))
		failures.push(`no page ${test.page}`);
	// Controls belong only under a banner reply, so every other case checks
	// that the model did not hand them out.
	const wantScene = test.scene ?? false;
	if (turn.scene !== wantScene)
		failures.push(wantScene ? "no scene controls" : "unwanted scene controls");
	for (const tool of test.noTools ?? []) {
		if (turn.tools.includes(tool)) failures.push(`called ${tool}`);
	}
	if (FIRST_PERSON.test(text.replace(QUOTED_TITLES, "")))
		failures.push("first person");
	if (LEAK.test(text)) failures.push("leaked reasoning");
	if (URL_OR_PATH.test(text)) failures.push("printed a URL or path");
	return { pass: failures.length === 0, failures };
}
