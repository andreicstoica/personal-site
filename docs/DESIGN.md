# Design System

A builder's portfolio with intentional rough edges: a dithered WebGL weather banner, pixel cursor, horizontal-scroll image galleries, and IBM Plex typography with a custom hand-carved display face (Lumber Sans). The aesthetic is deliberate, not unfinished.

## Design character

Technical but warm. The weather banner and pixel cursor signal craft; the Plex family and green accent keep it readable. The experience table is the dense core: a spreadsheet-like layout that scrolls horizontally through project media. The site should feel like a well-organized workshop, not a polished marketing page.

## Tokens

Semantic and primitive tokens, type scale, spacing, motion. See [tokens.md](./tokens.md).

## Components

Nav, footer, weather banner, galleries, icons, buttons, experience table, markdown content. See [components.md](./components.md).

## Patterns

Image galleries, modal inspect, media reveal, dark mode, scroll behavior. See [patterns.md](./patterns.md).

## Known rough edges

1. **Image galleries have no navigation.** Horizontal scroll only; no prev/next arrows, no keyboard nav, no swipe on mobile. The modal inspect has no zoom or pan.
2. **Duplicate button styles.** `btn-primary`, `btn-secondary`, `btn-secondary-custom`, `btn-accent-custom` overlap. All now use semantic tokens for text color.
3. ~~**Hardcoded colors.**~~ Fixed: all component code now uses semantic tokens.
4. ~~**Nav box is a complex utility.**~~ Fixed: the static-nav rewrite deleted `nav-box`, `--nav-box-styles`, and the dropdown/drawer rules.
5. **Type scale gaps.** `--text-lg` is `1.0625rem` (17px), not a standard step. `--text-base` through `--text-xl` are close together.
6. **Dark mode ASCII colors only.** `--color-ascii-*` tokens are defined in the dark mode block but not in light mode, and nothing renders ASCII anymore — the banner keeps its ramps in `src/lib/weather/palette.ts`. Candidates for removal.
7. **Tag colors are not semantic.** `--tag-work`, `--tag-personal` are hardcoded to specific colors; no token layer for "tag" usage.
8. **No focus ring tokens.** Focus styles use `--color-primary` directly; should be a `--focus-ring` token.
