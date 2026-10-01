# Tokens

All tokens live in `src/styles/global.css` (TAB-indented, keep it that way). Components use semantic tokens — never primitives (`#fefefe`), never Tailwind palette colors (`gray-200`, `blue-100`). This file decides which token and which syntax.

## The layer rule

Two accepted ways to reference a token from a Tailwind class:

- **Bracket form** — `border-[var(--color-bg-secondary)]`, `text-[var(--color-text-primary)]`. The house idiom; 14 matching lines in `FloatingChat.svelte` alone.
- **Shorthand form** — `bg-(--color-bg-secondary)` (Tailwind v4). Same meaning; used in `ExperienceRow.astro:48`.

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
 ├── Page, nav, card, input, popover, message bubble → --color-bg-primary   (#fefefe / #272727)
 ├── Chip, tag, subtle fill inside a page           → --color-bg-secondary  (#c4c4c4 / #333333)
 └── Viewport-edge drawer that reads sunken        → --color-bg-sunken     (#f5f5f5 / #1f1f1f)
      └ one consumer: the guide drawer (FloatingChat.svelte:596), paired with
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

- **Links**: `--color-secondary` (green) is the global `a` color (`global.css:350`), hover `--color-secondary-hover`. That's its only job — it is not a "success" color. The nav name and footer links override it back to `--color-text-primary` because green on the header/footer bar breaks the chrome (`global.css:486`, `SiteFooter.astro:73`).
- **Interactive/focus**: `--color-primary` for hover borders, focus rings (`:focus-visible` = 2px solid `--color-primary`, offset 2px, `global.css:223`), and selection wash (primary at 24%).

## Borders — closed set of four

1. **Section hairline** — `color-mix(in srgb, var(--color-text-primary) 12%, transparent)`; the footer's divider (`SiteFooter.astro:39`). Holds in both modes from one rule.
2. **In-panel rule/input border** — `border-[var(--color-bg-secondary)]` (assistant bubbles, their citation rule, and the input: `FloatingChat.svelte:374,379,427`). The drawer's own header and form carry no rule — space separates them.
3. **Strong edge** — `1px solid var(--color-text-secondary)`: elevated shells (`FloatingChat.svelte:482` popover) and outlined controls (`.btn-secondary`, `global.css:324`).
4. **Accent/focus border** — `var(--color-primary)` (`btn-secondary:hover`, `global.css:340`).

The experience table's row rules use **#1** (one `color-mix` hairline in `ExperienceRow.astro`'s scoped style) and its filter select uses **#2**. Neither reaches for `border-gray-*` + `dark:` swaps — don't reintroduce that shape.

## Radius

- **Default is 0.** Square is the house style — pixel cursor, `*` bullets, dithered banner; rounded cards would read as the polished marketing page this site deliberately isn't.
- Form controls get explicit `rounded-none` (`FloatingChat.svelte:372,427,432`) because Safari gives native controls a radius.
- `--radius-md` (0.5rem) is used only by `.btn-primary/.btn-secondary`; `--radius-sm` has zero references.

## Motion

- **UI transitions**: `var(--duration-ui)` 180ms + `var(--ease-out)`. Never a raw ms literal, never `ease-in`.
- **Drawer/modal**: open `var(--duration-drawer)` 280ms, close `--duration-ui` 180ms, both `--ease-out`, with `visibility` delays mirroring them (`FloatingChat.svelte:601-626`, `global.css:582-608`).
- **Press feedback**: `transform 160ms var(--ease-out)` → `scale(0.98)` (`global.css:301,316`).
- The only blessed literals beyond the tokens: `160ms` press and `80ms` filter inside `.btn-*`. Add a token before reusing any other number.
- `prefers-reduced-motion: reduce` kills all transitions — global rules at `global.css:115,616` plus a component block when the transition is defined in a scoped `<style>` (why `FloatingChat.svelte:629` exists).
- `--ease-in-out` and `--duration-media` are defined with zero references — dead until noted here with a use.

## Elevation

`--elevation-drawer` is the only elevation token; sole consumer is the guide drawer (`FloatingChat.svelte:597`). Both directions point inward — the drawer never shadows the page, the page's edge shadows it. Light: hairline plus a soft inset along the page-facing edge. Dark: the same inset deepened, plus one white 10% hairline (`global.css:148`) — a black shadow is invisible on `#272727` from outside, but reads as depth from inside. The direction and the collapse are the token's job, don't re-derive them per component. The guide popover's `0 8px 24px rgb(0 0 0 / 16%)` (`FloatingChat.svelte:484,525`) is the only other shadow in the system; don't invent a third.

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
