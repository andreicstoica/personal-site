import { z } from "astro/zod";
import {
	authHeaders,
	type InferenceEnv,
	type ResolvedInference,
	resolveInference,
} from "./inferenceConfig";

const completionSchema = z.object({
	choices: z
		.array(
			z.object({
				message: z.object({
					content: z.string().nullable(),
				}),
			}),
		)
		.min(1),
});

/** Why a model call failed, as far as the visitor needs to know. */
export type Outage = "budget" | "busy" | "error";

export type Completion =
	| { kind: "ok"; content: string }
	| { kind: "down"; outage: Outage; detail: string };

export function outageFor(status: number): Outage {
	// 402: spend cap or credit exhausted. 429: rate limit, retry later.
	if (status === 402) return "budget";
	if (status === 429) return "busy";
	return "error";
}

function envValue(name: keyof InferenceEnv): string | undefined {
	if (typeof process !== "undefined") {
		const fromProcess = process.env[name];
		if (typeof fromProcess === "string" && fromProcess.trim())
			return fromProcess;
	}
	const meta: unknown = import.meta.env;
	if (typeof meta !== "object" || meta === null || !(name in meta))
		return undefined;
	const value = Reflect.get(meta, name);
	return typeof value === "string" ? value : undefined;
}

export function readInferenceEnv(): InferenceEnv {
	return {
		MODEL_PROVIDER: envValue("MODEL_PROVIDER"),
		GUIDE_MODEL: envValue("GUIDE_MODEL"),
		LOCAL_MODEL_URL: envValue("LOCAL_MODEL_URL"),
		LOCAL_MODEL_ID: envValue("LOCAL_MODEL_ID"),
		MODEL_BASE_URL: envValue("MODEL_BASE_URL"),
		MODEL_API_KEY: envValue("MODEL_API_KEY"),
		MODEL_ID: envValue("MODEL_ID"),
	};
}

export function currentInference(): ResolvedInference {
	return resolveInference(readInferenceEnv());
}

export async function completeChat(args: {
	resolved: Extract<ResolvedInference, { kind: "ready" }>;
	messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
	temperature: number;
	maxTokens: number;
}): Promise<Completion> {
	const url = `${args.resolved.baseUrl}/chat/completions`;
	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...authHeaders(args.resolved.auth),
			},
			body: JSON.stringify({
				model: args.resolved.model,
				messages: args.messages,
				temperature: args.temperature,
				max_tokens: args.maxTokens,
			}),
			signal: AbortSignal.timeout(20_000),
		});
		if (!response.ok) {
			return {
				kind: "down",
				outage: outageFor(response.status),
				detail: `Model API HTTP ${response.status}`,
			};
		}
		const parsed = completionSchema.safeParse(await response.json());
		if (!parsed.success)
			return {
				kind: "down",
				outage: "error",
				detail: "Unexpected model payload",
			};
		const content = parsed.data.choices[0]?.message.content;
		if (!content)
			return { kind: "down", outage: "error", detail: "Empty model response" };
		return { kind: "ok", content };
	} catch (error) {
		const detail =
			error instanceof Error ? error.message : "Model request failed";
		return { kind: "down", outage: "error", detail };
	}
}
