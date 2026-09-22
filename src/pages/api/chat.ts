import type { APIRoute } from "astro";
import { z } from "astro/zod";
import type { ChatApiSuccess } from "../../lib/chatTypes";
import { buildSystemPrompt, resolveGuideTurn } from "../../lib/guideReply";
import {
	completeChat,
	currentInference,
	readInferenceEnv,
} from "../../lib/inference";
import { guideModelEnabled } from "../../lib/inferenceConfig";
import { loadMemorySections } from "../../lib/memory";
import { selectMemory } from "../../lib/memorySelect";

const historyItemSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.string().max(4000),
});

const chatRequestSchema = z.object({
	message: z.string().trim().min(1).max(2000),
	history: z.array(historyItemSchema).max(12).optional(),
	notesOnly: z.boolean().optional(),
});

function json(
	body: unknown,
	status: number,
	extraHeaders?: Record<string, string>,
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json", ...extraHeaders },
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

	const { message, notesOnly = false } = parsed.data;
	const history = (parsed.data.history ?? []).slice(-8);
	const sections = selectMemory(loadMemorySections(), message);
	const resolved = currentInference();
	const modelOff = !guideModelEnabled(readInferenceEnv());

	if (modelOff || notesOnly || resolved.kind === "unconfigured") {
		const payload: ChatApiSuccess = resolveGuideTurn({
			message,
			sections,
			modelText: null,
			notesReason:
				modelOff || resolved.kind === "unconfigured"
					? "unconfigured"
					: "unreachable",
		});
		return json(payload, 200);
	}

	const completion = await completeChat({
		resolved,
		temperature: sections.length > 0 ? 0.3 : 0.6,
		maxTokens: sections.length > 0 ? 700 : 320,
		messages: [
			{ role: "system", content: buildSystemPrompt(sections) },
			...history,
			{ role: "user", content: message },
		],
	});

	if (completion.kind === "cold") {
		return json({ error: "Model is waking up", retryable: true }, 503);
	}

	if (completion.kind === "down") {
		console.error("Chat model unavailable:", completion.detail);
		const payload = resolveGuideTurn({
			message,
			sections,
			modelText: null,
			notesReason: "unreachable",
		});
		return json(payload, 200);
	}

	const payload = resolveGuideTurn({
		message,
		sections,
		modelText: completion.content,
		notesReason: null,
	});
	return json(payload, 200);
};
