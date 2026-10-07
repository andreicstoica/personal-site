---
type: index
title: "Andrei's knowledge library"
description: "What the Ask Andrei guide knows, as a small library in the Open Knowledge Format."
---

This folder is what the Ask Andrei guide knows about Andrei. It follows the Open Knowledge Format: one markdown file per concept, the file's path is its identity, and YAML frontmatter describes it. The site reads it at build time; there is no index to rebuild.

## Folders

- `notes/`: short notes about Andrei, written to answer questions. Every note rides in the guide's prompt. A `## ` heading starts a section, and a section may open with a `resource:` line naming the page it describes.
- `posts/`: his blog posts, one file each, with the post's text unchanged. The guide lists every post in its prompt and reads one in full when a question needs it. The file name is the post's slug.
- `posts/archive/`: older newsletter texts with no public URL. The guide leaves them out, because it cannot cite them.

## Frontmatter

- `type` (required): `note`, `post`, or `index`.
- `title`: the name to show.
- `description`: one line on what the file covers, taken from the file itself.
- `resource`: the page on this site (`/canon`) or the URL (`https://blog.andrei.bio/p/...`) the file describes.
- `timestamp`: a post's publish date, `YYYY-MM-DD`.
- `tags`: a post's topics.

Each value is plain text, a JSON-quoted string, or a JSON list of strings, all valid YAML.
