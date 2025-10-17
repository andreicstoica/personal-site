# Andrei-Style RAG Improvement Guide

This document outlines a comprehensive approach to improving your RAG (Retrieval Augmented Generation) system tailored to your personal site (blogs, resume, writings). Use this as a context prompt or spec for Codex, LLMs, or your pipeline.

## 1. Data Schema & Chunking Strategy

### 🎯 Document Record Structure

Each document (blog, resume entry, project, etc.) should have structured metadata + content. Example:

```json
{
  "id": "blog-2024-08-15-ai-ethics",
  "type": "blog",
  "title": "The Ethics of AI in Everyday Tools",
  "date": "2024-08-15",
  "tags": ["AI", "ethics", "tools"],
  "summary": "I reflect on how AI can mediate everyday tools ethically ...",
  "content": "Full blog text …"
}
```

For resume entries:

```
{
  "id": "resume-job-5",
  "type": "resume_entry",
  "company": "InnoTech LLC",
  "role": "Lead Designer",
  "start_date": "2023-02",
  "end_date": "2025-06",
  "description": "Oversaw product design, strategy, published on topics such as X, Y."
}
```

You may also include “project”, “essay”, or “talk” types similarly.

### Chunking / Segmentation

- Split by **semantic boundaries** (paragraphs, logical sections) rather than fixed token lengths.
- Add **small overlap** (e.g. 50–100 tokens) between adjacent chunks to preserve continuity.
- Retain metadata in each chunk (title, date, type, parent id).
- Optionally include a **“heading path”** field (e.g. section hierarchy) in metadata to help contextual relevance.

## 2. Metadata & Enrichment

Embedding metadata is key to controlling and filtering retrieval.

- type (blog, resume, project, talk, etc.)
- date or start_date / end_date
- tags or topics
- title, summary
- For resume entries: company, role, description
  This lets you later filter or bias retrieval (e.g. only resume entries for “where did Andrei work?”)

## 3. Retrieval Strategy: Hybrid + Re-ranking

### a. Dense + Sparse Dual Retrieval

- Use **dense (vector)** embeddings for semantic relevance.
- Use **sparse** (e.g. BM25, keyword search) for exact matching / lexical hits.
- Retrieve top-K from both, then **merge & re-rank** by a weighted combination:

```
merged_score = w_dense * score_dense + w_sparse * score_sparse
```

- You can tune weights (e.g. 0.7 dense, 0.3 sparse) depending on quality.

### b. Query Expansion

When user asks a question, expand it with synonyms or related phrases:

- E.g. “latest job, current role, past employment” for “where did Andrei work last?”
- Use simple thesaurus or embedding-based nearest words.

### Time Decay / Recency Bias

For content types that age (blogs), you can favor recent ones:

```
age_days = (today_date – doc_date)
decay_factor = max(0, 1 − α * age_days)
final_score = merged_score * decay_factor
```

Pick a small α (e.g. 0.001) so recency nudges results, not dominates.

### d. Metadata Filtering / Pre-filtering

If question clearly implies a type:

- “Where did Andrei work last?” → filter to type = resume_entry
- “What did Andrei write recently about X?” → type = blog, optionally filter by tags
  Filtering helps avoid irrelevant chunks.

## 4. Confidence / Answer Style Logic

Define threshold bands for how the system should respond:
|**Confidence Score**|**Response Style**|
|---|---|
|> T_high (e.g. 0.6)|Confident answer in your voice, possibly synthesizing opinion|
|between T_mid and T_high (e.g. 0.4–0.6)|Quote relevant passages + contextualize|
|< T_mid|Say “I don’t have enough info” / suggest related content or encourage user to ask more|

Behavior guidelines:

- Never assert things outside your corpus.
- Use first person (“I”) only when confident and grounded in retrieved text.
- Provide citations / mention metadata: e.g. “In the 2024 blog _Ethics of AI in Everyday Tools_, I wrote …”
- In moderate confidence, you can hedge: “Here’s what seems plausible based on my writings…”

## 5. Tips, Hyperparameters & Tuning

### Current Configuration (rag/lib/constants.ts)

- **Chunking**: 500 tokens with 100 token overlap
- **Retrieval**: 50 candidates, 3 final results
- **Hybrid weights**: 0.7 dense, 0.3 sparse
- **Confidence bands**: T_MID = 0.4, T_HIGH = 0.6
- **Time decay**: α = 0.001 per day, min 0.1
- **Cache**: SHA-1 based embedding cache with 6 concurrent workers

### Tuning Knobs

1. **Weights** (`W_DENSE`, `W_SPARSE`): Adjust dense vs sparse balance
2. **Thresholds** (`T_MID`, `T_HIGH`): Control response confidence bands
3. **Chunk size** (`CHUNK_SIZE`, `CHUNK_OVERLAP`): Balance context vs precision
4. **Time decay** (`TIME_DECAY_ALPHA`): Favor recent content
5. **Query expansion** (`QUERY_SYNONYMS`): Add domain-specific synonyms

### Evaluation & Testing

```bash
# Rebuild index with new settings
npm run rag:rebuild

# Run evaluation suite
npm run rag:eval

# Check specific queries
npm run rag:build && node -e "
import { queryRag } from './rag/lib/query.js';
queryRag('Where did Andrei work last?').then(console.log);
"
```

### Performance Targets

- Build time: < 2 minutes with cache
- Query latency: < 150ms after warm
- Coverage: > 80% for expected documents
- Type accuracy: > 90% for intent detection
