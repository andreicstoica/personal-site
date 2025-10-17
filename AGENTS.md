# Repository Guidelines

## Project Structure & Module Organization
`src/pages` defines Astro routes; keep these files slim and pass heavy lifting to components. Shared UI lives in `src/components` and layouts in `src/layouts`. Cross-cutting helpers belong in `lib`, while Tailwind layers and tokens sit in `src/styles`. Content sourced from markdown resides in `src/content`, and reference material stays in `specs`. Place public-facing assets in `public/`; production builds emit to `dist/`.

## Build, Test, and Development Commands
- `npm install` (or `bun install`) syncs dependencies; honor the existing lockfile.
- `npm run dev` launches Astro at `http://localhost:4321` with hot reload.
- `npm run build` compiles the static site into `dist/`; run before raising a PR.
- `npm run preview` serves the production bundle for final verification.

## Coding Style & Naming Conventions
Use two-space indentation and favor single quotes in JS/TS. Astro and React components use PascalCase filenames (e.g., `AsciiHero.astro`), utilities in `lib` stick to camelCase. Keep Tailwind classes inline unless reused—then extract them into `src/styles`. Format with `npx prettier --write "src/**/*.{astro,ts,tsx}"`, which leverages `prettier-plugin-astro`.

## Testing Guidelines
Automated tests are not yet configured. Manually validate pages against the acceptance notes in `specs/`, paying attention to navigation and content rendering. If you introduce interactive behavior, consider adding Playwright or Vitest co-located tests under `src/components/__tests__/`.

## Commit & Pull Request Guidelines
Follow the repo’s concise, present-tense history (e.g., `feat: Add Refract project details`). Each PR should include: a short summary, linked issue if available, and UI proof (screenshot or GIF) for visible changes. Document any config or content migrations so reviewers can replicate. Ensure `npm run build` passes and note any manual checks performed before requesting review.

## Configuration & Environment Tips
This project expects Node.js with npm or Bun. Switch inference providers via env vars: set `MODEL_PROVIDER=local` (default) with `LOCAL_MODEL_URL=http://localhost:1234` for LM Studio, or `MODEL_PROVIDER=hf` with `HF_API_URL`, `HF_API_KEY`, and optional `HF_MODEL_ID` in production. Avoid destructive git commands (`git reset --hard`, `git checkout --`) unless explicitly requested. When working on large features, stage content updates under `specs/` and assets under `public/` to keep review diffs focused.
