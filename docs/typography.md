# Typography

## Fonts

| Token / face | Value | Where it's allowed |
| --- | --- | --- |
| `--font-sans` | IBM Plex Sans, system-ui | Everything. `html` sets it (`global.css:162`). |
| `--font-mono` | IBM Plex Mono | Dates (`ExperienceRow.astro:55,91`), timestamps (`SiteFooter.astro:54`). Never body copy. |
| `--font-serif` | IBM Plex Serif | Experience tag chips only (`ExperienceRow.astro:47`); plus the `src/proto` scratch pages. |
| LumberSans | `/fonts/LumberSans.ttf` (local `@font-face`, `swap`) | Experience names, and only through `experienceNameStyle()` / `displayFontStyle()` (`experienceUi.ts:8-10`). Never body text or UI labels — it's an all-caps carved display face; a paragraph in it is unreadable. |

Because the unlayered `:root` overrides Tailwind's theme (see [tokens.md](./tokens.md)), the utilities `font-sans` / `font-mono` / `font-serif` all resolve to these Plex faces, not Tailwind's defaults.

Google Fonts is loaded once in `global.css:1` (weights 400/500/600/700 sans, 400 mono/serif) — don't add a second font import.

## Type scale

| Size | px | Utility | Use |
| --- | --- | --- | --- |
| `--text-xs` | 12 | `text-xs` | Captions, timestamps. Floor: nothing smaller, except the guide's source chips. |
| `--text-sm` | 14 | `text-sm` | Labels, table headers, secondary copy, chat messages. |
| `--text-base` | 16 | `text-base` / default | Body. |
| `--text-lg` | **17** | `text-lg` | Lead text. Note: Tailwind documents `text-lg` as 18px; the site token makes it 17px — trust the token. |
| `--text-xl` | 20 | `text-xl` | Section headings (`ProjectSection.astro:10`, markdown `h2`). |
| `--text-2xl` | 24 | `.page-title` | Page titles (`global.css:196`). |

Rules:

- **Body is 16px, labels/captions 14px, never below 12px.** The single exception: guide source chips are 11px (`FloatingChat.svelte:401,411,415`) — do not create new 11px text.
- **Text inputs are 16px on touch, 14px on fine pointers** (`FloatingChat.svelte:513,570`). Below 16px iOS Safari auto-zooms on focus.
- `text-[.92rem]` (14.7px, `ExperienceRow.astro:40,55`) is a legacy literal — don't copy it; use `text-sm`/`text-base` in new code.

## Leading and tracking

- `--leading-tight` 1.25 — headings. `--leading-normal` 1.55 — body (`html` default). `--leading-relaxed` 1.65 — lead paragraphs and markdown content.
- `--tracking-tight` −0.015em — applied to body and headings globally (`global.css:183`). It overrides Tailwind's `tracking-tight` (−0.025em) via the same `:root` mechanism; don't re-add tracking utilities to headings.

## Page-chrome text classes

Defined once in `global.css` — compose, don't re-style:

- `.text-lead` — the one lead paragraph per page: 17px / 1.65, `text-wrap: pretty`. Where the measure needs capping, the call site adds `max-w-2xl` itself (`MarkdownSections.astro:22`, `fitness.astro:19`) — the class carries no width. The home hero (`Home.astro:28,29`) deliberately omits it: its two columns each set their own measure inside `.site-column`. The cap is the measure, not a second container — don't narrow the container instead.
- `.page-title` — 24px / 700 page heading (`ContentDocument.astro:10`).
- `.text-muted` — **maps to `--color-text-secondary` (5.7:1), not the `--color-text-muted` token (2.8:1)** (`global.css:210`). The name collision is deliberate history; the class is safe for text, the token is not.
- Markdown body styles (`.markdown-*`, `.markdown-body`) own all rich-text sizing inside content — never inline font utilities into markdown-rendered HTML.

Rule: if a page needs text that matches one of these, use the class. A new text style needs a token change here first.
