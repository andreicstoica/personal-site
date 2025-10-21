# LLM RAG System Flow Diagram

```mermaid
graph TD
    A[User Question] --> B{Pre-filter Heuristics}
    B -->|Short Query < 10 chars| C[Skip RAG]
    B -->|Greeting Pattern| C
    B -->|Substantive Question| D[RAG Pipeline]

    C --> E[Conversational Response]
    E --> F[Temperature: 0.6<br/>Max Tokens: 500<br/>Personality-focused]

    D --> G[Query Expansion]
    G --> H[Intent Detection]
    H --> I[Hybrid Retrieval]

    I --> J[Dense Search<br/>Cosine Similarity<br/>Weight: 70%]
    I --> K[Sparse Search<br/>BM25 Keywords<br/>Weight: 30%]

    J --> L[Merge & Rerank]
    K --> L

    L --> M[Time Decay Factor]
    M --> N[Intent Weighting]
    N --> O{Confidence Check}

    O -->|Score >= 0.4| P[Use RAG Context]
    O -->|Score < 0.4| Q[Skip RAG]

    P --> R{High Confidence?}
    R -->|Score >= 0.6| S[Authoritative Response<br/>Temperature: 0.3<br/>Max Tokens: 1500<br/>Direct synthesis]
    R -->|Score 0.4-0.6| T[Moderate Response<br/>Temperature: 0.3<br/>Max Tokens: 1500<br/>Quote + contextualize]

    Q --> U[Conversational Fallback<br/>Temperature: 0.6<br/>Max Tokens: 500]

    S --> V[Response with Sources]
    T --> V
    U --> W[Response without Sources]
```

## Flow Explanation

### Pre-filtering Stage

- **Short queries** and **greetings** bypass RAG entirely for immediate personality
- **Substantive questions** enter the full RAG pipeline

### RAG Pipeline

1. **Query Expansion**: Add synonyms and related terms
2. **Intent Detection**: Identify question type (resume, blog, project, essay)
3. **Hybrid Retrieval**: Combine dense embeddings (70%) with sparse BM25 (30%)
4. **Merge & Rerank**: Combine results with time decay and intent weighting
5. **Confidence Check**: Determine if retrieved context is sufficient

### Response Generation

- **High confidence (≥0.6)**: Authoritative synthesis with citations
- **Medium confidence (0.4-0.6)**: Quote relevant passages with context
- **Low confidence (<0.4)**: Conversational fallback without sources

### Key Features

- **Never hallucinates**: Only uses retrieved context or acknowledges limitations
- **Maintains personality**: Higher temperature for conversational responses
- **Ensures accuracy**: Lower temperature when using retrieved context
- **Progressive disclosure**: More detail as confidence increases
