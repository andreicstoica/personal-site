import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, type LanguageModel } from "ai";
import { type Outage, outageFor } from "./inference";
import type { ResolvedInference } from "./inferenceConfig";

export function guideModel(
	resolved: Extract<ResolvedInference, { kind: "ready" }>,
): LanguageModel {
	const provider = createOpenAICompatible({
		name: resolved.provider,
		baseURL: resolved.baseUrl,
		...(resolved.auth.kind === "bearer" ? { apiKey: resolved.auth.token } : {}),
	});
	return provider.chatModel(resolved.model);
}

/** Maps a failed model call to what the visitor is told. */
export function outageOf(error: unknown): Outage {
	if (APICallError.isInstance(error) && error.statusCode !== undefined)
		return outageFor(error.statusCode);
	if (
		typeof error === "object" &&
		error !== null &&
		"statusCode" in error &&
		typeof error.statusCode === "number"
	)
		return outageFor(error.statusCode);
	return "error";
}
