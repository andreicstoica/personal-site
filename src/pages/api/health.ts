import type { APIRoute } from "astro";

const MODEL_PROVIDER = (
	import.meta.env.MODEL_PROVIDER ?? "local"
).toLowerCase();
const IS_LOCAL_MODEL = MODEL_PROVIDER === "local";
const LOCAL_MODEL_URL =
	import.meta.env.LOCAL_MODEL_URL ?? "http://localhost:1234";
const LOCAL_MODEL_ID = import.meta.env.LOCAL_MODEL_ID ?? "noodlesGS/personal";
const HF_API_URL = import.meta.env.HF_API_URL;
const HF_API_KEY = import.meta.env.HF_API_KEY;
const HF_MODEL_ID = import.meta.env.HF_MODEL_ID ?? "noodlesGS/personal";

export const prerender = false;

export const GET: APIRoute = async () => {
	try {
		// Check configuration based on model provider
		if (IS_LOCAL_MODEL) {
			if (!LOCAL_MODEL_URL) {
				return new Response(
					JSON.stringify({
						status: "error",
						message: "Local model URL not configured",
					}),
					{
						status: 503,
						headers: { "Content-Type": "application/json" },
					},
				);
			}
		} else {
			if (!HF_API_URL || !HF_API_KEY) {
				return new Response(
					JSON.stringify({
						status: "error",
						message: "Hugging Face API configuration missing",
					}),
					{
						status: 503,
						headers: { "Content-Type": "application/json" },
					},
				);
			}
		}

		// Quick health check with minimal tokens
		const baseUrl = IS_LOCAL_MODEL ? LOCAL_MODEL_URL : HF_API_URL;
		const modelId = IS_LOCAL_MODEL ? LOCAL_MODEL_ID : HF_MODEL_ID;
		const apiUrl = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};

		if (!IS_LOCAL_MODEL) {
			headers["Authorization"] = `Bearer ${HF_API_KEY}`;
		}

		const response = await fetch(apiUrl, {
			method: "POST",
			headers,
			body: JSON.stringify({
				model: modelId,
				messages: [{ role: "user", content: "hi" }],
				max_tokens: 1,
				temperature: 0.1,
			}),
		});

		if (response.ok) {
			return new Response(JSON.stringify({ status: "ok" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(
			JSON.stringify({
				status: "error",
				message: "Inference server is not responding",
			}),
			{
				status: 503,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Health check failed:", error);
		return new Response(
			JSON.stringify({
				status: "error",
				message: "Inference server is currently down",
			}),
			{
				status: 503,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
