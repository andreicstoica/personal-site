# Repository Guidelines

## Project Structure & Module Organization

- `src/pages`: thin route entrypoints. Collection routes compose `CollectionPage`; others wrap `SiteLayout` and a page component.
- Layout layers: `RootLayout` (document + idle cursor island) → `SiteLayout` (nav island + scroll) → `ContentDocument` (markdown page chrome).
- `src/components`: Astro owns static composition; Svelte islands own client state (`Nav`, `CursorTrail`, `AsciiCanvas`, `ImageGallery`, `FullPageChat`). Hydrate with `client:load` / `client:idle` / `client:visible` only where interaction needs JS.
- `src/layouts`: page shells; `src/lib`: helpers; `src/styles`: Tailwind tokens/extracted class groups.
- Content lives in `src/content`; acceptance references in `specs`; public assets in `public` (e.g., `public/images`). Never edit `dist`.
- Stay on Astro islands rather than a React/Next rewrite unless a page needs shared client state across the whole tree. Swap an island to React later without changing the layout hierarchy.

## Build, Test, and Development Commands

- `npm install` or `bun install`: sync dependencies (respect existing lockfile).
- `npm run dev`: start Astro locally at `http://localhost:4321` with hot reload.
- `npm run build`: production build to `dist`.
- `npm run preview`: serve the built output for final verification.

## Coding Style & Naming Conventions

- Two-space indentation; prefer single quotes in JS/TS.
- Components in PascalCase (`AsciiHero.astro`, `ImageGallery.svelte`); utilities camelCase in `src/lib`.
- Keep Tailwind classes inline unless reused, then extract to `src/styles`.
- Format with `npx biome format --write src/` (ignores Svelte files).

## Testing Guidelines

- Automated tests are not yet wired; manually verify navigation, data rendering, and media islands against `specs`.
- If adding tests, place UI specs under `src/components/__tests__/` (Vitest/Playwright welcome) and document run steps in the PR.

## Commit & Pull Request Guidelines

- Commits: short, present tense (e.g., `feat: Add Refract project details`).
- PRs: concise description, linked issue when available, screenshots/GIFs for UI changes, and notes on content/config migrations.
- Before requesting review, run `npm run build` and record manual checks performed.

## Configuration & Environment Tips

- Target Node.js via npm or Bun; avoid destructive git commands unless explicitly requested.
- Inference provider toggles: `MODEL_PROVIDER=local` with `LOCAL_MODEL_URL=http://localhost:1234`, or `MODEL_PROVIDER=hf` with `HF_API_URL`, `HF_API_KEY`, and optional `HF_MODEL_ID`.
- Stage large assets or acceptance docs under `public/` and `specs/` to keep diffs focused.

# User Instructions
## btca
Trigger: user says "use btca" (for codebase/docs questions).

Run:
- btca ask -t <tech> -q "<question>"

Available <tech>: svelte, tailwindcss, Effect, FastAPI, NextJS, opencode

## Cursor Cloud specific instructions

### Package manager and dependencies

- Lockfile is `bun.lock`; run **`bun install`** from the repo root (see VM update script). **`npm install`** also works against `package.json` but does not use the Bun lockfile.
- Bun may not be on `PATH` on a fresh VM. If `bun` is missing, install once: `curl -fsSL https://bun.sh/install | bash` (adds `~/.bun/bin` to `~/.bashrc`).

### Services

| Service | Command | URL |
| --- | --- | --- |
| Astro dev | `bun run dev` (or `npm run dev`) | http://localhost:4321 |
| Production preview | `bun run build` then `bun run preview` | http://localhost:4321 |
| Local LLM (optional, for chat E2E) | LM Studio or compatible OpenAI API | http://localhost:1234 (`MODEL_PROVIDER=local`) |

Only the Astro dev server is required for browsing the portfolio, project pages, and static content. Full **chat** E2E needs a running inference endpoint (`MODEL_PROVIDER=local` + LM Studio, or `MODEL_PROVIDER=hf` with HF env vars). `GET /api/health` returns **503** when inference is down; that is expected without a local model.

### Lint / format / build

- Lint/format (Biome): `bunx biome check src/` or `npx biome format --write src/` (Svelte/CSS excluded per `biome.json`).
- Production build: `bun run build` (required before PRs per repo guidelines).
- No automated test script yet; manual checks against `specs/` as documented above.

### RAG index (content changes only)

- Rebuild indexes after editing `rag/data/`: `bun run rag:build` or `bun run rag:rebuild`. Not needed for normal UI work when committed indexes are present.

### Dev server process

- Use a persistent session (e.g. tmux) for `bun run dev`; it does not exit on its own. Hot reload may not pick up all dependency installs—restart dev if packages change.
