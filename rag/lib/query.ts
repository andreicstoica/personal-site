import fs from "fs";
import MiniSearch from "minisearch";
import path from "path";
import { buildEmbeddings } from "./embed.js";
import {
	RELEVANCE_THRESHOLD,
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

interface ScoreDetails {
	rawDense: number;
	dense: number;
	rawSparse: number;
	sparse: number;
	weightedDense: number;
	weightedSparse: number;
	intentWeight: number;
	timeDecayFactor: number;
	hybrid: number;
}

interface QueryResult {
	id: string;
	text: string;
	source: string;
	score: number;
	metadata?: any;
	confidence?: 'high' | 'medium' | 'low';
	scoreDetails?: ScoreDetails;
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

// Compute decay factor for dated content
function getTimeDecayFactor(date?: string): number {
	if (!date) return 1;

	try {
		const docDate = new Date(date);
		if (Number.isNaN(docDate.getTime())) return 1;

		const now = new Date();
		const ageDays = (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24);

		return Math.max(MIN_DECAY_FACTOR, 1 - (TIME_DECAY_ALPHA * ageDays));
	} catch {
		return 1;
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
			const ai = a[i] ?? 0;
			const bi = b[i] ?? 0;
			dot += ai * bi;
			normA += ai * ai;
			normB += bi * bi;
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

	const candidates = Array.from(candidateMap.values());
	if (candidates.length === 0) {
		console.log("No candidates available after merging.");
		return [];
	}

	const intentSet = new Set(intents);
	const hasIntents = intentSet.size > 0;

	// Normalize scores before weighting
	const normalizedDense = new Map<string, number>();
	const normalizedSparse = new Map<string, number>();

	const remappedDense = candidates.map((candidate) =>
		Math.max(0, (candidate.denseScore + 1) / 2)
	);
	const rawDenseMax = remappedDense.length > 0 ? Math.max(...candidates.map((candidate) => candidate.denseScore)) : 0;
	const maxDense = remappedDense.length > 0 ? Math.max(...remappedDense) : 0;

	const sparseScores = candidates.map((candidate) => Math.max(0, candidate.sparseScore));
	const maxSparseRaw = sparseScores.length > 0 ? Math.max(...sparseScores) : 0;

	candidates.forEach((candidate, index) => {
		const denseValue = remappedDense[index] ?? 0;
		const sparseValue = sparseScores[index] ?? 0;
		normalizedDense.set(candidate.id, denseValue);

		const normalizedSparseValue = 1 - Math.exp(-sparseValue / 10);
		normalizedSparse.set(candidate.id, normalizedSparseValue);
	});

	console.log("Score normalization:");
	console.log(`  Max dense (raw cosine): ${rawDenseMax.toFixed(3)}`);
	console.log(`  Max dense (remapped to 0-1): ${maxDense.toFixed(3)}`);
	console.log(`  Max sparse (raw BM25): ${maxSparseRaw.toFixed(3)}`);

	// Calculate final scores with hybrid weighting and time decay
	const ranked: QueryResult[] = candidates
		.map((candidate) => {
			const denseComponent = normalizedDense.get(candidate.id) ?? 0;
			const sparseComponent = normalizedSparse.get(candidate.id) ?? 0;
			const weightedDense = W_DENSE * denseComponent;
			const weightedSparse = W_SPARSE * sparseComponent;
			const hybridScore = weightedDense + weightedSparse;

			const docType = candidate.metadata?.type;
			const intentWeight = hasIntents
				? (docType && intentSet.has(docType) ? 1 : 0.6)
				: 1;

			const boostedScore = hybridScore * intentWeight;
			const timeDecayFactor = getTimeDecayFactor(candidate.metadata?.date);
			const finalScore = boostedScore * timeDecayFactor;

			return {
				id: candidate.id,
				text: candidate.text,
				source: candidate.source,
				metadata: candidate.metadata,
				score: finalScore,
				confidence: getConfidenceLevel(finalScore),
				scoreDetails: {
					rawDense: candidate.denseScore,
					dense: denseComponent,
					rawSparse: Math.max(0, candidate.sparseScore),
					sparse: sparseComponent,
					weightedDense,
					weightedSparse,
					intentWeight,
					timeDecayFactor,
					hybrid: hybridScore,
				},
			};
		})
		.filter((result) => {
			const passes = result.score >= RELEVANCE_THRESHOLD;
			if (!passes) {
				console.log(`  Dropping ${result.source} below threshold (${(result.score * 100).toFixed(1)}% < ${(RELEVANCE_THRESHOLD * 100).toFixed(1)}%)`);
			}
			return passes;
		})
		.sort((a, b) => b.score - a.score)
		.slice(0, TOP_K_FINAL);

	console.log(`Final results: ${ranked.length} documents`);
	ranked.forEach((result, i) => {
		console.log(`  ${i + 1}. ${result.source} (${(result.score * 100).toFixed(1)}% - ${result.confidence})`);
	});

	if (ranked.length > 0) {
		console.log("Top score breakdown:");
		ranked.slice(0, Math.min(5, ranked.length)).forEach((result, i) => {
			const details = result.scoreDetails;
			if (!details) return;
			console.log(
				`  [${i + 1}] rawDense=${details.rawDense.toFixed(3)}, dense=${details.dense.toFixed(3)}, ` +
				`rawSparse=${details.rawSparse.toFixed(3)}, sparse=${details.sparse.toFixed(3)}, ` +
				`weighted=(${details.weightedDense.toFixed(3)} + ${details.weightedSparse.toFixed(3)}), ` +
				`intent×${details.intentWeight.toFixed(2)}, decay×${details.timeDecayFactor.toFixed(2)}`
			);
		});
	}

	return ranked;
}
