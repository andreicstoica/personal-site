import type { APIRoute } from 'astro';
import { queryRag } from '../../../rag/lib/query.js';

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

        // Get relevant documents from RAG
        console.log('Starting RAG query for:', message);
        const relevantDocs = await queryRag(message);
        console.log('RAG results:', relevantDocs);

        // Format context from retrieved documents
        const context = relevantDocs
            .map((doc) => `Source: ${doc.source}\nContent: ${doc.text}`)
            .join('\n\n');

        // Prepare system prompt with context
        const systemPrompt = `You are Andrei, responding as yourself. Use the following context to answer questions about yourself and your work. If the context doesn't contain relevant information, respond naturally as yourself.

Context:
${context}

Respond naturally as Andrei would, incorporating relevant information from the context when appropriate.`;

        // Call LMStudio API
        const lmStudioRequest: LMStudioRequest = {
            model: 'andrei_qwen3b',
            messages: [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 1000
        };

        const lmStudioResponse = await fetch('http://192.168.1.187:1234/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(lmStudioRequest)
        });

        if (!lmStudioResponse.ok) {
            throw new Error(`LMStudio API error: ${lmStudioResponse.status}`);
        }

        const data: LMStudioResponse = await lmStudioResponse.json();
        const response = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

        const chatResponse: ChatResponse = {
            response,
            sources: relevantDocs.map(doc => ({ source: doc.source, score: doc.score }))
        };

        return new Response(JSON.stringify(chatResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Chat API error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to process chat request',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};