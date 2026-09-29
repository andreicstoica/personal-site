# Tokens

All tokens live in `src/styles/global.css` (TAB-indented, keep it that way). Components use semantic tokens — never primitives (`#fefefe`), never Tailwind palette colors (`gray-200`, `blue-100`). This file decides which token and which syntax.

## The layer rule

Two accepted ways to reference a token from a Tailwind class:

- **Bracket form** — `border-[var(--color-bg-secondary)]`, `text-[var(--color-text-primary)]`. The house idiom; 14 matching lines in `FloatingChat.svelte` alone.
- **Shorthand form** — `bg-(--color-bg-secondary)` (Tailwind v4). Same meaning; used in `ExperienceRow.astro:52`.

Nothing else. Raw hex, Tailwind palette colors, and bare-name shapes (`text-[--color-text-primary]`, `text-(color-text-primary)`) are bugs, not options — don't reintroduce them. In scoped `<style>` blocks write `var(--token)` directly.

```astro
<!-- Correct — FloatingChat.svelte:427 -->
<input class="border-[var(--color-bg-secondary)] bg-[var(--color-bg-primary)]" />

<!-- Incorrect — Tailwind's palette instead of a site token; this is the shape to avoid -->
<select class="border-gray-300 dark:border-gray-600" />
```

### Why tokens beat Tailwind's defaults

`global.css` writes its tokens in an unlayered `:root`; Tailwind v4 ships its defaults inside `@layer theme`. Unlayered CSS beats any layer, so same-named site tokens silently replace Tailwind's: `rounded-lg` resolves to `var(--radius-lg)` = **0.75rem** (not Tailwind's 0.5rem), `text-lg` = **17px** (not 18px), `font-mono` = **IBM Plex Mono**. Consequence: never tune a utility assuming Tailwind's documented value — read the site token first.

## Backgrounds

```
What background?
 ├── Page, nav, card, input, phone sheet, bubble    → --color-bg-primary   (#fefefe / #272727)
 ├── Chip, tag, subtle fill inside a page           → --color-bg-secondary  (#c4c4c4 / #333333)
 └── Viewport-edge drawer that reads sunken        → --color-bg-sunken     (#f5f5f5 / #1f1f1f)
      └ one consumer: the desktop guide drawer (FloatingChat.svelte), paired with
        --elevation-drawer. Never use sunken for in-flow sections.
```

`--color-bg-tertiary` (#404040) exists only inside the dark block and has zero references — do not use it.

## Text

```
What text color?
 ├── Body, headings                → --color-text-primary   (14.8:1 both modes)
 ├── Secondary copy, chips, borders → --color-text-secondary (5.7:1 light / 9.3:1 dark)
 ├── Decorative-only labels        → --color-text-muted     (2.8:1 on light — fails the
 │                                    4.5:1 floor; scrollbars and timestamps only,
 │                                    never chips, links, or anything load-bearing)
 └── On a --color-primary fill     → literal white (5.9:1). NOT --color-text-inverse:
                                      it flips to #272727 in dark mode → 2.5:1 on blue.
```

`--color-text-inverse` is correct only on `--tag-*` fills in light mode; see the chip pairs in [DESIGN.md](./DESIGN.md).

- **Links**: a link keeps the color of the text around it (`color: inherit` on `a` in `global.css`). The mark is a 1px dotted underline, solid on hover (hover-gated), offset `0.2em`. Buttons and chips opt out with `text-decoration: none`; the site name is a wordmark with no rest underline. There is no link color token.
- **Interactive/focus**: `--color-primary-text` for blue text, hover borders and focus rings (`:focus-visible` = 2px solid `--color-primary-text`, offset 2px). It equals `--color-primary` in light mode and lifts to `oklch(0.66 0.18 272)` in dark mode, where the fill blue is only 2.5:1. Fills (launcher, Send, user bubbles) keep `--color-primary` with white text. Selection wash stays primary at 24%.

## Borders — closed set of three

1. **Shared gray** — `var(--color-bg-secondary)`: section hairlines (footer divider `SiteFooter.astro:41`, experience-row rules), in-panel rules/input borders (assistant bubbles, their citation rule, and the input), and the neutral tags chips. One gray for dividers and labels; holds in both modes.
2. **Strong edge** — `1px solid var(--color-text-secondary)`: outlined controls (`.btn-secondary`) and the weather lab panel.
3. **Accent/focus border** — `var(--color-primary-text)` (`btn-secondary:hover`).

The experience table's row rules use **#1** (one `color-mix` hairline in `ExperienceRow.astro`'s scoped style) and its filter select uses **#2**. Neither reaches for `border-gray-*` + `dark:` swaps — don't reintroduce that shape.

## Radius

- **Default is 0.** Square is the house style — pixel cursor, `*` bullets, dithered banner; rounded cards would read as the polished marketing page this site deliberately isn't.
- Form controls get explicit `rounded-none` (the guide input and bubbles in `FloatingChat.svelte`) because Safari gives native controls a radius.
- `--radius-md` (0.5rem) is used only by `.btn-primary/.btn-secondary`; `--radius-sm` has zero references.

## Motion

- **UI transitions**: `var(--duration-ui)` 180ms + `var(--ease-out)`. Never a raw ms literal, never `ease-in`.
- **Drawer and sheet**: open and close both `var(--duration-drawer)` 220ms on `--ease-in-out`, with the close `visibility` delay matching (`FloatingChat.svelte`). The page's `padding-inline-end` uses the same timing when it makes room. **Gallery modal**: same-document view transition morph with the scrim on the root crossfade, open `var(--duration-drawer)` 220ms, close 140ms, both `--ease-out` (`html[data-image-inspect-vt]` rules in `global.css`). Without a morph (no API, thumbnail off screen) the scrim alone fades, 220ms in / 140ms out, mirrored by `modalCloseMs` in `ImageGallery.svelte`. Carousel slides enter over `var(--duration-ui)` 180ms.
- **Press feedback**: removed globally — no `:active` scale/opacity treatments anywhere (`btn-*`, gallery thumbs, footer links, guide launch, proto sandbox).
- The only blessed literals beyond the tokens: `80ms` filter inside `.btn-*`, plus the gallery modal's `250ms` open / `150ms` close. Add a token before reusing any other number.
- `prefers-reduced-motion: reduce` kills all transitions — global rules in `global.css` plus a component block when the transition is defined in a scoped `<style>` (why `FloatingChat.svelte` has one).
- `--ease-in-out` and `--duration-media` are defined with zero references — dead until noted here with a use.

## Elevation

Two elevation tokens, one per guide geometry:

- `--elevation-drawer` (desktop drawer) points inward — the drawer never shadows the page, the page's edge shadows it, so it reads as a recess. `--elevation-drawer` is only the 1px hairline; `--drawer-shade` colors an eased 2rem gradient drawn by `.guide-panel::before` in `FloatingChat.svelte`, on the page-facing edge only. A blurred inset box-shadow was rejected because it also darkened the top, bottom, and far edges, where the drawer meets the viewport. Light: black 6% hairline, 10% shade. Dark: white 10% hairline, 40% black shade — a black shadow is invisible on the dark page (L 0.273) from outside, but reads as depth from inside.
- `--elevation-sheet` (phone bottom sheet) points outward and up, so the sheet reads as a layer on top of the page. Light: a tight plus a soft layered shadow. Dark: a deeper 55% black shadow plus a white 8% top edge, since a shadow alone barely shows on dark ground.

The direction and the dark-mode collapse are the tokens' job; don't re-derive them per component. The guide launcher's `0 8px 24px rgb(0 0 0 / 16%)` is the only other shadow in the system; don't invent another.

## Spacing

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| `--spacing-xs` | 0.5rem | `--spacing-lg` | 2rem |
| `--spacing-sm` | 1rem | `--spacing-xl` | 3rem |
| `--spacing-md` | 1.5rem | `--page-padding-inline` | `clamp(1rem, 4vw, 2rem)` |

`--spacing-*` feeds CSS rules only (`.btn-*` padding/gap). Tailwind spacing (`p-4`, `gap-2`) is Tailwind's own scale. Page gutters come from `--page-padding-inline` via `.site-column` (max 64rem centered) or `.full-bleed` to escape it — never re-implement the *page gutter* with a hard-coded padding (inner content padding like `px-4` inside an already-guttered column is fine, e.g. `ProjectDisplay.astro:16`).

## Dead tokens (defined, zero references)

`--color-accent` + `--color-accent-hover`, `--color-warning-hover`, `--color-bg-tertiary`, all nine `--color-ascii-*`, `--duration-media`, `--ease-in-out`, `--radius-sm`. `--color-warning` has exactly one use: the dashed highlight underline (`ProjectEnhancedDescription.astro:36`). Do not build on a dead token — give it a use and a note here first.

## What not to do

- No raw hex or palette colors in components — tokens or nothing.
- No `--tag-*` outside experience name chips; no `--color-text-muted` where 4.5:1 matters.
- No new motion numbers; no second elevation recipe.
- New or changed token → update this file in the same change.
