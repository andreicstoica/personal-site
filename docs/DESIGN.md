# Design System

A builder's portfolio with intentional rough edges: a dithered WebGL weather banner, pixel cursor, horizontal-scroll image galleries, and IBM Plex typography with a custom hand-carved display face (Lumber Sans). The aesthetic is deliberate, not unfinished.

## Design character

Technical but warm. The weather banner and pixel cursor signal craft; the Plex family and green accent keep it readable. The experience table is the dense core: a spreadsheet-like layout that scrolls horizontally through project media. The site should feel like a well-organized workshop, not a polished marketing page.

## Tokens

Which token, which syntax, layer rules. See [tokens.md](./tokens.md). Type scale, fonts, page-chrome text classes: [typography.md](./typography.md).

## Rules (when to use what)

Button, island vs static Astro, Icon, experience chip, MediaGallery — the decisions an agent needs before writing markup. See [usage.md](./usage.md).

## Components

Nav, footer, weather banner, galleries, icons, buttons, experience table, markdown content — what each component *is*. See [components.md](./components.md).

## Patterns

Image galleries, modal inspect, media reveal, dark mode, scroll behavior. See [patterns.md](./patterns.md).

## Known rough edges

1. **Image galleries have no navigation.** Horizontal scroll only; no prev/next arrows, no keyboard nav, no swipe on mobile. The modal inspect has no zoom or pan.
2. **Button utilities are half-dead.** `.btn-primary` and `.btn-secondary` have zero call sites; `.btn-secondary-custom` is used only by `ProjectLinks.astro`, where all three Links buttons now share it. `.btn-primary` also sets `color: var(--color-text-inverse)`, which is 2.5:1 on its blue fill in dark mode — fix to `white` before first use (see [usage.md](./usage.md)).
3. **Legacy literal size.** `text-[.92rem]` (`ExperienceRow.astro:37,52`) is the last stale utility shape — normalize to `text-sm`/`text-base` when touching that file.
4. **Type scale gaps.** `--text-lg` is `1.0625rem` (17px), not a standard step. `--text-base` through `--text-xl` are close together.
5. **Dark mode ASCII colors only.** `--color-ascii-*` tokens are defined in the dark mode block but not in light mode, and nothing renders ASCII anymore — the banner keeps its ramps in `src/lib/weather/palette.ts`. Candidates for removal.
6. **Tag colors are not semantic.** `--tag-work`, `--tag-personal` are hardcoded to specific colors; no token layer for "tag" usage. Their ink is fixed per fill (`--tag-*-text`, deliberately outside the dark block) — that removed the dark-mode contrast failures, so any new tag fill needs the same treatment.
7. **No focus ring tokens.** Focus styles use `--color-primary` directly; should be a `--focus-ring` token.
8. **Dead tokens.** `--color-accent(+hover)`, `--color-warning-hover`, `--color-bg-tertiary`, all `--color-ascii-*`, `--duration-media`, `--ease-in-out`, `--radius-sm` have zero references — full list in [tokens.md](./tokens.md).
