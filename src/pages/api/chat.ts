import {
	createUIMessageStream,
	createUIMessageStreamResponse,
	isStepCount,
	type StopCondition,
	streamText,
	toUIMessageStream,
	type UIMessageStreamWriter,
} from "ai";
import type { APIRoute } from "astro";
import { z } from "astro/zod";
import type { ChatTurn, GuideUIMessage } from "../../lib/chatTypes";
import {
	guideNotes,
	guidePosts,
	guideSearch,
	pageSections,
} from "../../lib/guideContent";
import { guideModel, outageOf } from "../../lib/guideModel";
import {
	buildSystemPrompt,
	notesOpenPage,
	notesText,
	OUTAGE_NOTICE,
} from "../../lib/guideReply";
import { guideTools } from "../../lib/guideTools";
import {
	currentInference,
	type Outage,
	readInferenceEnv,
} from "../../lib/inference";
import { guideModelEnabled } from "../../lib/inferenceConfig";
import { isSmallTalk, routeByHref } from "../../lib/memorySelect";

const turnSchema = z.object({
	role: z.enum(["user", "assistant"]),
	text: z.string().max(4000),
});

const chatRequestSchema = z.object({
	messages: z.array(turnSchema).min(1).max(12),
	/** The path the visitor is on. Only a known site route is used. */
	page: z.string().max(200).optional(),
});

type Writer = UIMessageStreamWriter<GuideUIMessage>;

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
	const turns = parsed.data.messages.filter((turn) => turn.text.trim());
	const last = turns.at(-1);
	if (!last || last.role !== "user" || last.text.trim().length > 2000)
		return json({ error: "Invalid chat request" }, 400);

	const viewing = parsed.data.page ? routeByHref(parsed.data.page) : undefined;
	const message = last.text.trim();

	const stream = createUIMessageStream<GuideUIMessage>({
		execute: async ({ writer }) => {
			writer.write({ type: "start" });
			const resolved = currentInference();
			if (
				!guideModelEnabled(readInferenceEnv()) ||
				resolved.kind === "unconfigured"
			) {
				writeNotesTurn(writer, message);
			} else {
				await streamModelTurn(writer, {
					model: guideModel(resolved),
					system: buildSystemPrompt({
						notes: guideNotes(),
						posts: guidePosts(),
						sectionsByPath: pageSections,
						viewing,
					}),
					turns: turns.slice(-8),
					message,
					signal: request.signal,
				});
			}
			writer.write({ type: "finish" });
		},
		onError: () => "The guide couldn't answer.",
	});
	return createUIMessageStreamResponse({ stream });
};

type GuideTools = ReturnType<typeof guideTools>;

/** open_page is the last thing a turn does. Once it is called and a reply
 *  exists, another model step would only echo the tool result. */
const openedAfterReply: StopCondition<GuideTools> = ({ steps }) =>
	steps.at(-1)?.toolCalls.some((call) => call.toolName === "open_page") ===
		true && steps.some((step) => step.text.trim().length > 0);

async function streamModelTurn(
	writer: Writer,
	turn: {
		model: ReturnType<typeof guideModel>;
		system: string;
		turns: ChatTurn[];
		message: string;
		signal: AbortSignal;
	},
): Promise<void> {
	let outage: Outage | null = null;
	const result = streamText({
		model: turn.model,
		system: turn.system,
		messages: turn.turns.map((item) => ({
			role: item.role,
			content: item.text,
		})),
		tools: guideTools(),
		stopWhen: [isStepCount(3), openedAfterReply],
		temperature: 0.3,
		maxOutputTokens: 1000,
		// A retry on 402 or 429 only delays the notes answer.
		maxRetries: 0,
		abortSignal: AbortSignal.any([turn.signal, AbortSignal.timeout(30_000)]),
		onError: ({ error }) => {
			outage = outageOf(error);
			console.error(`Chat model unavailable (${outage}):`, error);
		},
	});

	let wroteText = false;
	const reader = toUIMessageStream<GuideTools, GuideUIMessage>({
		stream: result.stream,
		sendStart: false,
		sendFinish: false,
		// Reasoning can quote the system prompt; the panel never shows it.
		sendReasoning: false,
		onError: () => "",
	}).getReader();
	for (;;) {
		const { done, value: chunk } = await reader.read();
		if (done) break;
		if (chunk.type === "error") {
			outage ??= "error";
			continue;
		}
		if (chunk.type === "text-delta" && chunk.delta.trim()) wroteText = true;
		writer.write(chunk);
	}

	if (outage) {
		if (!wroteText) writeNotesTurn(writer, turn.message);
		writer.write({
			type: "data-notice",
			data: { text: OUTAGE_NOTICE[outage] },
		});
	} else if (!wroteText) {
		writeText(writer, "I don't have a good answer for that from my notes.");
	}
}

function writeText(writer: Writer, text: string): void {
	const id = crypto.randomUUID();
	writer.write({ type: "text-start", id });
	writer.write({ type: "text-delta", id, delta: text });
	writer.write({ type: "text-end", id });
}

/** The answer without a model: a sentence from the best keyword match,
 *  and a page only when the visitor asked to open one. */
function writeNotesTurn(writer: Writer, message: string): void {
	const results = isSmallTalk(message) ? [] : guideSearch().search(message, 3);
	writeText(writer, notesText(message, results));
	const opened = notesOpenPage(message);
	if (!opened) return;
	const toolCallId = `notes-${crypto.randomUUID()}`;
	writer.write({
		type: "tool-input-available",
		toolCallId,
		toolName: "open_page",
		input: { path: opened.href },
	});
	writer.write({ type: "tool-output-available", toolCallId, output: opened });
}
