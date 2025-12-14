# Repository Guidelines

## Project Structure & Module Organization

- `src/pages`: Astro route entrypoints; keep logic thin and delegate to components.
- `src/components`: shared UI islands (Astro/Svelte) such as `MediaGallery.astro` and `ImageGallery.svelte`.
- `src/layouts`: page shells; `src/lib`: helpers; `src/styles`: Tailwind tokens/extracted class groups.
- Content lives in `src/content`; acceptance references in `specs`; public assets in `public` (e.g., `public/images`). Never edit `dist`.

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
