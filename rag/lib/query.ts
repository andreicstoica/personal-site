import fs from "fs";
import { buildEmbeddings } from "./embed.js";

interface Document {
    id: string;
    text: string;
    source: string;
    embedding: number[];
}

interface QueryResult {
    id: string;
    text: string;
    source: string;
    score: number;
}

export async function queryRag(question: string): Promise<QueryResult[]> {
    const index: Document[] = JSON.parse(fs.readFileSync("./rag/index.json", "utf8"));
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

    const ranked: QueryResult[] = index
        .map((doc: Document) => ({
            id: doc.id,
            text: doc.text,
            source: doc.source,
            score: cosine(queryEmbed, doc.embedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    return ranked;
}