import fs from "fs";
import MiniSearch from "minisearch";
import path from "path";
import { buildEmbeddings, loadDocuments } from "./lib/embed.js";

const DATA_DIR = path.resolve("./rag/data");
const EMBEDDING_OUT_PATH = path.resolve("./rag/index.json");
const KEYWORD_OUT_PATH = path.resolve("./rag/keyword-index.json");

async function main() {
	const docs = loadDocuments(DATA_DIR);
	const embeddingIndex = [];
	const keywordIndex = new MiniSearch({
		fields: ["text", "source"],
		storeFields: ["id", "text", "source"],
		searchOptions: {
			boost: { text: 2, source: 1 },
			fuzzy: 0.2,
			prefix: true,
		},
	});

	for (const doc of docs) {
		const embedding = await buildEmbeddings(doc.text);
		const source = doc.id.replace(/^\/?/, "");

		// Add to embedding index
		embeddingIndex.push({
			id: doc.id,
			text: doc.text,
			source: source,
			embedding,
		});

		// Add to keyword index
		keywordIndex.add({
			id: doc.id,
			text: doc.text,
			source: source,
		});

		console.log("Indexed", doc.id);
	}

	// Save embedding index
	fs.writeFileSync(EMBEDDING_OUT_PATH, JSON.stringify(embeddingIndex, null, 2));
	console.log("✅ Wrote embedding index:", EMBEDDING_OUT_PATH);

	// Save keyword index
	const keywordData = keywordIndex.toJSON();
	fs.writeFileSync(KEYWORD_OUT_PATH, JSON.stringify(keywordData, null, 2));
	console.log("✅ Wrote keyword index:", KEYWORD_OUT_PATH);
}

main();
