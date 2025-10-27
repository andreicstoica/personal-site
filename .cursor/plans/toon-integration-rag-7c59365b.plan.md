<!-- 7c59365b-7692-42af-a96f-bbc393b02e98 ef1a3ff4-06b9-4d5f-b1f3-afe3ab8a9c30 -->
# Integrate TOON for RAG Token Reduction

## Overview

Add TOON encoding to reduce token costs when sending retrieved documents to LLMs. We'll encode chunks at retrieval time (after search but before sending to LLM), keeping original full-text for embeddings and keyword search quality.

## Implementation Steps

### 1. Install TOON Package

Add `@byjohann/toon` as a dependency:

```bash
npm install @byjohann/toon
```

### 2. Create TOON Utility Module

Create `rag/lib/toon-formatter.ts` to handle encoding logic:

**Key functions:**

- `shouldUseToon(metadata)` - Determine if document benefits from TOON (structured content like projects, experience, resume)
- `encodeForLLM(text, metadata)` - Encode text with appropriate TOON options
- `formatForPrompt(results)` - Convert query results to TOON where beneficial

**TOON options to use:**

- Default delimiter (`,`) for most content
- `lengthMarker: '#'` to help LLM track array sizes
- `indent: 2` to match your code style

### 3. Update Chat API Endpoint

Modify `src/pages/api/chat.ts` to use TOON encoding:

**Changes:**

- Import `formatForPrompt` from toon-formatter
- After retrieving documents via `queryRag()`, encode them before sending to LLM
- Add context size comparison logging (original vs TOON) to measure savings
- Wrap TOON-encoded content in code blocks with "toon" language hint

### 4. Update Query Module (Optional Enhancement)

Optionally modify `rag/lib/query.ts` to include encoding metadata:

**Changes:**

- Add `toonEncoded: boolean` flag to QueryResult interface
- Track which results were encoded for debugging

### 5. Add TOON Prompt Instructions

Update system prompt in chat API to explain TOON format:

````
When context is provided in TOON format (marked with ```toon), note:
- Arrays show length: items[3] means 3 items
- Tabular data uses headers: items[2]{name,value}: shows 2 rows with name/value fields
- Values are inline without repeated keys
````

## Files to Modify

- `package.json` - Add @byjohann/toon dependency
- `rag/lib/toon-formatter.ts` - **NEW FILE** - Core TOON encoding logic
- `src/pages/api/chat.ts` - Apply TOON to retrieved chunks before LLM
- Optional: `rag/lib/query.ts` - Add encoding metadata to results

## Benefits

- **30-50% token reduction** for structured content (projects, experience, resume)
- **Preserves search quality** - embeddings and keyword search use full text
- **No data migration** - existing .txt files unchanged
- **Minimal latency** - TOON encoding is fast (<1ms per chunk)
- **Reversible** - Can toggle on/off via feature flag

## Testing Strategy

1. Compare token counts before/after for typical queries
2. Verify LLM still understands encoded content correctly
3. Check that search quality is unaffected
4. Test with different document types (blog vs projects vs resume)

### To-dos

- [ ] Install @byjohann/toon npm package
- [ ] Create rag/lib/toon-formatter.ts with encoding logic and document type detection
- [ ] Modify src/pages/api/chat.ts to encode retrieved chunks with TOON before sending to LLM
- [ ] Update system prompt in chat API to explain TOON format to LLM
- [ ] Test with real queries and measure token reduction percentage