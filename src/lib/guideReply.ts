import type { ChatAction, ChatApiSuccess, ChatSource } from "./chatTypes";
import {
	extractNavigateHref,
	isNavigationIntent,
	isSmallTalk,
	type MemorySection,
	matchRoute,
	siteRoutes,
} from "./memorySelect";

const CONTACT = "andrei c stoica (at) icloud (dot) com";

function clip(body: string, max: number): string {
	const trimmed = body.trim();
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, max).trimEnd()}…`;
}

function sourcesFrom(sections: readonly MemorySection[]): ChatSource[] {
	const seen = new Set<string>();
	const sources: ChatSource[] = [];
	for (const section of sections) {
		const key = `${section.title}:${section.route ?? ""}`;
		if (seen.has(key)) continue;
		seen.add(key);
		sources.push(
			section.route
				? { title: section.title, href: section.route }
				: { title: section.title },
		);
	}
	return sources.slice(0, 4);
}

function decideAction(
	message: string,
	modelText: string | null,
): {
	action: ChatAction;
	modelText: string | null;
} {
	const extracted = modelText ? extractNavigateHref(modelText) : null;
	const fromModel = extracted?.href
		? siteRoutes.find((route) => route.href === extracted.href)
		: undefined;
	const lexical = matchRoute(message);
	const intent = isNavigationIntent(message);
	const route =
		intent && lexical && fromModel && lexical.href !== fromModel.href
			? lexical
			: (fromModel ?? lexical ?? undefined);
	const visible = extracted ? extracted.text : modelText;
	if (!route) return { action: { kind: "none" }, modelText: visible };
	return {
		action: {
			kind: "navigate",
			href: route.href,
			label: route.label,
			follow: intent,
		},
		modelText: visible,
	};
}

function notesText(
	message: string,
	sections: readonly MemorySection[],
	reason: "unconfigured" | "unreachable",
): string {
	if (isSmallTalk(message)) {
		return "Hey. Ask what I've been building, or say “show me Refract”.";
	}
	if (sections.length === 0) {
		const lead =
			reason === "unconfigured"
				? "The guide model isn't connected."
				: "The model is still waking or unreachable.";
		return `${lead} I don't have notes on that. Ask about a project, a job, canon, or fitness — or email ${CONTACT}.`;
	}
	const body = sections
		.map((section) => {
			const where =
				section.route && section.route !== "/" ? ` (${section.route})` : "";
			return `${section.title}${where}\n${clip(section.body, 700)}`;
		})
		.join("\n\n");
	return body;
}

export function buildSystemPrompt(sections: readonly MemorySection[]): string {
	const routeList = siteRoutes
		.map((route) => `${route.href} — ${route.label}`)
		.join("\n");
	const notes =
		sections.length === 0
			? "No notes matched this message. Say so. Do not invent facts about Andrei."
			: sections
					.map((section) => {
						const route = section.route ? `route: ${section.route}\n` : "";
						return `## ${section.title}\n${route}${section.body}`;
					})
					.join("\n\n");
	return `You are the guide on Andrei Stoica's site, andrei.bio. Speak as Andrei, in the first person: concise, direct, no filler.

Use only the notes below. If they do not cover the question, say you don't have that and point at a related page. Never invent relationships, employers, dates, or project details.

When the visitor wants to open a page on this site, end with exactly one line and nothing after it:
[[navigate:/exact-path]]
Only use a path from the site map. Skip that line for ordinary questions.

Site map:
${routeList}

Notes:
${notes}`;
}

export function resolveGuideTurn(args: {
	message: string;
	sections: readonly MemorySection[];
	modelText: string | null;
	notesReason: "unconfigured" | "unreachable" | null;
}): ChatApiSuccess {
	const decided = decideAction(args.message, args.modelText);
	if (decided.modelText !== null && args.notesReason === null) {
		const response =
			decided.modelText.trim() ||
			"I don't have a good answer for that from the notes.";
		return {
			response,
			sources: sourcesFrom(args.sections),
			action: decided.action,
			mode: "model",
		};
	}
	const reason = args.notesReason ?? "unreachable";
	return {
		response: notesText(args.message, args.sections, reason),
		sources: sourcesFrom(args.sections),
		action: decided.action,
		mode: "notes",
	};
}
