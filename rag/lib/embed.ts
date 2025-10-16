import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";

interface Document {
    id: string;
    text: string;
}

let embeddingPipeline: any = null;

export async function buildEmbeddings(text: string): Promise<number[]> {
    if (!embeddingPipeline) {
        embeddingPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }

    const result = await embeddingPipeline(text, { pooling: "mean", normalize: true });
    return Array.from(result.data);
}

// Split text into chunks for better semantic matching
function chunkText(text: string, chunkSize: number = 300, overlap: number = 50): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;

        // Try to break at sentence boundaries
        if (end < text.length) {
            const lastPeriod = text.lastIndexOf('.', end);
            const lastNewline = text.lastIndexOf('\n', end);
            const breakPoint = Math.max(lastPeriod, lastNewline);

            if (breakPoint > start + chunkSize * 0.5) {
                end = breakPoint + 1;
            }
        }

        const chunk = text.slice(start, end).trim();
        if (chunk.length > 0) {
            chunks.push(chunk);
        }

        start = end - overlap;
    }

    return chunks;
}

// Recursively gather all .txt/.md files in data/ and chunk them
export function loadDocuments(dataDir: string): Document[] {
    const docs: Document[] = [];
    function recurse(dir: string) {
        for (const file of fs.readdirSync(dir)) {
            const full = path.join(dir, file);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) recurse(full);
            else if (file.endsWith(".txt") || file.endsWith(".md")) {
                const text = fs.readFileSync(full, "utf8");
                const chunks = chunkText(text);

                // Create a document for each chunk
                chunks.forEach((chunk, index) => {
                    const chunkId = chunks.length > 1
                        ? `${full.replace(dataDir, "")}#chunk-${index + 1}`
                        : full.replace(dataDir, "");
                    docs.push({ id: chunkId, text: chunk });
                });
            }
        }
    }
    recurse(dataDir);
    return docs;
}