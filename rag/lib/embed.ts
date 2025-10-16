import fs from "fs";
import path from "path";
import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function buildEmbeddings(text: string) {
    const res = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });
    return res.data[0].embedding;
}

// Recursively gather all .txt/.md files in data/
export function loadDocuments(dataDir: string) {
    const docs: { id: string; text: string }[] = [];
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