import { generateText } from "ai";
import type { APIRoute } from "astro";
import {
	GUIDE_REASONING,
	guideModel,
	guideModelId,
	outageOf,
} from "../../lib/guideModel";

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const model = guideModelId();
	if (!model) {
		return json(
			{
				status: "off",
				live: false,
				message: "MODEL_ID is not set, so the guide answers from notes",
			},
			200,
		);
	}

	// A live generation costs tokens. Default is config-only.
	if (url.searchParams.get("probe") !== "1") {
		return json({ status: "ok", model, live: false }, 200);
	}

	// Reasoning models spend the first tokens thinking; 1 token returns no text.
	try {
		const { text } = await generateText({
			model: guideModel(model),
			prompt: "hi",
			reasoning: GUIDE_REASONING,
			maxOutputTokens: 64,
			maxRetries: 0,
			abortSignal: AbortSignal.timeout(20_000),
		});
		return json({ status: "ok", model, live: text.length > 0 }, 200);
	} catch (error) {
		return json(
			{ status: "down", outage: outageOf(error), model, live: false },
			503,
		);
	}
};
