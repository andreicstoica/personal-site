How the router works (concept) 1. Cheap prefilter (optional): quick heuristics (length, greetings) to skip obvious chit-chat. 2. Router call: Ask your local model a yes/no question—“Should I search my docs for this?”—with a short system prompt and a couple examples. 3. Decision:
• If YES → run your hybrid search (BM25 → embedding rerank), inject context.
• If NO → skip RAG, answer concisely from the base model. 4. Fail-safe: If the router returns something unexpected, default to NO (no RAG). 5. Telemetry: Log routerDecision, topCosine, usedRag, and sources to tune thresholds. 6. User override: If the query starts with search: or contains a 🔎 emoji, force YES; if it includes no context, force NO.

What to change (drop-in steps, no code) 1. Create a tiny router prompt
• System: “You are a classifier. Answer only YES or NO.”
• User: include the raw user message plus guidance like “Use YES for queries about Andrei/site/blog/resume/projects; NO for greetings or general chit-chat.”
• Add 3–5 short examples (hi/what’s up → NO; “Where did Andrei work?” → YES). 2. Call the router before retrieval
• Place this right after your basic heuristics (length/greetings) and before queryHybrid.
• Use the same LM Studio endpoint (fast, single-turn chat completion). 3. Normalize and validate
• Uppercase and trim the router’s text; accept only “YES” or “NO”.
• If anything else, treat it as NO. 4. Respect user overrides
• If the query contains search:/🔎, set decision to YES without asking the router.
• If it contains no context, set NO. 5. Short-circuit the pipeline
• If NO → build messages without [Context] and send to the model.
• If YES → run queryHybrid, check top cosine vs your threshold, and only inject context if the score passes. 6. Return metadata
• Include { usedRag, routerDecision, sources } in your API response so the UI can badge “RAG on/off” and you can debug. 7. Tune
• Start with your cosine threshold around 0.30 and adjust based on logs.
• If the router says YES too often, tighten examples or add a keyword list (andrei/resume/blog/portfolio/site/project/company/school).
