import fs from "fs";
import MiniSearch from "minisearch";
import path from "path";
import { buildEmbeddings } from "./embed.js";
import {
	TOP_K_CANDIDATES,
	TOP_K_FINAL,
	W_DENSE,
	W_SPARSE,
	TIME_DECAY_ALPHA,
	MIN_DECAY_FACTOR,
	QUERY_SYNONYMS,
	INDEX_FILE,
	KEYWORD_INDEX_FILE
} from "./constants.js";

interface Document {
	id: string;
	text: string;
	source: string;
	embedding: number[];
	metadata?: {
		type?: string;
		title?: string;
		date?: string;
		tags?: string[];
		headingPath?: string;
		sourceUrl?: string;
	};
}

interface QueryResult {
	id: string;
	text: string;
	source: string;
	score: number;
	metadata?: any;
	confidence?: 'high' | 'medium' | 'low';
}

let keywordIndex: MiniSearch | null = null;

function loadKeywordIndex(): MiniSearch {
	if (!keywordIndex) {
		try {
			const keywordPath = path.resolve(KEYWORD_INDEX_FILE);
			console.log("Loading keyword index from:", keywordPath);
			const keywordData = JSON.parse(fs.readFileSync(keywordPath, "utf8"));
			console.log("Keyword data loaded, loading MiniSearch from JSON...");

			// Load the MiniSearch instance from the saved JSON
			keywordIndex = MiniSearch.loadJSON(JSON.stringify(keywordData), {
				fields: ["text", "title", "tags", "source"],
				storeFields: ["id", "text", "title", "tags", "source", "metadata"],
				searchOptions: {
					boost: { text: 2, title: 1.5, tags: 1, source: 1 },
					fuzzy: 0.2,
					prefix: true,
				},
			});

			console.log("MiniSearch instance loaded successfully");
		} catch (error) {
			console.error("Error loading keyword index:", error);
			throw error;
		}
	}
	return keywordIndex;
}

// Expand query with synonyms
function expandQuery(query: string): string {
	const words = query.toLowerCase().split(/\s+/);
	const expandedWords = new Set(words);

	for (const word of words) {
		if (QUERY_SYNONYMS[word]) {
			QUERY_SYNONYMS[word].forEach(synonym => expandedWords.add(synonym));
		}
	}

	return Array.from(expandedWords).join(' ');
}

// Detect query intent for type prefiltering
function detectQueryIntent(query: string): string[] {
	const lowerQuery = query.toLowerCase();
	const intents: string[] = [];

	if (lowerQuery.includes('work') || lowerQuery.includes('job') || lowerQuery.includes('career') ||
		lowerQuery.includes('experience') || lowerQuery.includes('company') || lowerQuery.includes('role')) {
		intents.push('resume');
	}

	if (lowerQuery.includes('blog') || lowerQuery.includes('write') || lowerQuery.includes('post') ||
		lowerQuery.includes('article') || lowerQuery.includes('thought')) {
		intents.push('blog');
	}

	if (lowerQuery.includes('project') || lowerQuery.includes('build') || lowerQuery.includes('create') ||
		lowerQuery.includes('develop') || lowerQuery.includes('app') || lowerQuery.includes('website')) {
		intents.push('project');
	}

	if (lowerQuery.includes('essay') || lowerQuery.includes('philosophy') || lowerQuery.includes('canon') ||
		lowerQuery.includes('think') || lowerQuery.includes('belief')) {
		intents.push('essay');
	}

	return intents;
}

// Apply time decay to scores based on document date
function applyTimeDecay(score: number, date?: string): number {
	if (!date) return score;

	try {
		const docDate = new Date(date);
		const now = new Date();
		const ageDays = (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24);

		const decayFactor = Math.max(MIN_DECAY_FACTOR, 1 - (TIME_DECAY_ALPHA * ageDays));
		return score * decayFactor;
	} catch {
		return score;
	}
}

// Determine confidence level based on score
function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
	if (score >= 0.7) return 'high';
	if (score >= 0.4) return 'medium';
	return 'low';
}

export async function queryRag(question: string): Promise<QueryResult[]> {
	const embeddingPath = path.resolve(INDEX_FILE);
	const embeddingIndex: Document[] = JSON.parse(
		fs.readFileSync(embeddingPath, "utf8"),
	);

	// Expand query with synonyms
	const expandedQuery = expandQuery(question);
	console.log(`Original query: "${question}"`);
	console.log(`Expanded query: "${expandedQuery}"`);

	// Detect query intent for prefiltering
	const intents = detectQueryIntent(question);
	console.log(`Detected intents: ${intents.join(', ')}`);

	const queryEmbed = await buildEmbeddings(expandedQuery);

	// Cosine similarity
	function cosine(a: number[], b: number[]) {
		let dot = 0, normA = 0, normB = 0;
		for (let i = 0; i < a.length; i++) {
			dot += a[i] * b[i];
			normA += a[i] * a[i];
			normB += b[i] * b[i];
		}
		return dot / (Math.sqrt(normA) * Math.sqrt(normB));
	}

	// Get sparse (BM25) results
	const keywordSearch = loadKeywordIndex();
	const sparseResults = keywordSearch
		.search(expandedQuery, {
			boost: { text: 2, title: 1.5, tags: 2, source: 1 },
		})
		.slice(0, TOP_K_CANDIDATES);

	console.log(`BM25 found ${sparseResults.length} candidates`);

	// Get dense (embedding) results
	const denseResults = embeddingIndex
		.map((doc: Document) => ({
			id: doc.id,
			text: doc.text,
			source: doc.source,
			metadata: doc.metadata,
			score: cosine(queryEmbed, doc.embedding),
		}))
		.sort((a, b) => b.score - a.score)
		.slice(0, TOP_K_CANDIDATES);

	console.log(`Dense search found ${denseResults.length} candidates`);

	// Merge and rerank results
	const candidateMap = new Map<string, any>();

	// Add sparse results
	sparseResults.forEach((result: any) => {
		candidateMap.set(result.id, {
			id: result.id,
			text: result.text,
			source: result.source,
			metadata: result.metadata,
			sparseScore: result.score,
			denseScore: 0,
		});
	});

	// Add dense results and merge scores
	denseResults.forEach((result) => {
		const existing = candidateMap.get(result.id);
		if (existing) {
			existing.denseScore = result.score;
		} else {
			candidateMap.set(result.id, {
				id: result.id,
				text: result.text,
				source: result.source,
				metadata: result.metadata,
				sparseScore: 0,
				denseScore: result.score,
			});
		}
	});

	// Apply type prefiltering if intents detected
	let candidates = Array.from(candidateMap.values());
	if (intents.length > 0) {
		candidates = candidates.filter(candidate => {
			const docType = candidate.metadata?.type;
			return docType && intents.includes(docType);
		});
		console.log(`After type prefiltering: ${candidates.length} candidates`);
	}

	// Calculate final scores with hybrid weighting and time decay
	const ranked: QueryResult[] = candidates
		.map((candidate) => {
			const hybridScore = (W_DENSE * candidate.denseScore) + (W_SPARSE * candidate.sparseScore);
			const finalScore = applyTimeDecay(hybridScore, candidate.metadata?.date);

			return {
				id: candidate.id,
				text: candidate.text,
				source: candidate.source,
				metadata: candidate.metadata,
				score: finalScore,
				confidence: getConfidenceLevel(finalScore),
			};
		})
		.sort((a, b) => b.score - a.score)
		.slice(0, TOP_K_FINAL);

	console.log(`Final results: ${ranked.length} documents`);
	ranked.forEach((result, i) => {
		console.log(`  ${i + 1}. ${result.source} (${(result.score * 100).toFixed(1)}% - ${result.confidence})`);
	});

	return ranked;
}
