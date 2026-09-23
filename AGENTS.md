# Repository Guidelines

## Project Structure & Module Organization

- `src/pages`: thin route entrypoints. Collection routes compose `CollectionPage`; others wrap `SiteLayout` and a page component.
- Layout layers: `RootLayout` (document + `ClientRouter` + idle cursor island) → `SiteLayout` (weather banner, static nav, page scroll region with footer, guide island) → `ContentDocument` (markdown page chrome).
- `src/components`: Astro owns static composition; Svelte islands own client state (`WeatherBanner`, `CursorTrail`, `ImageGallery`, `FloatingChat`). Hydrate with `client:load` / `client:idle` / `client:visible` only where interaction needs JS; `WeatherBanner` is `client:only`. `Nav.astro` and `SiteFooter.astro` are static markup, not islands.
- `src/layouts`: page shells; `src/lib`: helpers; `src/styles`: Tailwind tokens/extracted class groups.
- Content lives in `src/content`; acceptance references in `specs`; public assets in `public` (e.g., `public/images`). Never edit `dist`.
- Stay on Astro islands rather than a React/Next rewrite unless a page needs shared client state across the whole tree. Swap an island to React later without changing the layout hierarchy.

## Build, Test, and Development Commands

- `bun run lint` / `bun run check` / `bun run test` / `bun run verify`: Biome on `src/`, `astro check`, `svelte-check`, `bun test`, then production build. `verify` is the CI gate (`/.github/workflows/check.yml`).
- `bun run lint:ui`: `@shadcn/lint` via ESLint on Svelte templates and `src/**/*.ts`. No design-system rules are enabled yet; add them in `eslint.config.mjs`. This does not replace Biome.
- `bun run dev`: start Astro locally at `http://localhost:4321` with hot reload.
- `bun run build`: production build to `dist`.
- `bun run preview`: serve the built output for final verification.

Use Bun for every script. `npm run <script>` happens to execute the same commands, but it resolves dependencies against `package-lock.json` instead of `bun.lock` — which silently installs a different Biome/TypeScript and produces lint results CI will not reproduce. `package-lock.json` is gitignored for this reason.

## Coding Style & Naming Conventions

- Two-space indentation; prefer single quotes in JS/TS.
- Components in PascalCase (`WeatherBanner.svelte`, `ImageGallery.svelte`); utilities camelCase in `src/lib`.
- Keep Tailwind classes inline unless reused, then extract to `src/styles`.
- Format with `bun run lint:fix` (Biome; ignores Svelte/CSS). Types and islands are gated by `bun run check`.

## Testing Guidelines

- `bun test` runs the unit suite (`*.test.ts`, Bun's built-in runner — no extra config). It is part of `bun run verify`, so CI gates on it.
- Existing coverage: `src/lib/guide.test.ts` covers memory note parsing, route matching, guide reply/mode/action decisions, and inference config gating.
- Add co-located `*.test.ts` files next to the module under test. For UI specs, prefer `src/components/__tests__/` (Vitest/Playwright welcome) and document run steps in the PR.

## Commit & Pull Request Guidelines

- Commits: short, present tense (e.g., `feat: Add Refract project details`).
- PRs: concise description, linked issue when available, screenshots/GIFs for UI changes, and notes on content/config migrations.
- Before requesting review, run `bun run verify` and record manual checks performed.

## Configuration & Environment Tips

- Run everything through Bun; avoid destructive git commands unless explicitly requested.
- Inference provider toggles: `MODEL_PROVIDER=local` with `LOCAL_MODEL_URL=http://localhost:1234`, or `MODEL_PROVIDER=hf` with `HF_API_URL`, `HF_API_KEY`, and optional `HF_MODEL_ID`. Hugging Face is the hosted provider. The guide does not call it, or any other model, unless `GUIDE_MODEL=on`. Modal (scale-to-zero GPU, Starter is $0/month with $30 of compute credit) is a possible later alternative and is not wired. The guide's notes live in `src/content/memory`. `GET /api/health` checks configuration and does not call the model unless `?probe=1`.
- Stage large assets or acceptance docs under `public/` and `specs/` to keep diffs focused.

# User Instructions
## btca
Trigger: user says "use btca" (for codebase/docs questions).

Run:
- btca ask -t <tech> -q "<question>"

Available <tech>: svelte, tailwindcss, Effect, FastAPI, NextJS, opencode

## Cursor Cloud specific instructions

### Package manager and dependencies

- Lockfile is `bun.lock`; run **`bun install`** from the repo root (see VM update script). Do not use `npm install` — it resolves against `package.json` and writes `package-lock.json`, which drifts from `bun.lock` (e.g. a newer Biome that flags code CI never flagged). `package-lock.json` is gitignored.
- Bun may not be on `PATH` on a fresh VM. If `bun` is missing, install once: `curl -fsSL https://bun.sh/install | bash` (adds `~/.bun/bin` to `~/.bashrc`).

### Services

| Service | Command | URL |
| --- | --- | --- |
| Astro dev | `bun run dev` | http://localhost:4321 |
| Production preview | `bun run build` then `bun run preview` | http://localhost:4321 |
| Local LLM (optional, for model replies) | LM Studio or compatible OpenAI API | http://localhost:1234 (`MODEL_PROVIDER=local`) |
| Hugging Face (hosted guide) | Inference endpoint | `MODEL_PROVIDER=hf` |

Only the Astro dev server is required for browsing the portfolio, project pages, and static content. The floating guide answers from `src/content/memory` when no model is reachable. Full model replies need a running inference endpoint (`MODEL_PROVIDER=local` or `MODEL_PROVIDER=hf`). `GET /api/health` returns **503** when the selected provider is missing configuration. It does not call the model unless `?probe=1` is set.

### Lint / format / build

- Lint: `bun run lint` (Biome on `src/`; Svelte/CSS excluded). Typecheck: `bun run check` (`astro check` + `svelte-check`). Tests: `bun test`. Full gate: `bun run verify`.
- Production build: `bun run build` (also runs at the end of `verify`).

### RAG index (content changes only)

- Rebuild indexes after editing `rag/data/`: `bun run rag:build` or `bun run rag:rebuild`. Not needed for normal UI work when committed indexes are present.

### Dev server process

- Use a persistent session (e.g. tmux) for `bun run dev`; it does not exit on its own. Hot reload may not pick up all dependency installs—restart dev if packages change.
