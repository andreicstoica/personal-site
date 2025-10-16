import fs from "fs";
import { buildEmbeddings } from "./embed.js";

export async function queryRag(question: string) {
    const index = JSON.parse(fs.readFileSync("./rag/index.json", "utf8"));
    const queryEmbed = await buildEmbeddings(question);

    // cosine similarity
    function cosine(a: number[], b: number[]) {
        let dot = 0,
            normA = 0,
            normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    const ranked = index
        .map((doc: { id: any; embedding: number[]; text?: string; source?: string; }) => ({
            id: doc.id,
            text: doc.text,
            source: doc.source,
            score: cosine(queryEmbed, doc.embedding),
        }))
        .sort((a: { score: number; }, b: { score: number; }) => b.score - a.score)
        .slice(0, 3);

    return ranked;
}