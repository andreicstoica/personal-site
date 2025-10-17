import fs from "fs";
import MiniSearch from "minisearch";
import path from "path";
import pLimit from "p-limit";
import crypto from "crypto";
import { buildEmbeddings, loadDocuments } from "./lib/embed.ts";
import {
	EMBEDDING_CACHE_FILE,
	INDEX_FILE,
	KEYWORD_INDEX_FILE,
	CACHE_DIR
} from "./lib/constants.ts";

interface EmbeddingIndexItem {
	id: string;
	text: string;
	source: string;
	embedding: number[];
	metadata: Record<string, any>;
}

const DATA_DIR = path.resolve("./rag/data");

// Load embedding cache
function loadEmbeddingCache(): Map<string, number[]> {
	const cache = new Map<string, number[]>();
	try {
		if (fs.existsSync(EMBEDDING_CACHE_FILE)) {
			const cacheData = JSON.parse(fs.readFileSync(EMBEDDING_CACHE_FILE, 'utf8'));
			for (const [key, embedding] of Object.entries(cacheData)) {
				cache.set(key, embedding as number[]);
			}
		}
	} catch (error) {
		console.warn("Failed to load embedding cache:", error);
	}
	return cache;
}

// Save embedding cache
function saveEmbeddingCache(cache: Map<string, number[]>) {
	try {
		// Ensure cache directory exists
		fs.mkdirSync(CACHE_DIR, { recursive: true });

		const cacheData: Record<string, number[]> = {};
		for (const [key, embedding] of cache) {
			cacheData[key] = embedding;
		}

		fs.writeFileSync(EMBEDDING_CACHE_FILE, JSON.stringify(cacheData, null, 2));
		console.log("✅ Saved embedding cache:", EMBEDDING_CACHE_FILE);
	} catch (error) {
		console.warn("Failed to save embedding cache:", error);
	}
}

// Generate cache key for text
function getCacheKey(text: string): string {
	return crypto.createHash('sha1').update(text).digest('hex');
}

async function main() {
	console.log("Loading documents...");
	const docs = loadDocuments(DATA_DIR);
	console.log(`Found ${docs.length} documents to index`);

	// Load embedding cache
	const embeddingCache = loadEmbeddingCache();
	console.log(`Loaded ${embeddingCache.size} cached embeddings`);

	const embeddingIndex: EmbeddingIndexItem[] = [];
	const keywordIndex = new MiniSearch({
		fields: ["text", "title", "tags", "source"],
		storeFields: ["id", "text", "title", "tags", "source", "metadata"],
		searchOptions: {
			boost: { text: 2, title: 1.5, tags: 2, source: 1 },
			fuzzy: 0.2,
			prefix: true,
		},
	});

	// Process documents with concurrency limit
	const limit = pLimit(6);
	const processDoc = async (doc: any) => {
		const cacheKey = getCacheKey(doc.text);
		let embedding: number[];

		// Check cache first
		if (embeddingCache.has(cacheKey)) {
			embedding = embeddingCache.get(cacheKey)!;
			console.log("Using cached embedding for", doc.id);
		} else {
			embedding = await buildEmbeddings(doc.text);
			embeddingCache.set(cacheKey, embedding);
		}

		const source = doc.id.replace(/^\/?/, "");

		// Add to embedding index with metadata
		embeddingIndex.push({
			id: doc.id,
			text: doc.text,
			source: source,
			embedding,
			metadata: doc.metadata || {}
		});

		// Add to keyword index with metadata
		keywordIndex.add({
			id: doc.id,
			text: doc.text,
			title: doc.metadata?.title || "",
			tags: (doc.metadata?.tags || []).join(" "),
			source: source,
			metadata: doc.metadata || {}
		});

		console.log("Indexed", doc.id);
	};

	// Process all documents with concurrency limit
	const promises = docs.map(doc => limit(() => processDoc(doc)));
	await Promise.all(promises);

	// Save embedding cache
	saveEmbeddingCache(embeddingCache);

	// Save embedding index
	fs.writeFileSync(INDEX_FILE, JSON.stringify(embeddingIndex, null, 2));
	console.log("✅ Wrote embedding index:", INDEX_FILE);

	// Save keyword index
	const keywordData = keywordIndex.toJSON();
	fs.writeFileSync(KEYWORD_INDEX_FILE, JSON.stringify(keywordData, null, 2));
	console.log("✅ Wrote keyword index:", KEYWORD_INDEX_FILE);
}

main();
