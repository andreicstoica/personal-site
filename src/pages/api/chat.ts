import type { APIRoute } from "astro";
import { z } from "astro/zod";
import type { ChatApiSuccess, ChatEvent } from "../../lib/chatTypes";
import {
	buildSystemPrompt,
	resolveGuideTurn,
	sourcesFrom,
} from "../../lib/guideReply";
import {
	completeChat,
	currentInference,
	readInferenceEnv,
} from "../../lib/inference";
import { guideModelEnabled } from "../../lib/inferenceConfig";
import { loadMemorySections } from "../../lib/memory";
import {
	type MemorySection,
	routeByHref,
	type SiteRoute,
	selectMemory,
} from "../../lib/memorySelect";

const historyItemSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.string().max(4000),
});

const chatRequestSchema = z.object({
	message: z.string().trim().min(1).max(2000),
	history: z.array(historyItemSchema).max(12).optional(),
	/** The path the visitor is on. Only a known site route is used. */
	page: z.string().max(200).optional(),
});

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return json({ error: "Invalid JSON body" }, 400);
	}

	const parsed = chatRequestSchema.safeParse(raw);
	if (!parsed.success) return json({ error: "Invalid chat request" }, 400);

	const { message } = parsed.data;
	const history = (parsed.data.history ?? []).slice(-8);
	const viewing = parsed.data.page ? routeByHref(parsed.data.page) : undefined;
	const sections = withPageNotes(
		selectMemory(loadMemorySections(), message),
		viewing,
	);

	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const emit = (event: ChatEvent) =>
				controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
			try {
				emit({ type: "searched", sources: sourcesFrom(sections) });
				emit({
					type: "reply",
					reply: await answer({ message, history, sections, viewing }, emit),
				});
			} finally {
				controller.close();
			}
		},
	});
	return new Response(stream, {
		headers: {
			"Content-Type": "application/x-ndjson",
			"Cache-Control": "no-store",
		},
	});
};

/** "What is this page?" names no topic, so the page's own note joins the
 *  match whenever the visitor is on a known route. */
function withPageNotes(
	picked: MemorySection[],
	viewing: SiteRoute | undefined,
): MemorySection[] {
	if (!viewing) return picked;
	const pageNote = loadMemorySections().find(
		(section) =>
			section.route === viewing.href &&
			!picked.some((item) => item.title === section.title),
	);
	return pageNote ? [...picked, pageNote] : picked;
}

async function answer(
	turn: {
		message: string;
		history: Array<{ role: "user" | "assistant"; content: string }>;
		sections: MemorySection[];
		viewing: SiteRoute | undefined;
	},
	emit: (event: ChatEvent) => void,
): Promise<ChatApiSuccess> {
	const { message, history, sections, viewing } = turn;
	const resolved = currentInference();
	const modelOff = !guideModelEnabled(readInferenceEnv());

	if (modelOff || resolved.kind === "unconfigured") {
		return resolveGuideTurn({
			message,
			sections,
			modelText: null,
			notesReason: "unconfigured",
		});
	}

	emit({ type: "writing" });
	const completion = await completeChat({
		resolved,
		temperature: sections.length > 0 ? 0.3 : 0.6,
		maxTokens: sections.length > 0 ? 700 : 320,
		messages: [
			{ role: "system", content: buildSystemPrompt(sections, viewing) },
			...history,
			{ role: "user", content: message },
		],
	});

	if (completion.kind === "down") {
		console.error(
			`Chat model unavailable (${completion.outage}):`,
			completion.detail,
		);
		return resolveGuideTurn({
			message,
			sections,
			modelText: null,
			notesReason: completion.outage,
		});
	}

	return resolveGuideTurn({
		message,
		sections,
		modelText: completion.content,
		notesReason: null,
	});
}
