// RAG system constants
export const RELEVANCE_THRESHOLD = 0.2; // Cosine similarity threshold for RAG activation

// Retrieval configuration
export const TOP_K_CANDIDATES = 50; // Initial candidates from each retrieval method
export const TOP_K_FINAL = 3; // Final results returned to user
export const CHUNK_SIZE = 500; // Target chunk size in tokens
export const CHUNK_OVERLAP = 100; // Overlap between chunks in tokens

// Hybrid retrieval weights
export const W_DENSE = 0.7; // Weight for dense (embedding) scores
export const W_SPARSE = 0.3; // Weight for sparse (BM25) scores

// Confidence thresholds for response bands
export const T_MID = 0.4; // Below this: skip RAG, respond conversationally
export const T_HIGH = 0.6; // Above this: confident synthesis with citations

// Time decay for dated content
export const TIME_DECAY_ALPHA = 0.001; // Decay factor per day
export const MIN_DECAY_FACTOR = 0.1; // Minimum decay factor

// Cache and file paths
export const CACHE_DIR = "./rag/.cache";
export const EMBEDDING_CACHE_FILE = "./rag/.cache/embeddings.json";
export const INDEX_FILE = "./rag/index.json";
export const KEYWORD_INDEX_FILE = "./rag/keyword-index.json";

// Query expansion synonyms
export const QUERY_SYNONYMS: Record<string, string[]> = {
    "work": ["job", "employment", "career", "experience"],
    "project": ["build", "created", "developed", "built"],
    "recent": ["latest", "current", "newest", "last"],
    "company": ["organization", "firm", "employer"],
    "role": ["position", "title", "job"],
    "learned": ["studied", "gained", "acquired", "mastered"],
    "technology": ["tech", "tools", "framework", "language"],
    "experience": ["background", "history", "past"],

    // New portfolio terms
    "projects": ["portfolio", "work", "apps", "applications", "built"],
    "freelance": ["contractor", "independent", "consulting"],
    "built": ["created", "developed", "made", "engineered"],

    // New tech stack synonyms
    "nextjs": ["next.js", "next", "react framework"],
    "react": ["reactjs", "react.js"],
    "typescript": ["ts", "typed javascript"],
    "nodejs": ["node.js", "node"],
    "postgres": ["postgresql", "pg"],
    "mobile": ["ios", "android", "app", "native"],
    "ai": ["artificial intelligence", "machine learning", "llm", "gpt"],
    "fullstack": ["full-stack", "full stack", "frontend and backend"]
};
