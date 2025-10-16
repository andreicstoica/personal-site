import fs from "node:fs/promises";
import path from "node:path";
import { loadDocuments } from "./lib/embed.js";

const DATA_DIR = path.resolve("./rag/data");
const IN_PATH = path.resolve("./rag/index.json");
const OUT_PATH = path.resolve("./rag/index.json");

type Row = { id: string; embedding: number[]; text?: string; source?: string };

async function main() {
    const [rawIndex, docs] = await Promise.all([
        fs.readFile(IN_PATH, "utf8").then(JSON.parse),
        Promise.resolve(loadDocuments(DATA_DIR)),
    ]);

    // Map doc.id -> text for quick lookup
    const textById = new Map<string, string>();
    for (const d of docs) textById.set(d.id, d.text);

    // If your `id` is a file path, extract a nicer `source`
    function deriveSource(id: string) {
        // e.g., "blog/foo.md" from "rag/data/blog/foo.md"
        return id.replace(/^\/?/, "");
    }

    const enriched: Row[] = rawIndex.map((r: Row) => {
        const text = textById.get(r.id);
        return {
            ...r,
            text: text ?? "(missing text — reindex recommended)",
            source: deriveSource(r.id),
        };
    });

    await fs.writeFile(OUT_PATH, JSON.stringify(enriched, null, 2));
    console.log(`✅ Enriched index with text → ${OUT_PATH} (rows: ${enriched.length})`);

    // sanity: count missing texts
    const missing = enriched.filter(e => !e.text || e.text.startsWith("(missing")).length;
    if (missing) {
        console.warn(`⚠️ ${missing} entries lacked a matching doc.id — consider a full rebuild.`);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
