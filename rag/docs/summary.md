# LLM RAG System Architecture Summary

## The Balance Between Personality and Accuracy

Your RAG system achieves the perfect balance between personality and accuracy through **confidence-based routing** and intelligent pre-filtering.

### 1. Pre-filtering for Personality

- **Short queries** (< 10 characters) and **greetings** skip RAG entirely
- Uses higher temperature (0.6) for more personality and creativity
- Shorter responses (500 tokens) keep interactions conversational
- Maintains your voice without being constrained by retrieved context

### 2. Confidence Bands for Accuracy

The system uses three confidence levels to determine response style:

- **High confidence (≥0.6)**: Authoritative synthesis in your voice
  - Temperature: 0.3 (more focused)
  - Max tokens: 1500 (detailed responses)
  - Direct synthesis of information

- **Medium confidence (0.4-0.6)**: Quote relevant passages + contextualize
  - Temperature: 0.3 (faithful to context)
  - Max tokens: 1500 (comprehensive responses)
  - Acknowledge limitations while being helpful

- **Low confidence (<0.4)**: Acknowledge limitations, suggest related topics
  - Temperature: 0.6 (more conversational)
  - Max tokens: 500 (brief responses)
  - Honest about what you can/can't answer

### 3. Hybrid Retrieval for Precision

Your system uses sophisticated retrieval techniques:

- **Dense embeddings** (70% weight): Semantic understanding using cosine similarity
- **Sparse BM25** (30% weight): Exact keyword matching for precise hits
- **Query expansion**: Synonyms and related terms for better recall
- **Intent detection**: Routes questions to relevant content types (resume, blog, project, essay)
- **Time decay**: Favor recent content with configurable decay factor

### 4. Smart Context Management

- **Resume entries**: Kept as single documents (no chunking) for complete context
- **Projects/experience**: Larger chunks (1000 tokens) for structured portfolio data
- **Blog posts**: Chunked with heading awareness to preserve semantic boundaries
- **Metadata filtering**: Prevents irrelevant results based on content type

### 5. Key Design Principles

**Never Hallucinate**: The system either has confident context (responds authoritatively) or doesn't (responds conversationally while being honest about limitations).

**Maintain Your Voice**: High confidence responses synthesize information in your voice, while low confidence responses maintain personality without making things up.

**Progressive Disclosure**: The system provides more detail and authority as confidence increases, but always stays grounded in your actual content.

## Configuration Highlights

- **Chunking**: 500 tokens with 100 token overlap for most content
- **Retrieval**: 50 candidates, 3 final results
- **Hybrid weights**: 0.7 dense, 0.3 sparse
- **Confidence thresholds**: T_MID = 0.4, T_HIGH = 0.6
- **Time decay**: α = 0.001 per day, minimum 0.1
- **Query expansion**: Comprehensive synonym mapping for domain-specific terms

This architecture ensures that your AI guide is both helpful and honest, maintaining your personality while staying grounded in your actual content.
