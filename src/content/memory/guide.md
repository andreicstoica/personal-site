---
id: guide
title: This guide
route: /colophon
---

The "Ask Andrei" guide is a small exercise in context engineering. Instead of a search step, every note about him, the site map with each page's sections, and a dated list of his blog posts ride in the model's prompt, about 5,000 tokens. That prefix is the same for every visitor, so the provider serves most of it from its prompt cache, and most answers take one model call.

It has two tools. read_post loads a post's full text when a question needs more than its title. open_page opens a page of this site beside the chat, or scrolls the current page to a section and marks it. It runs on the Vercel AI SDK with a hosted model through the Vercel AI Gateway; the trace above each reply shows the context it loaded, its reasoning, its tool calls, and the model and token counts.

When no model is available, the guide answers from the same notes by keyword match and says why. An earlier version ran a small model he fine-tuned on his own writing; The Making of bot-drei (https://blog.andrei.bio/p/the-making-of-bot-drei) describes that work.
