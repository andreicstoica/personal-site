import {
	createUIMessageStream,
	createUIMessageStreamResponse,
	isStepCount,
	type LanguageModelUsage,
	type StopCondition,
	streamText,
	toUIMessageStream,
	type UIMessageStreamWriter,
} from "ai";
import type { APIRoute } from "astro";
import { z } from "astro/zod";
import type {
	ChatTurn,
	GuideMetadata,
	GuideUIMessage,
} from "../../lib/chatTypes";
import {
	guideNotes,
	guidePassages,
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
import type { SearchHit } from "../../lib/guideSearch";
import { guideTools } from "../../lib/guideTools";
import {
	currentInference,
	type Outage,
	readInferenceEnv,
} from "../../lib/inference";
import { guideModelEnabled } from "../../lib/inferenceConfig";
import {
	isBannerQuestion,
	isSmallTalk,
	routeByHref,
} from "../../lib/memorySelect";
import { linkedPage, namedPage } from "../../lib/siteSections";
import { PLACES, TIMES, WEATHERS } from "../../lib/weather/scene";

const turnSchema = z.object({
	role: z.enum(["user", "assistant"]),
	text: z.string().max(4000),
});

const chatRequestSchema = z.object({
	messages: z.array(turnSchema).min(1).max(12),
	/** The path the visitor is on. Only a known site route is used. */
	page: z.string().max(200).optional(),
	/** What the visitor's banner shows, so the guide can name it. */
	scene: z
		.object({
			place: z.enum(PLACES),
			weather: z.enum(WEATHERS),
			time: z.enum(TIMES),
		})
		.optional(),
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
				const notes = guideNotes();
				const posts = guidePosts();
				const passages = guidePassages(message);
				writer.write({
					type: "data-context",
					data: {
						notes: notes.length,
						posts: posts.length,
						sections: Object.values(pageSections).flat().length,
						...(viewing ? { page: viewing.label } : {}),
					},
				});
				if (passages.length > 0)
					writer.write({
						type: "data-passages",
						data: { posts: passages.map(postRef) },
					});
				await streamModelTurn(writer, {
					model: guideModel(resolved),
					modelId: resolved.model,
					viewing: viewing?.href,
					system: buildSystemPrompt({
						notes,
						posts,
						sectionsByPath: pageSections,
						viewing,
						scene: parsed.data.scene,
						passages,
					}),
					passages,
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

/** A greeting needs no tool, and gpt-oss called one anyway. Every other
 *  turn gets every tool and the model chooses. */
function activeToolsFor(message: string): Array<keyof GuideTools> | undefined {
	return isSmallTalk(message) ? [] : undefined;
}

/** open_page is the last thing a turn does. Once it is called and a reply
 *  exists, another model step would only echo the tool result. */
const openedAfterReply: StopCondition<GuideTools> = ({ steps }) =>
	steps.at(-1)?.toolCalls.some((call) => call.toolName === "open_page") ===
		true && steps.some((step) => step.text.trim().length > 0);

async function streamModelTurn(
	writer: Writer,
	turn: {
		model: ReturnType<typeof guideModel>;
		modelId: string;
		/** The path the visitor is on, when it is a known route. */
		viewing: string | undefined;
		system: string;
		/** Post passages in the prompt, for the cards of the ones it cites. */
		passages: readonly SearchHit[];
		turns: ChatTurn[];
		message: string;
		signal: AbortSignal;
	},
): Promise<void> {
	let outage: Outage | null = null;
	const started = performance.now();
	const result = streamText({
		model: turn.model,
		system: turn.system,
		messages: turn.turns.map((item) => ({
			role: item.role,
			content: item.text,
		})),
		tools: guideTools(),
		activeTools: activeToolsFor(turn.message),
		// Read, hand out scene controls, open a page, reply: the longest turn.
		stopWhen: [isStepCount(4), openedAfterReply],
		temperature: 0.3,
		maxOutputTokens: 1000,
		// The answers are short lookups over notes already in the prompt. Low
		// effort keeps the reasoning (shown in the trace) to a few lines and
		// cuts seconds from each turn; hosts that ignore the field are fine.
		providerOptions: { openaiCompatible: { reasoningEffort: "low" } },
		// A retry on 402 or 429 only delays the notes answer.
		maxRetries: 0,
		abortSignal: AbortSignal.any([turn.signal, AbortSignal.timeout(30_000)]),
		onError: ({ error }) => {
			outage = outageOf(error);
			console.error(`Chat model unavailable (${outage}):`, error);
		},
	});

	let wroteText = false;
	let text = "";
	let pageCalled = false;
	let sceneCalled = false;
	const reader = toUIMessageStream<GuideTools, GuideUIMessage>({
		stream: result.stream,
		sendStart: false,
		sendFinish: false,
		// Reasoning shows in the reply's trace. The prompt holds only public
		// notes, so a quote from it reveals nothing private.
		sendReasoning: true,
		onError: () => "",
	}).getReader();
	for (;;) {
		const { done, value: chunk } = await reader.read();
		if (done) break;
		if (chunk.type === "error") {
			outage ??= "error";
			continue;
		}
		if (chunk.type === "text-delta") {
			text += chunk.delta;
			if (chunk.delta.trim()) wroteText = true;
		}
		if (chunk.type === "tool-input-available" && chunk.toolName === "open_page")
			pageCalled = true;
		if (
			chunk.type === "tool-input-available" &&
			chunk.toolName === "show_scene_controls"
		)
			sceneCalled = true;
		writer.write(chunk);
	}

	// The model names the page it points to, but does not always call
	// open_page for it. Its pointer line (or a link) still opens the page;
	// the trace marks it "Pointed to", not as a tool call.
	const linked =
		!outage && !pageCalled
			? (linkedPage(text, pageSections) ?? namedPage(text))
			: null;
	if (linked && (linked.href !== turn.viewing || linked.section)) {
		writer.write({
			type: "data-page",
			id: `page-${crypto.randomUUID()}`,
			data: linked,
		});
	}

	if (!outage && !sceneCalled && isBannerQuestion(turn.message))
		writeScene(writer);

	// A reply that answers from a passage names its post but never calls
	// read_post, so the route adds the post's card.
	if (!outage) {
		const cited = text.toLowerCase();
		for (const passage of turn.passages) {
			if (!cited.includes(passage.title.toLowerCase())) continue;
			writer.write({
				type: "data-post",
				id: `post-${crypto.randomUUID()}`,
				data: postRef(passage),
			});
		}
	}

	if (!outage) {
		writer.write({
			type: "message-metadata",
			messageMetadata: await turnMetadata(result, {
				model: turn.modelId,
				ms: Math.round(performance.now() - started),
			}),
		});
	}

	if (outage) {
		if (!wroteText) writeNotesTurn(writer, turn.message);
		writer.write({
			type: "data-notice",
			data: { text: OUTAGE_NOTICE[outage] },
		});
	} else if (!wroteText) {
		writeText(writer, "Andrei's notes don't have a good answer for that.");
	}
}

/** The model and token counts for the trace. Usage is best effort: a
 *  provider that reports none leaves those fields out. */
async function turnMetadata(
	result: { totalUsage: PromiseLike<LanguageModelUsage> },
	base: { model: string; ms: number },
): Promise<GuideMetadata> {
	const model = base.model.replace(/^[^/]+\//, "");
	try {
		const usage = await result.totalUsage;
		const cached = usage.inputTokenDetails.cacheReadTokens;
		return {
			model,
			ms: base.ms,
			...(usage.inputTokens ? { inputTokens: usage.inputTokens } : {}),
			...(cached ? { cachedTokens: cached } : {}),
			...(usage.outputTokens ? { outputTokens: usage.outputTokens } : {}),
		};
	} catch {
		return { model, ms: base.ms };
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
/** A post's title, URL, and date for a card; the passage text stays out. */
function postRef(hit: SearchHit): {
	title: string;
	url: string;
	date?: string;
} {
	return {
		title: hit.title,
		url: hit.url ?? "",
		...(hit.date ? { date: hit.date } : {}),
	};
}

/** The banner's scene controls, for a reply the model did not give them to. */
function writeScene(writer: Writer): void {
	writer.write({
		type: "data-scene",
		id: `scene-${crypto.randomUUID()}`,
		data: { shown: true },
	});
}

function writeNotesTurn(writer: Writer, message: string): void {
	const results = isSmallTalk(message) ? [] : guideSearch().search(message, 3);
	writeText(writer, notesText(message, results));
	if (isBannerQuestion(message)) writeScene(writer);
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
