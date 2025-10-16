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

// Recursively gather all .txt/.md files in data/
export function loadDocuments(dataDir: string): Document[] {
    const docs: Document[] = [];
    function recurse(dir: string) {
        for (const file of fs.readdirSync(dir)) {
            const full = path.join(dir, file);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) recurse(full);
            else if (file.endsWith(".txt") || file.endsWith(".md")) {
                const text = fs.readFileSync(full, "utf8");
                docs.push({ id: full.replace(dataDir, ""), text });
            }
        }
    }
    recurse(dataDir);
    return docs;
}