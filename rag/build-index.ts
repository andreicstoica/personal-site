import fs from "fs";
import path from "path";
import { buildEmbeddings, loadDocuments } from "./lib/embed.js";

const DATA_DIR = path.resolve("./rag/data");
const OUT_PATH = path.resolve("./rag/index.json");

async function main() {
    const docs = loadDocuments(DATA_DIR);
    const index = [];

    for (const doc of docs) {
        const embedding = await buildEmbeddings(doc.text);
        index.push({
            id: doc.id,
            text: doc.text,
            source: doc.id.replace(/^\/?/, ""),
            embedding
        });
        console.log("Embedded", doc.id);
    }

    fs.writeFileSync(OUT_PATH, JSON.stringify(index, null, 2));
    console.log("✅ Wrote index:", OUT_PATH);
}

main();