# Repository Guidelines

## Project Structure & Module Organization

- `src/pages`: thin route entrypoints. Collection routes compose `CollectionPage`; others wrap `SiteLayout` and a page component.
- Layout layers: `RootLayout` (document + `ClientRouter` + idle cursor island) → `SiteLayout` (weather banner, static nav, page scroll region with footer, guide island) → `ContentDocument` (markdown page chrome).
- `src/components`: Astro owns static composition; Svelte islands own client state (`WeatherBanner`, `CursorTrail`, `ImageGallery`, `FloatingChat`). Hydrate with `client:load` / `client:idle` / `client:visible` only where interaction needs JS; `WeatherBanner` is `client:only`, sits in a static `.banner-frame` that starts collapsed and slides open once, pushing the page down, after the first frame and the weather lookup settle (1.2 s cap; a cached reading opens at once). `SiteLayout` owns the open attribute and the slide; later `ClientRouter` pages open without replaying it. The weather lab is dev-only and toggles from the chat launcher's context menu. Its WebGL terrain layers use a shared 30-second sine oscillation (back ±0.75, middle ±1.5, front ±3 logical pixels; Mount Hood at 35% so its orchard gust leads) in a wider clamped atlas with no wrapping, pause off-screen or in hidden tabs, and hold centered time zero for reduced motion. Place-specific material motion updates bounded atlas regions at 24 samples per elapsed second and shares the same pause, seek, and time-zero rules. Moving patches repaint their underlying material, and visible loop resets use smooth fades or off-screen reversals. Smith Rock has unequal ochre towers, a separate Monkey Face pillar, and low shrubs beside a riverbank trail. The dense Mount Hood orchard is centered on its lanes, with 14, 10, and 8 trees from back to front so each depth spans the front row's width, seeded spacing jitter, per-tree gust phase and rate, and seeded gusts (one per 12-second slot, each with its own start, length, strength, sway rate, and flutter, about one slot in six calm) that travel across the rows and reverse their lead over time, with a downwind lean, depth-based amplitude (front crowns up to about 1.2 logical pixels at peak), crowns carried as one mass on planted trunks, layered canopy motion, and clustered apples. Painted Hills has a hazy back range over contour-following banded strata with downhill rills and a straw foreground. Horizontal rivers have rock-local rapids flowing left to right; coastal waves advance toward shore. The night moon has a stepped disc and dark maria. Night stars scatter on golden-ratio offsets inside a coarse two-pixel lattice, with varied sizes and gentle twinkle. Final composite colors use 24-level screen-space Bayer quantization with 2 CSS-pixel cells. Weather states are clear, cloudy, rainy, and fog. Rain is fully overcast: gray billowed cloud with no blue gaps, sun, moon, or stars; cloudy keeps gaps. Rain excludes birds. Day and golden-hour storms dim the lit scene about 20 to 25% with a slight cool desaturation, shadows least, so a strike has contrast; night is not dimmed. Lightning lifts the scene above that baseline with a cool palette flash and a fractal bolt with a white-hot core, with a halo and bloom that follow the bolt path and pulse. Every strike lasts 253 ms: full brightness on the first frame, a 12 ms hold, then a steep exponential decay to exactly zero with one or two return-stroke flickers; the scene lift falls with the square of the pulse. About one in seven strikes is a double: the first channel keeps a dim, fast afterglow, and 0.45 to 0.75 s after the first strike, a blue strike at half to two thirds brightness branches off that channel at vertex 3 to 5 of 10 on a new path to a new ground point. Only the afterglow overlaps the second strike; the two bright flashes never overlap. Lighting states are day, golden hour, and night. Dark-mode night lifts sky and land light (1.35 in place of 0.88) so the banner is not a dark hole in the lighter dark page; light-mode night is unchanged. WebGL failure uses a still CPU plate. `Nav.astro` and `SiteFooter.astro` are static markup, not islands.
- `src/layouts`: page shells; `src/lib`: helpers; `src/styles`: Tailwind tokens/extracted class groups.
- Content lives in `src/content`; the guide's blog posts live in `rag/data` (a `.txt` body and a `.json` metadata file per post), read at build time with no index to rebuild; acceptance references in `specs`; public assets in `public` (e.g., `public/images`). Never edit `dist`.
- Stay on Astro islands rather than a React/Next rewrite unless a page needs shared client state across the whole tree. Swap an island to React later without changing the layout hierarchy.

## Build, Test, and Development Commands

- `bun run lint` / `bun run check` / `bun run test` / `bun run verify`: Biome on `src/`, `astro check`, `svelte-check`, `bun test`, then production build. `verify` is the CI gate (`/.github/workflows/check.yml`).
- `bun run lint:ui`: `@shadcn/lint` via ESLint on Svelte templates and `src/**/*.ts`. No design-system rules are enabled yet; add them in `eslint.config.mjs`. This does not replace Biome.
- `bun run dev`: start Astro locally at `http://localhost:4321` with hot reload.
- `bun run build`: production build to `dist`.
- `bun run preview`: serve the built output for final verification.
- Lapse (motion inspector) mounts in `bun run dev` only. `@aiforui/lapse` is an optional dependency from a private registry (`.npmrc`), so installs without the token in `~/.npmrc` skip it, and CI and Vercel stay green. Keep it optional.

Use Bun for every script. `npm run <script>` happens to execute the same commands, but it resolves dependencies against `package-lock.json` instead of `bun.lock` — which silently installs a different Biome/TypeScript and produces lint results CI will not reproduce. `package-lock.json` is gitignored for this reason.

## Coding Style & Naming Conventions

- Two-space indentation; prefer single quotes in JS/TS.
- Components in PascalCase (`WeatherBanner.svelte`, `ImageGallery.svelte`); utilities camelCase in `src/lib`.
- Keep Tailwind classes inline unless reused, then extract to `src/styles`.
- Format with `bun run lint:fix` (Biome; ignores Svelte/CSS). Types and islands are gated by `bun run check`.

## Testing Guidelines

- `bun test` runs the unit suite (`*.test.ts`, Bun's built-in runner — no extra config). It is part of `bun run verify`, so CI gates on it.
- Existing coverage: `src/lib/guide.test.ts` covers memory note parsing, route matching, guide reply/mode/action decisions, and inference config gating. `src/lib/weather/scene.test.ts` covers golden-hour boundaries, terrain ground coverage, and CPU fallback lighting.
- Add co-located `*.test.ts` files next to the module under test. For UI specs, prefer `src/components/__tests__/` (Vitest/Playwright welcome) and document run steps in the PR.

## Commit & Pull Request Guidelines

- Commits: short, present tense (e.g., `feat: Add Refract project details`).
- PRs: concise description, linked issue when available, screenshots/GIFs for UI changes, and notes on content/config migrations.
- Before requesting review, run `bun run verify` and record manual checks performed.

## Configuration & Environment Tips

- Run everything through Bun; avoid destructive git commands unless explicitly requested.
- Inference provider toggles: `MODEL_PROVIDER=local` with `LOCAL_MODEL_URL=http://localhost:1234/v1`, or `MODEL_PROVIDER=hosted` with `MODEL_BASE_URL` (OpenAI-compatible, including `/v1`), `MODEL_API_KEY`, and `MODEL_ID`. Any OpenAI-compatible host works, so changing provider is an env change. OpenCode Zen's free models (Big Pickle and others) return 403 outside the OpenCode client, so they cannot back the site. The guide does not call any model unless `GUIDE_MODEL=on`. The guide's notes live in `src/content/memory`; they, the site map, and the blog post list from `rag/data` ride in its system prompt, and its two tools (`read_post`, `open_page`) run through the Vercel AI SDK (`docs/components.md`, FloatingChat). The guide speaks about Andrei in the third person, never as him: no "I", "me", or "my" in the prompt or any copy it shows. `GET /api/health` checks configuration and does not call the model unless `?probe=1`.
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
| Local LLM (optional, for model replies) | LM Studio or compatible OpenAI API | http://localhost:1234/v1 (`MODEL_PROVIDER=local`) |
| Hosted model (guide in production) | OpenAI-compatible API | `MODEL_PROVIDER=hosted` |

Only the Astro dev server is required for browsing the portfolio, project pages, and static content. The floating guide answers from `src/content/memory` when no model is reachable. Full model replies need an inference endpoint (`MODEL_PROVIDER=local` or `MODEL_PROVIDER=hosted`). `GET /api/health` returns **503** when the selected provider is missing configuration. It does not call the model unless `?probe=1` is set.

### Lint / format / build

- Lint: `bun run lint` (Biome on `src/`; Svelte/CSS excluded). Typecheck: `bun run check` (`astro check` + `svelte-check`). Tests: `bun test`. Full gate: `bun run verify`.
- Production build: `bun run build` (also runs at the end of `verify`).

### Dev server process

- Use a persistent session (e.g. tmux) for `bun run dev`; it does not exit on its own. Hot reload may not pick up all dependency installs—restart dev if packages change.
