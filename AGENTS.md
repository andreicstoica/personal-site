# Repository Guidelines

## Project Structure & Module Organization
- `src/pages` is the entry point for routes; keep Astro page files small and delegate logic to components.
- `src/components` and `src/layouts` hold reusable Astro/React building blocks; use `src/styles` for shared Tailwind layers.
- Store markdown-driven content in `src/content`; shared helpers live in `lib`.
- Place public assets (images, fonts) in `public`; generated output lands in `dist` after a build. Product specs and reference content live under `specs`.

## Build & Development Commands
- `npm install` (or `bun install`) bootstraps dependencies—use the lockfile that matches your package manager.
- `npm run dev` starts the Astro dev server with hot reload at `http://localhost:4321`.
- `npm run build` creates a production bundle in `dist`; run it before pushing to ensure static output renders cleanly.
- `npm run preview` serves the built site locally to validate the production build.

## Coding Style & Naming Conventions
- Use Prettier with `prettier-plugin-astro`; format with `npx prettier --write "src/**/*.{astro,ts,tsx}"`.
- Favor two-space indentation, single quotes in JS/TS, and template literals for multiline strings.
- Astro/React components use PascalCase (e.g., `AsciiHero.astro`); utilities in `lib` use camelCase filenames.
- Tailwind classes stay in templates; extract repeated styles into `src/styles` modules.

## Testing & Quality Checks
- Automated tests are not yet configured; manually verify key flows against the acceptance notes in `specs/`.
- Before raising a PR, run `npm run build` and click through navigational elements locally.
- Add Playwright or Vitest coverage when introducing complex interactions; co-locate future tests beside the component under `src/components/__tests__/`.

## Commit & Pull Request Guidelines
- Follow the existing history style: concise, present-tense summaries such as `Add Refract project details`. Include scope prefixes when helpful (`feat:`, `fix:`).
- Each PR should include: a short description, linked issue (when applicable), and screenshots or GIFs for UI-visible changes.
- Note config or content migration steps in the PR body so deploy reviewers can follow along.
- Request review once CI (if configured) is green and manual checks are documented.
