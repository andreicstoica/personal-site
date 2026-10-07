import { APICallError, gateway, type LanguageModel } from "ai";

/** Why a model call failed, as far as the visitor needs to know. */
export type Outage = "budget" | "busy" | "error";

export function outageFor(status: number): Outage {
	// 402: spend cap or credit exhausted. 429: rate limit, retry later.
	if (status === 402) return "budget";
	if (status === 429) return "busy";
	return "error";
}

/** The guide's one setting: the AI Gateway model it calls, such as
 *  openai/gpt-oss-120b. Unset, the guide answers from its notes. The
 *  gateway signs in with the deployment's Vercel OIDC token, or locally with
 *  the one `vercel env pull` writes to .env.local; AI_GATEWAY_API_KEY, when
 *  set, takes precedence. */
export function guideModelId(): string | undefined {
	const fromProcess =
		typeof process !== "undefined" ? process.env.MODEL_ID : undefined;
	const value = fromProcess ?? import.meta.env.MODEL_ID;
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** The free tier routes each call to whichever host serves the model; the
 *  guide does not pin one. */
export function guideModel(id: string): LanguageModel {
	return gateway(id);
}

/** The answers are short lookups over notes already in the prompt. Low
 *  reasoning effort keeps the trace's reasoning to a few lines and cuts
 *  seconds from each turn; the gateway maps it for whichever host serves. */
export const GUIDE_REASONING = "low";

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
