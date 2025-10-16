import type { APIRoute } from 'astro';

const HF_API_URL = import.meta.env.HF_API_URL;
const HF_API_KEY = import.meta.env.HF_API_KEY;

export const prerender = false;

export const GET: APIRoute = async () => {
    try {
        if (!HF_API_URL || !HF_API_KEY) {
            return new Response(JSON.stringify({
                status: 'error',
                message: 'Server configuration missing'
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Quick health check with minimal tokens
        const response = await fetch(`${HF_API_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'noodlesGS/personal',
                messages: [{ role: 'user', content: 'hi' }],
                max_tokens: 1,
                temperature: 0.1
            }),
        });

        if (response.ok) {
            return new Response(JSON.stringify({ status: 'ok' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            status: 'error',
            message: 'Inference server is not responding'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Health check failed:', error);
        return new Response(JSON.stringify({
            status: 'error',
            message: 'Inference server is currently down'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

