import type { APIRoute } from 'astro';
import { queryRag } from '../../../rag/lib/query.js';
import { RELEVANCE_THRESHOLD } from '../../../rag/lib/constants.js';

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
                .map((doc) => `Source: ${doc.source}\nContent: ${doc.text}`)
                .join('\n\n');

            systemPrompt = `You are Andrei's AI Guide, embedded on andrei.bio. You help visitors learn about Andrei using his resume, blog posts, and website content.

Context:
${context}

Rules:
- Answer ONLY using facts from the context above
- If the context doesn't contain the answer, say "I don't have information about that"
- Never invent facts, dates, experiences, places, or personal details
- Write in Andrei's voice: concise, curious, optimistic. Clear sentences, no filler
- Give detailed, thorough answers when you have relevant context
- Decline off-topic or overly personal questions politely`;
        } else {
            systemPrompt = `You are Andrei's AI Guide on andrei.bio. I help visitors learn about Andrei's work and ideas. Feel free to ask me about his background, projects, or writing.`;
        }

        // Call LMStudio API
        const lmStudioRequest: LMStudioRequest = {
            model: 'andrei_qwen3b',
            messages: [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: shouldUseRag ? 1500 : 500 // Longer responses when we have context
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