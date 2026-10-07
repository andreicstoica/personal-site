import type { UIMessage } from "ai";

export type ReadPostOutput = {
	title: string;
	url: string;
	date?: string;
	/** The post body. The model reads it; the panel does not show it. */
	text?: string;
};

export type PostHit = {
	slug: string;
	title: string;
	url: string;
	date?: string;
	/** The matched passage. The model reads it; the panel does not show it. */
	excerpt?: string;
};

export type SearchPostsOutput = { hits: PostHit[] };

/** The panel draws the controls; the route has nothing to return. */
export type SceneControlsOutput = { shown: true };

export type OpenPageOutput = {
	href: string;
	label: string;
	section?: { id: string; label: string };
};

/** Tool names and shapes, shared by the route (which runs them) and the
 *  panel (which renders them as steps). Only the route imports the tools. */
export type GuideUITools = {
	read_post: { input: { slug: string }; output: ReadPostOutput };
	search_posts: { input: { query: string }; output: SearchPostsOutput };
	open_page: {
		input: { path: string; section?: string };
		output: OpenPageOutput;
	};
	show_scene_controls: {
		input: Record<string, never>;
		output: SceneControlsOutput;
	};
};

/** What the route put in front of the model, for the reply's trace. */
export type ContextSummary = {
	notes: number;
	posts: number;
	/** Page sections the model can point at. */
	sections: number;
	/** The page label the visitor was on, when it is a known route. */
	page?: string;
};

export type GuideDataParts = {
	/** Why a notes answer stands in for the model, in the visitor's terms. */
	notice: { text: string };
	context: ContextSummary;
	/** A page the reply linked without calling open_page. The route sends it
	 *  so the guide still opens the page the reply points to. */
	page: OpenPageOutput;
	/** Scene controls for a banner question the model did not hand them to,
	 *  or that the notes answered. */
	scene: SceneControlsOutput;
	/** Posts whose passages the route put in the prompt, for the trace. */
	passages: { posts: ReadPostOutput[] };
	/** A post the reply cites from a passage, for its source card. */
	post: ReadPostOutput;
};

/** Sent once a model turn ends, for the last line of the trace. */
export type GuideMetadata = {
	model?: string;
	ms?: number;
	inputTokens?: number;
	/** Input tokens the provider served from its prompt cache. */
	cachedTokens?: number;
	outputTokens?: number;
};

export type GuideUIMessage = UIMessage<
	GuideMetadata,
	GuideDataParts,
	GuideUITools
>;
export type GuidePart = GuideUIMessage["parts"][number];

/** One prior turn as the route accepts it: text only. Tool outputs from the
 *  client are never replayed to the model. */
export type ChatTurn = { role: "user" | "assistant"; text: string };

export function turnText(message: GuideUIMessage): string {
	return message.parts
		.map((part) => (part.type === "text" ? part.text : ""))
		.join("")
		.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): value is string | undefined {
	return value === undefined || typeof value === "string";
}

function parseOpenPage(value: unknown): OpenPageOutput | null {
	if (!isRecord(value)) return null;
	if (typeof value.href !== "string" || typeof value.label !== "string")
		return null;
	const section = value.section;
	if (section === undefined) return { href: value.href, label: value.label };
	if (
		!isRecord(section) ||
		typeof section.id !== "string" ||
		typeof section.label !== "string"
	)
		return null;
	return {
		href: value.href,
		label: value.label,
		section: { id: section.id, label: section.label },
	};
}

function parsePostHit(value: unknown): PostHit | null {
	if (!isRecord(value)) return null;
	const { slug, title, url, date } = value;
	if (
		typeof slug !== "string" ||
		typeof title !== "string" ||
		typeof url !== "string" ||
		!optionalString(date)
	)
		return null;
	return { slug, title, url, ...(date ? { date } : {}) };
}

/** Restores one stored part, or drops it. Only finished tool calls survive:
 *  a call cut off by a reload has nothing left to show. Post bodies and
 *  search excerpts are dropped to keep storage small. */
function parsePart(value: unknown): GuidePart | null {
	if (!isRecord(value)) return null;
	if (value.type === "step-start") return { type: "step-start" };
	if (value.type === "text") {
		return typeof value.text === "string"
			? { type: "text", text: value.text, state: "done" }
			: null;
	}
	if (value.type === "reasoning") {
		return typeof value.text === "string"
			? { type: "reasoning", text: value.text, state: "done" }
			: null;
	}
	if (value.type === "data-context") {
		const data = value.data;
		if (!isRecord(data)) return null;
		const { notes, posts, sections, page } = data;
		if (
			typeof notes !== "number" ||
			typeof posts !== "number" ||
			typeof sections !== "number" ||
			!optionalString(page)
		)
			return null;
		return {
			type: "data-context",
			data: { notes, posts, sections, ...(page ? { page } : {}) },
		};
	}
	if (value.type === "data-page") {
		const page = parseOpenPage(value.data);
		return page && typeof value.id === "string"
			? { type: "data-page", id: value.id, data: page }
			: null;
	}
	if (value.type === "data-notice") {
		const data = value.data;
		return isRecord(data) && typeof data.text === "string"
			? { type: "data-notice", data: { text: data.text } }
			: null;
	}
	if (value.type === "data-passages") {
		const data = value.data;
		if (!isRecord(data) || !Array.isArray(data.posts)) return null;
		const posts: ReadPostOutput[] = [];
		for (const item of data.posts) {
			const post = parsePostRef(item);
			if (post) posts.push(post);
		}
		return { type: "data-passages", data: { posts } };
	}
	if (value.type === "data-post") {
		const post = parsePostRef(value.data);
		return post && typeof value.id === "string"
			? { type: "data-post", id: value.id, data: post }
			: null;
	}
	if (value.type === "data-scene") {
		return typeof value.id === "string"
			? { type: "data-scene", id: value.id, data: { shown: true } }
			: null;
	}
	if (value.state !== "output-available") return null;
	if (typeof value.toolCallId !== "string") return null;
	const toolCallId = value.toolCallId;
	const input = isRecord(value.input) ? value.input : {};
	const output = value.output;
	if (!isRecord(output)) return null;

	if (value.type === "tool-read_post") {
		if (typeof output.title !== "string" || typeof output.url !== "string")
			return null;
		if (!optionalString(output.date)) return null;
		return {
			type: "tool-read_post",
			toolCallId,
			state: "output-available",
			input: { slug: typeof input.slug === "string" ? input.slug : "" },
			output: {
				title: output.title,
				url: output.url,
				...(output.date ? { date: output.date } : {}),
			},
		};
	}
	if (value.type === "tool-search_posts") {
		if (!Array.isArray(output.hits)) return null;
		const hits: PostHit[] = [];
		for (const item of output.hits) {
			const hit = parsePostHit(item);
			if (!hit) return null;
			hits.push(hit);
		}
		return {
			type: "tool-search_posts",
			toolCallId,
			state: "output-available",
			input: { query: typeof input.query === "string" ? input.query : "" },
			output: { hits },
		};
	}
	if (value.type === "tool-show_scene_controls") {
		return {
			type: "tool-show_scene_controls",
			toolCallId,
			state: "output-available",
			input: {},
			output: { shown: true },
		};
	}
	if (value.type === "tool-open_page") {
		const parsed = parseOpenPage(output);
		if (!parsed) return null;
		return {
			type: "tool-open_page",
			toolCallId,
			state: "output-available",
			input: { path: parsed.href },
			output: parsed,
		};
	}
	return null;
}

/** A post's title, URL, and date; never its body. */
function parsePostRef(value: unknown): ReadPostOutput | null {
	if (!isRecord(value)) return null;
	if (typeof value.title !== "string" || typeof value.url !== "string")
		return null;
	if (!optionalString(value.date)) return null;
	return {
		title: value.title,
		url: value.url,
		...(value.date ? { date: value.date } : {}),
	};
}

function parseMetadata(value: unknown): GuideMetadata | null {
	if (!isRecord(value)) return null;
	const metadata: GuideMetadata = {};
	if (typeof value.model === "string") metadata.model = value.model;
	for (const key of [
		"ms",
		"inputTokens",
		"cachedTokens",
		"outputTokens",
	] as const) {
		const field = value[key];
		if (typeof field === "number" && Number.isFinite(field))
			metadata[key] = field;
	}
	return metadata;
}

/** Validates a thread from sessionStorage. Unknown parts are dropped; a
 *  malformed message drops the whole thread. */
export function parseStoredMessages(value: unknown): GuideUIMessage[] | null {
	if (!Array.isArray(value)) return null;
	const messages: GuideUIMessage[] = [];
	for (const item of value) {
		if (!isRecord(item) || typeof item.id !== "string") return null;
		if (item.role !== "user" && item.role !== "assistant") return null;
		if (!Array.isArray(item.parts)) return null;
		const parts: GuidePart[] = [];
		for (const part of item.parts) {
			const parsed = parsePart(part);
			if (parsed) parts.push(parsed);
		}
		const metadata = parseMetadata(item.metadata);
		messages.push({
			id: item.id,
			role: item.role,
			parts,
			...(metadata ? { metadata } : {}),
		});
	}
	return messages;
}
