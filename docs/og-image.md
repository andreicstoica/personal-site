# Open Graph image

Decided from the `/proto/unfurl` prototype, 2026-10-01. The prototype is deleted; this file is the record.

## Direction

Duotone: the couch photo (`public/cover.jpeg`) pushed through a 4×4 ordered Bayer dither in the site's blue, three tonal levels, with a mono domain chip bottom-left. Output is `public/og.png`, 1200 × 630.

## Values

| Setting | Value |
| --- | --- |
| Source crop | focal x 0.39, focal y 0.42, zoom 1.15× (cover fit) |
| Palette | primary `#3848ff`, tint `#9ba3fe`, paper `#fefefe` |
| Levels | 3 |
| Cell | 3 px |
| Contrast | 1.55 around mid-gray before quantizing |
| Chip | `andrei.bio`, IBM Plex Mono 500 26px, ink `rgba(39,39,39,0.88)` on paper text, 48 px inset |

Title is the page title (nav wordmark is "Andrei Stoica"; the site has no separate name). Default description is "Product minded software engineer based in New York City." Projects pass their own description.

## Rejected

- **Portrait** (photo, no treatment): personal but says nothing about the site, busy at thumbnail size.
- **Weather** (pixel banner over a text band): the banner reads too small on iMessage and the card leans on the text.
- **Wordmark** (type only): clean, forgettable.
- **Dither** (two-level): the round-1 pick. Face and hands dissolve at thumbnail size; Duotone keeps the look and fixes that.
- **Strip** (weather banner over dither): two visual systems in 630 px.
- **Typeset** (type panel beside dither): robust on X and LinkedIn, but a familiar card shape and half the photo gone.
- Ink-on-paper duotone: considered, brand blue chosen.

## Regenerating

Re-run the dither with the values above. The algorithm: cover-fit the photo to 400 × 210 (1200 ÷ 3), take luminance, apply contrast, map to 3 levels with a 4×4 Bayer threshold, upscale ×3 nearest-neighbor, draw the chip.
