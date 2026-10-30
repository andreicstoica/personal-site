# Typography

## Fonts

| Token / face | Value | Where it's allowed |
| --- | --- | --- |
| `--font-sans` | Geist, system-ui | Body text, headings, and breadcrumbs. |
| `--font-mono` | Geist Mono | Table labels and dates, footer timestamps, and guide trace data. |
| `--font-serif` | Geist Serif Square, regular 400 | Table tags. |
| LumberSans | Generated WOFF2 subset | The existing Lumber Sans project sample, through `experienceNameStyle()` / `displayFontStyle()`. |

The site uses the Geist family with no font switcher. The unlayered `:root` tokens override Tailwind's theme (see [tokens.md](./tokens.md)).

Fonts are self-hosted. `scripts/fonts/subset.py` reads the built site's characters and produces hashed WOFF2 core and extended files, generated CSS, and preload URLs. The layout preloads regular and bold Sans, Sans italic, and Mono cores. Other weights and extended characters load on demand; LumberSans is preloaded only on Home. Serif Square is the published static cut. Source hashes, outlines, advances, pair shaping, glyph names, `.notdef`, hinting, and head metrics are checked against the pinned upstream files. Run `bun run build`, `bun run fonts`, then `bun run fonts --check` after changing font usage.

## Type scale

| Size | px | Utility | Use |
| --- | --- | --- | --- |
| `--text-xs` | 12 | `text-xs` | Captions, timestamps. Floor: nothing smaller, except the guide's source chips. |
| `--text-sm` | 14 | `text-sm` | Labels, table headers, secondary copy, chat messages. |
| `--text-base` | 16 | `text-base` / default | Body. |
| `--text-lg` | **17** | `text-lg` | Lead text. Note: Tailwind documents `text-lg` as 18px; the site token makes it 17px — trust the token. |
| `--text-xl` | 20 | `text-xl` | Section headings (`ProjectSection.astro:10`, markdown `h2`). |
| `--text-2xl` | 24 | `.page-title` | Page titles (`global.css:200`). |

Rules:

- **Body is 16px, labels/captions 14px, never below 12px.** The single exception: guide source chips are 11px (`FloatingChat.svelte:384,394,398`) — do not create new 11px text.
- **Text inputs are 16px on touch, 14px on fine pointers** (`FloatingChat.svelte:496,554`). Below 16px iOS Safari auto-zooms on focus.
- `text-[.92rem]` (14.7px, `ExperienceRow.astro:41,56`) is a legacy literal — don't copy it; use `text-sm`/`text-base` in new code.

## Leading and tracking

- `--leading-tight` 1.25 — headings. `--leading-normal` 1.5 — body (`html` default). `--leading-relaxed` 1.58 — lead paragraphs and markdown content.
- `--tracking-tight` −0.015em — applied to body and headings globally (`global.css:187`). It overrides Tailwind's `tracking-tight` (−0.025em) via the same `:root` mechanism; don't re-add tracking utilities to headings. The `em` resolves against the 16px body and is inherited as a length, so 14px text carries −0.24px. That crowds small text: the experience table resets it with `tracking-normal`, and any new dense small-text surface should do the same.

## Page-chrome text classes

Defined once in `global.css` — compose, don't re-style:

- `.text-lead` is the intro paragraph: 17px with relaxed leading, or 16px below 768px. It fills the centered subpage content width.
- Subpages use centered 30px breadcrumbs. Their main heading remains available to screen readers without a duplicate visible title.
- `.text-muted` — **maps to `--color-text-secondary` (5.7:1), not the `--color-text-muted` token (2.8:1)** (`global.css:214`). The name collision is deliberate history; the class is safe for text, the token is not.
- Markdown body styles (`.markdown-*`, `.markdown-body`) own all rich-text sizing inside content — never inline font utilities into markdown-rendered HTML.

Rule: if a page needs text that matches one of these, use the class. A new text style needs a token change here first.
