import type { APIRoute } from "astro";
import {
	completeChat,
	currentInference,
	readInferenceEnv,
} from "../../lib/inference";
import { guideModelEnabled } from "../../lib/inferenceConfig";

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const resolved = currentInference();
	if (!guideModelEnabled(readInferenceEnv())) {
		return json(
			{
				status: "off",
				provider: "notes",
				live: false,
				message: "Guide model calls are off",
			},
			200,
		);
	}

	if (resolved.kind === "unconfigured") {
		return json(
			{
				status: "unconfigured",
				provider: resolved.provider,
				message: resolved.reason,
			},
			503,
		);
	}

	// A live generation wakes a scale-to-zero GPU. Default is config-only.
	if (url.searchParams.get("probe") !== "1") {
		return json(
			{ status: "ok", provider: resolved.provider, live: false },
			200,
		);
	}

	const completion = await completeChat({
		resolved,
		temperature: 0,
		maxTokens: 1,
		messages: [{ role: "user", content: "hi" }],
	});

	if (completion.kind === "ok") {
		return json({ status: "ok", provider: resolved.provider, live: true }, 200);
	}

	return json(
		{
			status: completion.kind,
			provider: resolved.provider,
			live: false,
		},
		503,
	);
};
