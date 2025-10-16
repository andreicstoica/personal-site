import fs from "fs";
import path from "path";
import { buildEmbeddings } from "./embed.js";
import MiniSearch from "minisearch";

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

let keywordIndex: MiniSearch | null = null;

function loadKeywordIndex(): MiniSearch {
    if (!keywordIndex) {
        try {
            const keywordPath = path.resolve("./rag/keyword-index.json");
            console.log('Loading keyword index from:', keywordPath);
            const keywordData = JSON.parse(fs.readFileSync(keywordPath, "utf8"));
            console.log('Keyword data loaded, loading MiniSearch from JSON...');

            // Load the MiniSearch instance from the saved JSON
            keywordIndex = MiniSearch.loadJSON(JSON.stringify(keywordData), {
                fields: ['text', 'source'],
                storeFields: ['id', 'text', 'source'],
                searchOptions: {
                    boost: { text: 2, source: 1 },
                    fuzzy: 0.2,
                    prefix: true
                }
            });

            console.log('MiniSearch instance loaded successfully');
        } catch (error) {
            console.error('Error loading keyword index:', error);
            throw error;
        }
    }
    return keywordIndex;
}

export async function queryRag(question: string): Promise<QueryResult[]> {
    const embeddingPath = path.resolve("./rag/index.json");
    const embeddingIndex: Document[] = JSON.parse(fs.readFileSync(embeddingPath, "utf8"));
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

    // Hybrid retrieval: BM25 first-pass + embedding reranking
    const keywordSearch = loadKeywordIndex();
    const keywordResults = keywordSearch.search(question, {
        boost: { text: 2, source: 1 }
    }).slice(0, 50);

    console.log(`BM25 found ${keywordResults.length} candidates`);

    // If keyword search found good results, rerank with embeddings
    if (keywordResults.length > 0) {
        const candidateIds = new Set(keywordResults.map((r: any) => r.id));
        const candidates = embeddingIndex.filter(doc => candidateIds.has(doc.id));

        const ranked: QueryResult[] = candidates
            .map((doc: Document) => ({
                id: doc.id,
                text: doc.text,
                source: doc.source,
                score: cosine(queryEmbed, doc.embedding),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        console.log(`Hybrid retrieval: ${ranked.length} results`);
        return ranked;
    }

    // Fallback to pure embedding search if keyword search failed
    console.log("Falling back to pure embedding search");
    const ranked: QueryResult[] = embeddingIndex
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