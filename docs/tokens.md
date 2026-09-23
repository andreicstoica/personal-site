# Tokens

All tokens live in `src/styles/global.css` under `:root`. Components use semantic tokens; never use primitives or raw values.

## Color primitives

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#3848ff` | Primary actions, links, focus rings, ASCII glow |
| `--color-primary-hover` | `#2a37cc` | Primary hover state |
| `--color-secondary` | `#00a647` | Text links, success states |
| `--color-secondary-hover` | `#008a3d` | Link hover |
| `--color-accent` | `#c23b23` | Warnings, errors, destructive actions |
| `--color-accent-hover` | `#a12f1c` | Accent hover |
| `--color-warning` | `#fcc605` | Caution states |
| `--color-warning-hover` | `#e6b003` | Warning hover |

## Text colors

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--color-text-primary` | `#272727` | `#fefefe` | Body text, headings |
| `--color-text-secondary` | `#666666` | `#cccccc` | Muted text, borders |
| `--color-text-muted` | `#999999` | `#999999` | Timestamps, labels |
| `--color-text-inverse` | `#fefefe` | `#272727` | Text on colored backgrounds |

## Background colors

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--color-bg-primary` | `#fefefe` | `#272727` | Page background, nav, modals |
| `--color-bg-secondary` | `#c4c4c4` | `#333333` | Tags, subtle fills |

## Tag colors (fixed, not semantic)

| Token | Value | Maps to |
| --- | --- | --- |
| `--tag-work` | `#3848ff` | Work experience type |
| `--tag-personal` | `#37ff8b` | Personal experience type |
| `--tag-school` | `#ffe438` | School experience type |
| `--tag-other` | `#ff39ac` | Other experience type |

These are color assignments, not semantic tokens. They are used in `experienceNameStyle()` in `src/lib/experienceUi.ts`. Do not use `--tag-*` for general UI elements; use `--color-primary` or `--color-secondary` instead.

## ASCII art colors

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--color-ascii-bright` | `#3848ff` | `#5a6aff` | ASCII character glow |
| `--color-ascii-dark` | (none) | `#333333` | Low-brightness chars |
| `--color-ascii-medium` | (none) | `#888888` | Mid-brightness chars |

Light mode uses `currentColor` with a `#5a6aff` fallback in `AsciiHero.astro`. Dark mode defines the full palette. The ASCII component overrides these with inline `color` and `text-shadow`.

## Fonts

| Token | Value | Usage |
| --- | --- | --- |
| `--font-sans` | `"IBM Plex Sans", system-ui, sans-serif` | Body text, UI |
| `--font-serif` | `"IBM Plex Serif", serif` | Tags, emphasis |
| `--font-mono` | `"IBM Plex Mono", monospace` | Dates, code |
| Lumber Sans | `/fonts/LumberSans.ttf` | Display headings (loaded via `@font-face`) |

Lumber Sans is an all-caps display face. Use it for experience names via `experienceNameStyle()` in `src/lib/experienceUi.ts`. Do not use it for body text or UI labels.

## Type scale

| Token | Value | px |
| --- | --- | --- |
| `--text-xs` | `0.75rem` | 12 |
| `--text-sm` | `0.875rem` | 14 |
| `--text-base` | `1rem` | 16 |
| `--text-lg` | `1.0625rem` | 17 |
| `--text-xl` | `1.25rem` | 20 |
| `--text-2xl` | `1.5rem` | 24 |

`--text-lg` (17px) is one step above body text. Use it for lead paragraphs and role labels. The jump from `--text-lg` (17px) to `--text-xl` (20px) is small; this is intentional for the dense experience table.

Line heights:
- `--leading-tight` (1.25): headings
- `--leading-normal` (1.55): body text
- `--leading-relaxed` (1.65): lead paragraphs, markdown content

Letter spacing:
- `--tracking-tight` (-0.015em): headings, body text

## Spacing

| Token | Value | rem |
| --- | --- | --- |
| `--spacing-xs` | `0.5rem` | 8 |
| `--spacing-sm` | `1rem` | 16 |
| `--spacing-md` | `1.5rem` | 24 |
| `--spacing-lg` | `2rem` | 32 |
| `--spacing-xl` | `3rem` | 48 |
| `--page-padding-inline` | `clamp(1rem, 4vw, 2rem)` | 16-32 |

Use `--page-padding-inline` for horizontal page margins. The layout grid (`layout-grid` class) uses this for `padding-inline`.

## Border radius

| Token | Value | Usage |
| --- | --- | --- |
| `--radius-sm` | `0.375rem` | Small elements (6px) |
| `--radius-md` | `0.5rem` | Buttons, inputs (8px) |
| `--radius-lg` | `0.75rem` | Cards, panels (12px) |

## Motion

| Token | Value | Usage |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | All UI transitions |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Symmetric transitions |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Mobile drawer slide |
| `--duration-ui` | `180ms` | Buttons, links, hover states |
| `--duration-drawer` | `280ms` | Mobile menu, social dropdown |
| `--duration-media` | `400ms` | Reserved — not currently referenced. Media reveal uses a 180ms literal |

All transitions respect `prefers-reduced-motion: reduce`. When reduced motion is active, all animations and transitions are disabled.

Component-level one-off timings are written as literals rather than tokens: press feedback (`transform 160ms`, `filter 80ms`), dropdown open (`120ms`), media reveal (`180ms`), social submenu (`200ms` / `160ms`). Add a token before reusing one of these somewhere new.

## Layer rules

- **Backgrounds**: use `--color-bg-primary` for page/nav/modal backgrounds. Use `--color-bg-secondary` for subtle fills (tags, borders).
- **Text**: use `--color-text-primary` for body. Use `--color-text-secondary` for muted labels. Use `--color-text-inverse` on colored backgrounds.
- **Links**: use `--color-secondary` for text links. Use `--color-primary` for interactive elements (buttons, nav hover, focus rings).
- **Borders**: use `--color-text-secondary` for subtle borders. Use `--color-primary` for active/focus borders.

## What not to do

- Do not use `#fefefe` or `#272727` directly; use `--color-bg-primary` or `--color-text-primary`.
- Do not use `--tag-*` for anything other than experience name labels.
- Do not use Lumber Sans for body text or UI labels.
- Do not add new tokens without adding them to this file.
