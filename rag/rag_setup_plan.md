# Setting up a simple RAG pipeline for your Astro site

This document outlines how you can set up a basic retrieval-augmented generation (RAG) pipeline to augment your fine-tuned Qwen model with content from your personal site, blog posts, resume and LinkedIn.  
The goal is to keep things simple so you can test everything locally before thinking about deployment.

---

## 🧭 Directory layout

Within your Astro project you’ve already created a `rag/` folder. You’ll add:
rag/
├── data/
│ ├── personal_bio.txt
│ ├── blog_posts/
│ └── linkedin.txt
├── lib/
│ ├── embed.ts
│ └── query.ts
├── build-index.ts
├── index.json
└── rag_setup_plan.md ← this file

---

## 🧱 Step 1. Collect content

Put plain-text or markdown copies of your content inside `rag/data/`.  
Examples:

- `personal_bio.txt` — short “about” section, facts like “Andrei lives in NYC…”
- `linkedin.txt` — copy your summary, experience, skills.
- `blog_posts/` — export `.md` or `.txt` versions of your posts.

Try to keep each file under ~10 KB and use readable text (no HTML).

---

## ⚙️ Step 2. Install dependencies

In your Astro project root:

```bash
npm install openai js-tiktoken
```
