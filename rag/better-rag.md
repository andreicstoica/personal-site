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

- Overlap size: 50–100 tokens
- Number of candidates: 5–7
- Weighting: start with 0.7 dense, 0.3 sparse
- Confidence thresholds: T_mid = 0.4, T_high = 0.6 (adjust after testing)
- Time-decay α: maybe 0.001 per day (or lower)
- Always test with edge-case questions (“unstated topics”) and canonical ones (“Where did Andrei work last?”)
