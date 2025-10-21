# Repository Guidelines

## Project Structure & Module Organization
Keep Astro pages lean and funnel logic into reusable pieces. Key paths include `src/pages` for route entrypoints, `src/components` for shared UI, and `src/layouts` for page shells. Cross-cutting helpers land in `src/lib`, while Tailwind tokens and extracted class groups live in `src/styles`. Markdown content sits in `src/content`, acceptance references stay under `specs`, and public-facing assets belong in `public`. The `dist` folder is generated output—never edit it directly.

## Build, Test, and Development Commands
Run `npm install` or `bun install` to sync dependencies; honor the existing lockfile. Use `npm run dev` to launch Astro with hot reload at `http://localhost:4321`. Build for production with `npm run build`, which emits static assets to `dist`. Verify the compiled bundle via `npm run preview` before shipping.

## Coding Style & Naming Conventions
Use two-space indentation across the stack. Favor single quotes in JS/TS, and keep Astro or React component filenames in PascalCase (e.g., `AsciiHero.astro`). Utilities in `src/lib` use camelCase, and Tailwind classes stay inline unless shared, in which case extract them to `src/styles`. Format changes with `npx prettier --write "src/**/*.{astro,ts,tsx}"`, which pulls in `prettier-plugin-astro`.

## Testing Guidelines
Automated tests are not yet wired in. Validate features manually against the acceptance notes in `specs`, covering navigation paths and data rendering. When adding interactivity, consider introducing Playwright or Vitest specs under `src/components/__tests__/` and document how to execute them in your PR.

## Commit & Pull Request Guidelines
Commits follow short, present-tense summaries (e.g., `feat: Add Refract project details`). Every PR should include a concise description, linked issue when available, screenshots or GIFs for UI updates, and mention of any content or config migrations. Run `npm run build` locally and note the manual checks performed before requesting review.

## Configuration & Environment Tips
This project targets Node.js via npm or Bun. Switch inference providers using `MODEL_PROVIDER`; set `MODEL_PROVIDER=local` with `LOCAL_MODEL_URL=http://localhost:1234` for LM Studio, or `MODEL_PROVIDER=hf` alongside `HF_API_URL`, `HF_API_KEY`, and optional `HF_MODEL_ID` for Hugging Face. Avoid destructive git commands unless specifically requested, and stage large content shifts under `specs/` and `public/` to keep diffs focused.
