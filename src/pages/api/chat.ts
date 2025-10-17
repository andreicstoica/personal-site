import type { APIRoute } from 'astro';
import { queryRag } from '../../../rag/lib/query.js';
import { RELEVANCE_THRESHOLD } from '../../../rag/lib/constants.js';

const HF_API_URL = import.meta.env.HF_API_URL;
const HF_API_KEY = import.meta.env.HF_API_KEY;

console.log('HF_API_URL:', HF_API_URL);
console.log('HF_API_KEY exists:', !!HF_API_KEY);

interface ChatRequest {
    message: string;
    history?: Array<{ role: string; content: string }>;
}

interface ChatResponse {
    response: string;
    sources: Array<{ source: string; score: number }>;
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
            return new Response(JSON.stringify({ error: 'Empty request body' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { message, history = [] }: ChatRequest = JSON.parse(body);

        if (!message) {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Cheap prefilter heuristics
        const isShortQuery = message.trim().length < 10;
        const isGreeting = /^(hi|hello|hey|what's up|how are you|howdy|sup|yo)\s*[!.]*$/i.test(message.trim());
        const shouldSkipRag = isShortQuery || isGreeting;

        if (shouldSkipRag) {
            console.log(`Skipping RAG: ${isShortQuery ? 'short query' : 'greeting detected'}`);
        }

        let relevantDocs: any[] = [];
        let shouldUseRag = false;

        if (!shouldSkipRag) {
            // Get relevant documents from RAG
            console.log('Starting RAG query for:', message);
            relevantDocs = await queryRag(message);
            console.log('RAG results:', relevantDocs);

            // Only use RAG if the best match exceeds relevance threshold
            const bestScore = relevantDocs.length > 0 ? relevantDocs[0].score : 0;
            shouldUseRag = bestScore >= RELEVANCE_THRESHOLD;

            console.log(`RAG decision: ${shouldUseRag ? 'USE' : 'SKIP'} (best score: ${bestScore.toFixed(3)})`);
        }

        let systemPrompt: string;

        if (shouldUseRag) {
            // Format context from retrieved document chunks
            const context = relevantDocs
                .filter(doc => doc.score >= RELEVANCE_THRESHOLD) // Only include high-relevance docs
                .map((doc, idx) => `[${idx + 1}] From ${doc.source.replace('.txt', '')}:\n${doc.text}`)
                .join('\n\n');

            systemPrompt = `You are Andrei's AI Guide, embedded on andrei.bio. Answer questions using the context provided below.

Context:
${context}

CRITICAL RULES:
- Use ONLY information from the context above. Do NOT use any external knowledge.
- If the context doesn't fully answer the question, be conversational and acknowledge what you know vs. what you don't know from the provided context.
- NEVER invent, assume, or extrapolate facts, dates, experiences, places, relationships, or personal details.
- Do not make assumptions about family, relationships, or personal life unless explicitly stated in context.
- Write in Andrei's voice: concise, direct, thoughtful. No filler.
- Quote or paraphrase the context directly when answering.
- Be helpful and engaging - if you can't fully answer, explain what you do know and suggest related topics you can discuss.
- Reference the source numbers [1], [2], etc. when citing specific information.`;
        } else {
            systemPrompt = `You are Andrei's AI Guide on andrei.bio. 

I help visitors learn about Andrei based on his resume, writing, and projects.

RULES:
- Keep responses brief and friendly for greetings and casual messages
- For substantive questions, be conversational and engaging - acknowledge what I can and can't answer based on my knowledge base
- Focus on what I DO know about: his work, projects, technical interests, writing, and professional background
- NEVER invent facts about Andrei - no assumptions about relationships, family, personal life, or specific experiences
- Be helpful and suggest related topics I can discuss when you can't fully answer something`;
        }

        // Call HF Inference API
        const lmStudioRequest: LMStudioRequest = {
            model: 'noodlesGS/personal',
            messages: [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: message }
            ],
            temperature: shouldUseRag ? 0.3 : 0.6, // Lower temp for RAG = more faithful to context
            max_tokens: shouldUseRag ? 1500 : 500 // Longer responses when we have context
        };

        console.log('Calling HF API:', `${HF_API_URL}/v1/chat/completions`);
        console.log('Request:', JSON.stringify(lmStudioRequest, null, 2));

        const hfResponse = await fetch(`${HF_API_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_API_KEY}`,
            },
            body: JSON.stringify(lmStudioRequest),
        });

        console.log('HF Response status:', hfResponse.status);

        if (!hfResponse.ok) {
            const errorText = await hfResponse.text();
            console.error('HF API error response:', errorText);
            throw new Error(`HF API error: ${hfResponse.status} - ${errorText}`);
        }

        const data: LMStudioResponse = await hfResponse.json();
        const response = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

        const chatResponse: ChatResponse = {
            response,
            sources: shouldUseRag
                ? relevantDocs
                    .filter(doc => doc.score >= RELEVANCE_THRESHOLD)
                    .map(doc => ({ source: doc.source, score: doc.score }))
                : [] // No sources when RAG wasn't used
        };

        return new Response(JSON.stringify(chatResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Chat API error:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
        return new Response(JSON.stringify({
            error: 'Failed to process chat request',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};