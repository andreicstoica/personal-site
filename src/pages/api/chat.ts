import type { APIRoute } from "astro";
import { T_MID, T_HIGH } from "../../../rag/lib/constants.js";
import { queryRag } from "../../../rag/lib/query.js";
import { formatForPrompt, estimateTokenCount } from "../../../rag/lib/toon-formatter.js";

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

console.log("Model provider:", MODEL_PROVIDER);
console.log("HF API configured:", Boolean(HF_API_URL && HF_API_KEY));
console.log("Local model endpoint:", LOCAL_MODEL_URL);

interface ChatRequest {
	message: string;
	history?: Array<{ role: string; content: string }>;
}

interface ChatResponse {
	response: string;
	sources: Array<{
		source: string;
		score: number;
		metadata?: any;
		confidence?: string;
		scoreDetails?: {
			rawDense: number;
			dense: number;
			rawSparse: number;
			sparse: number;
			weightedDense: number;
			weightedSparse: number;
			intentWeight: number;
			timeDecayFactor: number;
			hybrid: number;
		};
	}>;
}

interface LMStudioRequest {
	model: string;
	messages: Array<{ role: string; content: string }>;
	temperature: number;
	max_tokens: number;
}

interface LMStudioResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.text();
		if (!body) {
			return new Response(JSON.stringify({ error: "Empty request body" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const { message, history = [] }: ChatRequest = JSON.parse(body);

		if (!message) {
			return new Response(JSON.stringify({ error: "Message is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Cheap prefilter heuristics
		const isShortQuery = message.trim().length < 10;
		const isGreeting =
			/^(hi|hello|hey|what's up|how are you|howdy|sup|yo)\s*[!.]*$/i.test(
				message.trim(),
			);
		const shouldSkipRag = isShortQuery || isGreeting;

		if (shouldSkipRag) {
			console.log(
				`Skipping RAG: ${isShortQuery ? "short query" : "greeting detected"}`,
			);
		}

		let relevantDocs: any[] = [];
		let shouldUseRag = false;

		if (!shouldSkipRag) {
			// Get relevant documents from RAG
			console.log("Starting RAG query for:", message);
			relevantDocs = await queryRag(message);
			console.log("RAG results:", relevantDocs);

			// Use banded confidence thresholds
			const bestScore = relevantDocs.length > 0 ? relevantDocs[0].score : 0;
			shouldUseRag = bestScore >= T_MID;

			console.log(
				`RAG decision: ${shouldUseRag ? "USE" : "SKIP"} (best score: ${bestScore.toFixed(3)}, threshold: ${T_MID})`,
			);
		}

		let systemPrompt: string;

		if (shouldUseRag) {
			// Determine confidence level and format context accordingly
			const bestScore = relevantDocs[0]?.score || 0;
			const isHighConfidence = bestScore >= T_HIGH;

			// Calculate token usage before and after TOON encoding
			const originalTokens = relevantDocs.reduce((sum, doc) => sum + estimateTokenCount(doc.text), 0);
			const context = formatForPrompt(relevantDocs);
			const encodedTokens = estimateTokenCount(context);
			const tokenSavings = originalTokens > 0 ? ((originalTokens - encodedTokens) / originalTokens * 100).toFixed(1) : '0';

			console.log(`Token usage: ${originalTokens} → ${encodedTokens} tokens (${tokenSavings}% reduction)`);

			// Format context with numbered citations and TOON instructions
			if (isHighConfidence) {
				systemPrompt = `You are Andrei's AI Guide, embedded on andrei.bio. Answer questions using the high-confidence context provided below.

Context:
${context}

CRITICAL RULES:
- Use ONLY information from the context above. Do NOT use any external knowledge.
- You have high confidence in this context, so provide direct, synthesized answers.
- Write in Andrei's voice: concise, direct, thoughtful. No filler.
- Quote or paraphrase the context directly when answering.
- Be authoritative and helpful - synthesize information across sources when relevant.
- Entries include confidence labels; when a snippet is marked medium or low, acknowledge uncertainty and use it as supporting evidence only.

TOON FORMAT NOTES:
- When context is provided in TOON format (marked with \`\`\`toon), note:
  - Arrays show length: items[3] means 3 items
  - Tabular data uses headers: items[2]{name,value}: shows 2 rows with name/value fields
  - Values are inline without repeated keys
  - This format is more compact but contains the same information as regular text`;
			} else {
				systemPrompt = `You are Andrei's AI Guide, embedded on andrei.bio. Answer questions using the moderate-confidence context provided below.

Context:
${context}

CRITICAL RULES:
- Use ONLY information from the context above. Do NOT use any external knowledge.
- You have moderate confidence in this context, so quote relevant passages and acknowledge limitations.
- Write in Andrei's voice: concise, direct, thoughtful. No filler.
- Quote or paraphrase the context directly when answering.
- Be helpful and engaging - explain what you know and suggest related topics you can discuss.
- Entries include confidence labels; when a snippet is marked medium or low, treat it as tentative and qualify anything you draw from it.

TOON FORMAT NOTES:
- When context is provided in TOON format (marked with \`\`\`toon), note:
  - Arrays show length: items[3] means 3 items
  - Tabular data uses headers: items[2]{name,value}: shows 2 rows with name/value fields
  - Values are inline without repeated keys
  - This format is more compact but contains the same information as regular text`;
			}
		} else {
			systemPrompt = `You are Andrei's AI Guide on andrei.bio. 

I help visitors learn about Andrei based on his resume, writing, and projects.

RULES:
- Keep responses brief and friendly for greetings and casual messages
- For substantive questions, be conversational and engaging - acknowledge what I can and can't answer based on my knowledge base
- Focus on what I DO know about: his work, projects, technical interests, writing, and professional background
- NEVER invent facts about Andrei - no assumptions about relationships, family, personal life, or specific experiences
- If I'm unsure or lack the information, say that plainly and steer toward topics I can cover instead of speculating
- Be helpful and suggest related topics I can discuss when you can't fully answer something`;
		}

		// Call HF Inference API
		const lmStudioRequest: LMStudioRequest = {
			model: IS_LOCAL_MODEL ? LOCAL_MODEL_ID : HF_MODEL_ID,
			messages: [
				{ role: "system", content: systemPrompt },
				...history,
				{ role: "user", content: message },
			],
			temperature: shouldUseRag ? 0.3 : 0.6, // Lower temp for RAG = more faithful to context
			max_tokens: shouldUseRag ? 1500 : 500, // Longer responses when we have context
		};

		const baseUrl = IS_LOCAL_MODEL ? LOCAL_MODEL_URL : HF_API_URL;

		if (!baseUrl) {
			throw new Error("No API base URL configured for selected model provider");
		}

		const apiUrl = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};

		if (!IS_LOCAL_MODEL) {
			if (!HF_API_KEY) {
				throw new Error("HF_API_KEY is required for Hugging Face provider");
			}
			headers["Authorization"] = `Bearer ${HF_API_KEY}`;
		}

		console.log("Calling model endpoint:", apiUrl);
		console.log("Request:", JSON.stringify(lmStudioRequest, null, 2));

		const hfResponse = await fetch(apiUrl, {
			method: "POST",
			headers,
			body: JSON.stringify(lmStudioRequest),
		});

		console.log("Model response status:", hfResponse.status);

		if (!hfResponse.ok) {
			const errorText = await hfResponse.text();
			console.error("Model API error response:", errorText);
			throw new Error(`Model API error: ${hfResponse.status} - ${errorText}`);
		}

		const data: LMStudioResponse = await hfResponse.json();
		const response =
			data.choices[0]?.message?.content ||
			"Sorry, I could not generate a response.";

		const chatResponse: ChatResponse = {
			response,
			sources: shouldUseRag
				? relevantDocs.map((doc) => ({
					source: doc.source,
					score: doc.score,
					metadata: doc.metadata,
					confidence: doc.confidence,
					scoreDetails: doc.scoreDetails
				}))
				: [], // No sources when RAG wasn't used
		};

		return new Response(JSON.stringify(chatResponse), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Chat API error:", error);
		console.error(
			"Error stack:",
			error instanceof Error ? error.stack : "No stack",
		);
		return new Response(
			JSON.stringify({
				error: "Failed to process chat request",
				details: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
