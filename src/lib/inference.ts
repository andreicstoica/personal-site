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
					content: z.string(),
				}),
			}),
		)
		.min(1),
});

export type Completion =
	| { kind: "ok"; content: string }
	| { kind: "cold" }
	| { kind: "down"; detail: string };

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
		LOCAL_MODEL_URL: envValue("LOCAL_MODEL_URL"),
		LOCAL_MODEL_ID: envValue("LOCAL_MODEL_ID"),
		HF_API_URL: envValue("HF_API_URL"),
		HF_API_KEY: envValue("HF_API_KEY"),
		HF_MODEL_ID: envValue("HF_MODEL_ID"),
		MODAL_API_URL: envValue("MODAL_API_URL"),
		MODAL_API_KEY: envValue("MODAL_API_KEY"),
		MODAL_MODEL_ID: envValue("MODAL_MODEL_ID"),
		MODAL_PROXY_KEY: envValue("MODAL_PROXY_KEY"),
		MODAL_PROXY_SECRET: envValue("MODAL_PROXY_SECRET"),
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
	const url = `${args.resolved.baseUrl}/v1/chat/completions`;
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
			signal: AbortSignal.timeout(22_000),
		});
		if (response.status === 502 || response.status === 503)
			return { kind: "cold" };
		if (!response.ok) {
			return { kind: "down", detail: `Model API HTTP ${response.status}` };
		}
		const parsed = completionSchema.safeParse(await response.json());
		if (!parsed.success)
			return { kind: "down", detail: "Unexpected model payload" };
		const content = parsed.data.choices[0]?.message.content;
		if (!content) return { kind: "down", detail: "Empty model response" };
		return { kind: "ok", content };
	} catch (error) {
		if (
			error instanceof Error &&
			(error.name === "TimeoutError" || error.name === "AbortError")
		) {
			return { kind: "cold" };
		}
		const detail =
			error instanceof Error ? error.message : "Model request failed";
		return { kind: "down", detail };
	}
}
