export type ChatRole = "user" | "assistant";

export type ChatMode = "model" | "notes";

export type ChatAction =
	| { kind: "none" }
	| { kind: "navigate"; href: string; label: string; follow: boolean };

export type ChatSource = {
	title: string;
	href?: string;
};

export type ChatApiSuccess = {
	response: string;
	sources: ChatSource[];
	action: ChatAction;
	mode: ChatMode;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSource(value: unknown): ChatSource | null {
	if (!isRecord(value) || typeof value.title !== "string") return null;
	if (value.href === undefined) return { title: value.title };
	if (typeof value.href !== "string") return null;
	return { title: value.title, href: value.href };
}

function parseAction(value: unknown): ChatAction | null {
	if (!isRecord(value)) return null;
	if (value.kind === "none") return { kind: "none" };
	if (value.kind !== "navigate") return null;
	if (typeof value.href !== "string" || typeof value.label !== "string")
		return null;
	if (typeof value.follow !== "boolean") return null;
	return {
		kind: "navigate",
		href: value.href,
		label: value.label,
		follow: value.follow,
	};
}

export function parseChatApiSuccess(value: unknown): ChatApiSuccess | null {
	if (!isRecord(value) || typeof value.response !== "string") return null;
	if (value.mode !== "model" && value.mode !== "notes") return null;
	const action = parseAction(value.action);
	if (!action) return null;
	if (!Array.isArray(value.sources)) return null;
	const sources: ChatSource[] = [];
	for (const source of value.sources) {
		const parsed = parseSource(source);
		if (!parsed) return null;
		sources.push(parsed);
	}
	return { response: value.response, sources, action, mode: value.mode };
}

export function isColdStart(value: unknown): boolean {
	return isRecord(value) && value.retryable === true;
}
