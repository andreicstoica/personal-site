---
type: note
title: "This guide"
description: "How the Ask Andrei guide works: what it reads, its tools, and the model behind it."
resource: /colophon
---

The "Ask Andrei" guide is a small exercise in context engineering. Instead of a search on every question, every note about him, the site map with each page's sections, and a dated list of his blog posts ride in the model's prompt, about 5,000 tokens. That prefix is the same for every visitor, so the provider serves most of it from its prompt cache, and most answers take one model call.

His notes and posts form a small library in the Open Knowledge Format: one markdown file per note or post, with frontmatter that names its type, its title, and the page or URL it describes. The site reads the library at build time, so changing what the guide knows means editing a file.

Before the model answers, the site looks for a word in the question that appears in only one or two of his posts, and puts the matching passages in the prompt. It has three tools. read_post loads a post's full text when a question needs more than its title. open_page opens a page of this site beside the chat, or scrolls the current page to a section and marks it. show_scene_controls puts buttons under a reply that change the banner's weather, time of day, and place. It runs on the Vercel AI SDK with a hosted model through the Vercel AI Gateway; the trace above each reply shows the context it loaded, its reasoning, its tool calls, and the model and token counts.

When no model is available, the guide answers from the same notes by keyword match and says why.

An earlier version ran a small model he fine-tuned on his own writing, with RAG: a hybrid BM25 and embedding search over chunks of his blog and site for each question. The Making of bot-drei (https://blog.andrei.bio/p/the-making-of-bot-drei) describes that work. He replaced it with the simpler design above because he found it answers better at this size: no chunk cuts an idea in half, and a wrong answer traces to a note he can read and fix.
