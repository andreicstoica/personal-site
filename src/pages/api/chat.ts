import type { APIRoute } from "astro";
import { queryRag } from "../../../rag/lib/query.js";

export const POST: APIRoute = async ({ request }) => {
    const { question } = await request.json();
    const results = await queryRag(question);
    return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" },
    });
};