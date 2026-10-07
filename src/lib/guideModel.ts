import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, createGateway, type LanguageModel } from "ai";
import { type Outage, outageFor } from "./inference";
import type { ResolvedInference } from "./inferenceConfig";

type Ready = Extract<ResolvedInference, { kind: "ready" }>;

/** The AI Gateway gets its own provider rather than its OpenAI-compatible
 *  endpoint: it routes gpt-oss across several hosts, reports which one
 *  served a call. The free tier routes each call to whichever host is
 *  available; the guide does not pin one. */
function onGateway(resolved: Ready): boolean {
	try {
		return new URL(resolved.baseUrl).hostname === "ai-gateway.vercel.sh";
	} catch {
		return false;
	}
}

export function guideModel(resolved: Ready): LanguageModel {
	if (onGateway(resolved) && resolved.auth.kind === "bearer")
		return createGateway({ apiKey: resolved.auth.token })(resolved.model);
	const provider = createOpenAICompatible({
		name: resolved.provider,
		baseURL: resolved.baseUrl,
		...(resolved.auth.kind === "bearer" ? { apiKey: resolved.auth.token } : {}),
	});
	return provider.chatModel(resolved.model);
}

/** The answers are short lookups over notes already in the prompt. Low
 *  reasoning effort keeps the trace's reasoning to a few lines and cuts
 *  seconds from each turn; hosts that ignore it are fine. */
type CallOptions = {
	reasoning?: "low";
	providerOptions?: Record<string, Record<string, string>>;
};

/** The gateway maps the shared effort for whichever host it routes to. */
export function guideCallOptions(resolved: Ready): CallOptions {
	return onGateway(resolved)
		? { reasoning: "low" }
		: { providerOptions: { openaiCompatible: { reasoningEffort: "low" } } };
}

/** The host that served a gateway call, from its routing metadata. */
export function servedBy(metadata: unknown): string | undefined {
	if (typeof metadata !== "object" || metadata === null) return undefined;
	const routing = (
		metadata as { gateway?: { routing?: Record<string, unknown> } }
	).gateway?.routing;
	const host = routing?.finalProvider ?? routing?.resolvedProvider;
	return typeof host === "string" ? host : undefined;
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
