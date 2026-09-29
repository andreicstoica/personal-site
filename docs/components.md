# Components

Components are split between Astro (static composition) and Svelte (client state). Hydrate with `client:visible` or `client:idle` only where interaction needs JS.

## Nav

**File**: `src/components/nav/Nav.astro`

Static header: the name link on the home page, and a breadcrumb on subpages (`Andrei Stoica / Page title`). No nav boxes, no dropdown, no drawer. This is Astro markup with a scoped `<style>` and no hydration.

- `.site-nav` sets the row padding; `.nav-name` is the only link (`/`). It shows a 1px underline on hover, since it is the only way home
- `SiteLayout` passes the page `title` as the `crumb` prop on every page except `/`. The crumb is an `<ol>` inside `<nav aria-label="Breadcrumb">`, and the current page is `aria-current="page"`. A long crumb truncates with an ellipsis; the page title below shows the full name
- Pages the About page lists as its sub-pages (Fitness, Colophon) pass `parent={aboutCrumb}` (`src/lib/navLinks.ts`) to `SiteLayout` or `CollectionPage`, which adds a middle crumb: `Andrei Stoica / About / Fitness`. The parent is a link in regular weight and the primary color, between the bold name and the grey current page. Canon stays top-level because the home page links to it directly. Add a parent only for pages reached from another page
- Subpages have no back link. `SiteLayout` adds `.page-island-sub` (extra top padding from 768px) in its place
- `.nav-name` sets `color: var(--color-text-primary)` so the global green `a` color doesn't apply
- The bar sits on `--color-bg-primary` with a `border-b` hairline — no gradient wash, because it overlaps the top of the weather banner
- The name link carries `min-h-[44px]` for the touch minimum
- No `transition:persist`: the crumb changes on every page, so a persisted header would go stale

### Usage

```astro
<Nav crumb={isHome ? undefined : title} />
```

Page links live in the content instead of the header: the home statement links to `/about`, and social links sit in the footer. The `.nav-box` rules, social dropdown, and mobile drawer CSS were deleted along with `Nav.svelte`.

## SiteFooter

**Files**: `src/components/footer/SiteFooter.astro`, `src/components/footer/BeosIcon.astro`

Global footer rendered inside the scroll region, below the page slot.

- One list item per `socialNavItems` entry in `src/lib/navLinks.ts` (GitHub, LinkedIn, Substack, X)
- Each link opens in a new tab with `rel="noopener noreferrer"`
- `BeosIcon` maps the `icon` field (`person` / `mail` / `terminal` / `balloon`) to a 24px pixel-art SVG. The switch is exhaustive via `assertNever`, so a new `SocialIcon` without a glyph is a compile error
- Hairline `border-top` in `var(--color-bg-secondary)` — the shared divider gray; holds in both modes from one token
- Links render at `text-sm` (14px) so the footer recedes below body copy; the list sits in a `<nav aria-label="Social links">` landmark
- `transition:persist="site-footer"`

### Usage

```astro
<SiteFooter transition:persist="site-footer" />
```

## ImageGallery

**File**: `src/components/gallery/ImageGallery.svelte`

Horizontal-scroll thumbnail strip with a full-screen modal inspect overlay.

### Gallery strip

- `flex gap-2 flex-nowrap overflow-x-auto scrollbar-always-visible gallery-strip`, with no inline padding, so media sits flush with its column edge. Snap-to-start would ignore padding anyway and shift multi-image strips 8px left of single-image ones.
- `.gallery-strip` adds `scroll-snap-type: x proximity` and `touch-action: pan-x`; thumbnail buttons use an inset focus ring (`outline-offset: -2px`) so the overflow clip never hides it
- Thumbnails are `h-50 w-auto object-contain` (200px tall, natural width)
- All thumbnails render on mount; there is no `IntersectionObserver` gate. Offscreen images defer via native `loading="lazy"`
- Each thumbnail is a `<button>` with `cursor-zoom-in`

### Modal inspect

- Portal-mounted to `document.body` via `portal` action
- Full-screen overlay: `position: fixed; inset: 0; background: rgb(0 0 0 / 0.8); backdrop-filter: blur(4px)`
- Media max out at `95vw` x `90dvh`. With the controls above or below, the height cap drops by the bar's band (`100dvh - 2rem - 3.5rem`). With them at the sides, the width cap is `100vw - 7.5rem`, so the buttons never sit on the image
- Close: click backdrop or press Escape
- Animation: same-document view transition. The clicked thumbnail and the lightbox media share one `view-transition-name` (`image-inspect-media`), never both at once. `<html>` is renamed `root` for the transition so the scrim crossfades; Astro's own root name has animations off. Open 220ms (`--duration-drawer`), close 140ms, both `--ease-out`. Close morphs back to the thumbnail of the image shown now, after scrolling its strip to reveal it.
- Fallback: scrim-only fade (220ms in / 140ms out) when `document.startViewTransition` is missing, an Astro navigation is running, or the thumbnail is still off screen. Reduced motion swaps with no animation.
- Carousel (galleries with more than one item): square previous and next buttons (44px) with a counter between them, ArrowLeft and ArrowRight, touch swipe on the stage (pointer events, 60px or a flick commits, rubber band at the ends), and a polite live counter. No wrap: the end button is `aria-disabled`. Neighbor images preload. Only the current video mounts and plays. Tab stays inside the dialog. Focus returns to the current item's thumbnail.
- Controls placement is chosen once per gallery from its tallest media, so the buttons do not jump between slides: `data-controls="above"` from 768px wide, `"below"` (centered) on phones, and `"sides"` (vertically centered at the edges, media padded by 3.75rem per side) only when making room for the bar would shrink the media by more than 8%, for example a landscape phone. Video ratios are unknown until metadata loads and default to 16:9.

### Usage

```astro
<MediaGallery images={experience.images} experienceName={experience.name} variant="desktop" />
```

`MediaGallery.astro` is the Astro wrapper. It processes image paths and passes `GalleryMedia[]` to the Svelte island. Hydrated with `client:visible`. Public `.webp` files are not processed by Astro, so it reads their real width and height with `sharp`; a wrong `width`/`height` attribute gives a strip thumbnail the wrong box until it loads.

### Known issues

- **No zoom/pan.** Images display at fixed max dimensions.
- **Swipe shows one slide.** The dragged slide moves alone; neighbors do not peek in from the side.
- **Video scrub on touch can swipe.** A horizontal drag on a lightbox video's native controls also counts as a carousel swipe.
- **An Astro navigation during a morph** skips the morph. That one navigation then uses the default root crossfade.

## Icon

**File**: `src/components/ui/Icon.svelte`

Renders a pixel-art SVG icon from the `pixelarticons` set. Icons are defined as path data in `src/icons/pixelarticons.ts`.

```svelte
<Icon name="arrow-right" class="w-4 h-4" />
```

Icon is purely visual (`aria-hidden="true"`). Use it next to text for interactive elements, not alone.

## Buttons

Two base button styles, defined in `src/styles/global.css`:

| Class | Background | Border | Text | Hover |
| --- | --- | --- | --- | --- |
| `.btn-primary` | `--color-primary` | none | `--color-text-inverse` | Darker blue, shadow |
| `.btn-secondary` | transparent | 1px solid `--color-text-secondary` | `--color-text-primary` | Blue border, blue text |

Two custom variants (used in specific pages):

| Class | Background | Usage |
| --- | --- | --- |
| `.btn-secondary-custom` | `--tag-personal` (green) | All three project links |

All buttons: `padding: var(--spacing-sm) var(--spacing-md)`, `border-radius: var(--radius-md)`, `display: inline-flex`, `gap: var(--spacing-xs)`.

### When to use which

**The decision rules now live in [usage.md](./usage.md) — follow that section** (it records that `.btn-primary`/`.btn-secondary` have zero call sites and that `.btn-primary` needs a dark-mode color fix before first use, and it gives the flowchart for link vs island button vs project-link class).

The class set is closed: `btn-primary`, `btn-secondary`, `btn-secondary-custom`. Do not create a fourth without editing both this file and [usage.md](./usage.md).

## ExperienceTable

**File**: `src/components/home/ExperienceTable.astro`

A spreadsheet-like layout on a shared `.experience-grid` from 1024px: a 1.25fr name column, then nine equal columns. Columns: Experience name (1), Role (2), Tags (2), Date (1), Media (4). The header and every row use the same template and gutters (16px, 24px from 1280px), so the header labels, which sit on the header row's baseline 8px above the rule, align with the row cells. Names break only after an acronym or at a camelCase step (`nameBreakParts`), never mid-word.

- Header row is `sticky top-0` with a type filter dropdown
- Filter uses `data-filter` attribute on the container; CSS rules hide rows by `data-type`
- The table reserves height for the unfiltered view to prevent layout shift when filtering
- The section sets `tracking-normal`: the global −0.015em is for headings and crowds 14px cell text. The header labels keep their own uppercase tracking, and the date cell sets `tracking-[-0.02em]` because the 71px Date column wraps `2024-2025` at any looser value
- A row's description (`ProjectEnhancedDescription.astro`) is 14px on `--leading-normal` (1.55) in `--description-text`, `oklch(0.464 0 0)` in light mode (6.9:1, APCA Lc 84), and `--color-text-secondary` in dark mode. Project links inside it inherit that color
- An ongoing row's date reads `2026-now` (`formatDateRange` in `experienceUi.ts`); the data sentinel `endDate: "..."` is unchanged

### ExperienceRow

**File**: `src/components/home/ExperienceRow.astro`

Each row has two layouts:
- **Desktop** (`lg:grid lg:grid-cols-10`): name, role, tags, date, media gallery side by side
- **Mobile** (`lg:hidden`): stacked vertically with name, role, date in a flex row

Experience names use `experienceNameStyle()` which applies Lumber Sans font for certain names and color-codes by type.

## MarkdownBody

**File**: `src/components/content/MarkdownBody.astro`

Renders markdown content with custom styling. Uses `.markdown-body` class with nested selectors for h1, h2, h3, ul, li, a, p.

- Links inherit the surrounding text color and carry the shared dotted underline
- Lists use `*` bullets (not default markers)
- Line height: 1.625

### Usage

```astro
<MarkdownBody content={content} />
```

## Home

**File**: `src/components/home/Home.astro`

Top of the front page: the `.text-lead` personal statement (`personalStatement` in `src/lib/experience.ts`), then the `ExperienceTable`. The statement is split on `<br><br>` into two columns, and its closing sentence is rewritten in `Home.astro` to point at `/about` and `/canon` — that file is never staged, so copy edits that must ship live in the component.

## WeatherBanner

**File**: `src/components/weather/WeatherBanner.svelte`

Layered Oregon landscape strip. Mounted in `SiteLayout` as `client:only="svelte"`. Place is chosen once per visit; weather comes from coarse IP plus Open-Meteo, with a clear-sky fallback.

- `landscapes.ts` defines opaque back, middle, and foreground terrain. Each layer continues below its silhouette. Mount Hood has an asymmetric snow profile with dark ravines, a blue foothill ridge, varied fir clusters, and an apple orchard centered on its lanes, with 14, 10, and 8 trees from back to front so each depth spans the front row's width, converging uphill toward the summit. Seeded tree spacing and size variation soften the planted grid. Larger, lobed tree canopies fill narrower lane gaps. Whole-tree silhouettes remain distinct, with seeded groups of two or three apples near canopy centers. Pale meadow, green canopies, and a darker cool forest band keep separate values. Foreground fir selection uses each tree center to preserve whole silhouettes. Painted Hills has a hazy blue-grey back range, thin contour-following rust, ochre, cream, and olive strata, downhill rills, and a straw foreground with rabbitbrush. Smith Rock has unequal towers and V notches, a separate Monkey Face pillar, warm ochre planes, cooler mauve-grey shaded faces, and deep cracks. Green banks border both sides of the curved Crooked River. Rounded boulders sit in the water, and low sagebrush and junipers frame a dirt riverbank trail with rounded bank boulders. The Gorge has asymmetric overlapping blue ridges, stepped basalt headlands, a flowing waterfall, and Crown Point with a domed Vista House above a steep columnar basalt wall. An opaque basalt and brush bank contains the river above the bottom edge. Haystack Rock has a broad flared basalt base, a blunt pyramid summit, a steeper left face, and a longer right ridge. A detached two-pinnacle islet sits in the water to the left, with one thin needle to the right, each about one fifth of the main rock height. Vertical chutes divide the cool left face and warm tan-olive right face; green vegetation caps the summit and enters the upper gullies. A soft waterline mist band and pulsing white breakers surround the bases. Shoreward waves cross a wide beach with a faint vertical rock reflection in the wet sand. Coastal tide pools contain a fixed starfish, breathing anemones, rising bubbles that pop, and a crab with pauses.
- `draw.ts` samples terrain at 672×192 per layer, including four logical pixels of margin on each side, into one RGBA atlas. WebGL uploads the full atlas when the place changes. At 24 samples per elapsed second, it updates bounded rectangles for moving materials. Each patch repaints the underlying material before adding moving subjects, then uploads the complete patch. Repeated draws within a sample reuse the atlas. All material colors receive the shared lighting and final dither. `buffer.ts` retains the 160×48 logical coordinate system and deterministic noise seed.
- `glBanner.ts` uses linear texture filtering and renders at the displayed size, capped at 2× device pixel ratio. `weatherShader.ts` applies sky gradients, terrain light, atmospheric depth, sun or moon glow, weather tint, vignette, then quantizes the complete shaded frame to 24 levels per channel. A 4×4 Bayer matrix selects adjacent levels in fixed 2 CSS-pixel screen cells, including at DPR 2. Terrain, clouds, rain, and glow move through this pattern. No noise overlay is added.
- `palette.ts` provides one lighting table for **day**, **golden hour**, and **night**. Dawn and dusk both select golden hour. The table supplies sky, ambient terrain light, direct light, and weather colors. Two Vista House windows receive warm light at night from this table in WebGL and the CPU fallback, before haze and final quantization. Their bounds come from `landscapes.ts` and follow the middle layer. Dark mode scales this shared light by 0.88, except at night: there `DARK_NIGHT_LIFT` (1.35) scales sky, ambient, and direct light, so the night banner is not darker than the dark page (upper sky L 0.175 to 0.209, gorge ground L 0.158 to 0.191). Windows, flash, stars, and moon keep their values. Light-mode night is unchanged. Live golden hour runs from 45 minutes before sunrise to 50 minutes after, and from 50 minutes before sunset to 45 minutes after. Without solar data, local clock ranges are 05:00–07:30 and 17:30–20:00.
- Layers oscillate with a shared **30-second sine cycle**. Amplitudes are **±0.75 / ±1.5 / ±3 logical pixels**, back to front. Time zero is centered. The 160-pixel window samples a 168-pixel atlas with `CLAMP_TO_EDGE`; landmarks never wrap or repeat. The margins also contain the linear filter footprint at both extremes.
- Reduced motion holds time at zero. The animation loop stops when the document is hidden or the banner leaves the viewport. It resumes from the held time. Scene overrides and resize events still repaint a reduced-motion frame.
- Rain has three angled depth layers, ground ripples, smooth gust-driven density and speed, and continuously changing streak lengths. `lightning.ts` uses seeded exponential waiting times after a four-second quiet period, with a seven-second exponential mean and a 15% chance of a double flash. The schedule does not loop; seeks reproduce the same frame. Each strike lasts 253 ms. It reaches its 1.0 peak on the first frame with no ease-in, holds for 12 ms, then decays steeply (rate 9 over the strike) to exactly zero at the end. One or two seeded return strokes re-brighten the decay 50 to 160 ms in, so it flickers. Bolt vertices come from `lightning.ts` as uniforms, not from shader hashes. A double keeps its first channel lit with a dim afterglow, like continuing current: 0.35 × e^(−t/0.5 s), channel and halo only, with no scene lift. A second, bluer strike follows 0.45–0.75 s after the first strike's onset, at 50–67% brightness. It shares the first channel through vertex 3–5 of 10, then branches on a new seed to a ground point 6–14 logical pixels away, on the side away from the first channel's lower half. Its current re-lights the shared upper channel at 35% of its brightness. The afterglow tapers to zero as the second strike ends. Only the afterglow overlaps the second strike; the two bright flashes never overlap. Single strikes have no afterglow. Origins span the scene from 8 to 152 logical pixels. A tight main channel carries diminishing forks that split again, with a halo and bloom measured from each strike's own path. Day and golden-hour storms dim the lit scene before the flash: a 25% mix toward a cool gray (oklch hue 245, chroma 0.02) and a 12–28% multiplier that dims bright texels most and shadows least, so terrain stays readable. Night is not dimmed. The palette flash lifts the scene above that baseline; the lift scales with the square of the pulse, so it is gone two frames after the peak, and the bolt core is mixed 60% toward white so it stays above the lifted sky. Flash colors come from `lighting()`. Time zero has no flash. Birds are absent for any positive rain intensity and appear only in clear weather or fog. Fog breathes slowly around three small birds with varied crossing speeds, heights, smooth wing strokes, and haze fades. Clear skies have drifting wisps, including a summit banner cloud at Mount Hood. Clouds are domain-warped five-octave fBm: heavier weather lowers the cover threshold so clouds grow as solid bodies, a sample above each texel lights their tops and shades their bellies, and rain (cloud 1) is fully overcast: from cloud 0.9 an overcast ramp fills the gaps between bodies with the shaded deck, carries the deck down to the horizon, and hides the sun, moon, and stars. Rain's shade color is 75% desaturated toward gray so those gaps do not read as blue sky; the billows still show through the lit tops and shaded bellies. Cloudy (0.78) and fog (0) sit below the ramp and are unchanged. Clear skies keep sparse puffs at 35% opacity. Fog is two drifting three-octave banks under a slow warp, dense in the middle and low scene over a thin base haze. All variation uses the same elapsed time as the terrain. Motes remain.
- Place motion uses deterministic elapsed time: waterfall streaks descend through a gently changing thread and base mist; an envelope-gated orchard gust travels gently across the seeded tree rows and reverses its lead over time, with a per-tree phase and ±10% rate so neighbors never sway in lockstep, a downwind lean under the oscillation, depth-based amplitude (front crowns about 1.5 logical pixels at peak, back crowns under 1), a trunk bend that carries each crown as one mass with tips leading and a slight dip, planted trunk bases, and layered branch, leaf-height, and canopy shading variation; rock-local river crests and short downstream wakes travel left to right with smooth three-second fade resets; coastal swells advance into a washing foam edge and wet-sand sheen; small striped hay bales roll and bounce along a 960-second sine path, slowing to reverse outside the visible region. These subjects live in their terrain layers and follow the layer oscillation. The same pause and time-zero rules apply to every subject. Orchard gusts repeat every 12 seconds with zero value and slope at the boundary. Bubble births, pops, wave resets, rain splashes, and drifting motes fade out with zero slope before wrapping. Bird crossings reset off-screen; rain streaks fade before cell boundaries. Waterfall, surf, crab, and anemone motion use continuous phases.
- Weather states are `clear`, `cloudy`, `rainy`, and `fog`. Codes 0 and 1 map directly to `clear`; temperature and visibility no longer affect classification. A cached `sunny` reading fails schema validation and uses the clear fallback without logging. WeatherLab reads its selectors from this enum.
- Night stars have varied sizes and brightness. Golden-ratio offsets scatter them inside a coarse two-pixel lattice. Hashed phases and speeds drive a gentle bounded sine twinkle on the shared elapsed clock. Each star stays inside its cell; reduced motion holds varied static brightness at time zero. Stars pass through the same final dither at DPR 1 and 2.
- The sun uses a Gaussian core and wider radial glow. Golden hour has a larger warm bloom and daylight a gentle halo. The moon has an 8.4-logical-pixel disc, about 1.6 times the daylight sun reference diameter, with a stepped uneven limb, four dark maria, and a dim halo. CPU and WebGL share its radius and crater layout. Final quantization preserves the solid disc and crater contrast.
- `bannerSurface.ts` provides a still CPU fallback with the same terrain and lighting table when WebGL is unavailable. It approximates fog and radial sun or moon light, then uses the same 24-level Bayer quantizer at the displayed size. It uses a separate 2D canvas, including after shader initialization failure, and repaints on scene or size changes. The fallback remains still and does not draw rain, birds, or cloud animation.
- Enter: `SiteLayout` wraps the island in a static `.banner-frame` (same 160:48 ratio, sunken tint) so the nav does not jump while the island loads. The canvas stays at opacity 0 and blur 4px until it has painted a frame and the weather reading has settled, or 2 seconds have passed. It then fades and unblurs once over `--duration-media` on `--ease-out`, the same values as `.media-reveal`. Reveal is one way, so the lab's localize never hides it, and a `ClientRouter` swap does not replay it. Reduced motion keeps a short opacity fade with no blur.
- Place and last reading persist in `sessionStorage` (`oregon-banner-place-v1`, `oregon-banner-reading-v1`), so a reload doesn't re-pick the place
- The canvas carries an `aria-label` from `sceneLabel()`, so the scene reads as text
- `transition:persist="weather-banner"` keeps it mounted while the page body swaps
- `src/pages/api/weather.ts` reads `x-vercel-ip-*` headers, calls Open-Meteo with a 4s timeout, and answers **503** when coordinates are missing or upstream fails — the client then paints a clear-sky fallback
- `WeatherLab.svelte` is a dev/preview-only override panel, gated by `showWeatherLab()` in `src/lib/weather/lab.ts`. Its **localize** button clears every override, rolls a fresh random backdrop (persisted via `savePlace`), and re-fetches the live IP-synced reading — what a real visitor sees, minus the once-per-tab place roll

### Usage

```astro
<div class="banner-frame">
  <WeatherBanner client:only="svelte" showLab={showLab} transition:persist="weather-banner" />
</div>
```

## FloatingChat (the guide)

**File**: `src/components/chat/FloatingChat.svelte`

The floating "Ask Andrei" guide. Replaces the old `FullPageChat`. Mounted once in `SiteLayout.astro` with `client:load`, so it is present on every page.

- Portal-mounted (`.guide-dock` via the `portal` action) so it escapes page stacking contexts
- Trigger: `.guide-launch` button in the bottom-right corner, or the top-right corner from 72rem (1152px) up. `.guide-panel` (header, thread, input form) is always mounted and gated by CSS, so `aria-controls="guide-panel"` is constant
- One surface, two geometries. Both slide in from `--guide-hide` and hide with `visibility` once the slide ends:
  - Below 768px: a bottom sheet over the lower two thirds (`66dvh`), `--color-bg-primary` with `--elevation-sheet` cast upward, so it reads as a layer on top of the page. Closed: `translateY(100%)`.
  - From 768px up: a full-height drawer on the right edge, `--guide-width` wide (the page's two gutters minus page padding, clamped to 20–28rem). The page makes room: `:root[data-guide="open"] [data-page-scroll]` gets that much `padding-inline-end`, so content slides left and nothing sits under the drawer. Surface is `--color-bg-sunken` with a hairline (`--elevation-drawer`) and an eased shade (`--drawer-shade`, `.guide-panel::before`) fading inward from the page-facing edge only. Closed: `translateX(100%)`.
- Motion uses the shared tokens: open and close both `--duration-drawer` (220ms) on `--ease-in-out`, the same timing as the page shift; `prefers-reduced-motion` disables both; a guide restored from `sessionStorage` or `?chat=1` appears in place without sliding
- `SiteLayout.astro` sets `data-guide` on `<html>` before paint (on load and on every ClientRouter swap) from the stored state, so an open drawer never flashes the page full width. The island owns the attribute after hydration. Both read the key from `src/lib/guideState.ts`.
- The launcher (`--guide-launch-size` 2.25rem at a `--guide-launch-inset` corner inset) hides while the guide is open; the panel's close button replaces it. On desktop it hides only after the drawer has arrived, so no bare corner shows mid-slide.
- On desktop the drawer header uses the launcher's geometry: padding equals `--guide-launch-inset` (at least the safe-area inset) and the close button is `--guide-launch-size`. From 72rem up the launcher sits in the top-right corner, so the close button lands exactly on it and opening and closing happen in one spot. Below 72rem each gutter beside the 64rem column is too narrow to hold the launcher without covering the banner's top corner, so it stays bottom-right. Phones keep the bottom-right launcher and the sheet's top-right close.
- Right-clicking the launcher dispatches `weather-lab:toggle`, which shows or hides the weather lab in any build (remembered for the tab session)
- Thread persists to `sessionStorage` under `andrei-guide-v1` (per-tab; cleared when the tab closes)
- An empty thread shows a centered empty state (max 38ch): a one-line hint, or the offline contact copy when the inference server is down

### Interaction and accessibility

- One close path (`closeGuide`) handles Escape, the close button, and outside clicks: it cancels an in-flight turn (AbortController) and returns focus to `.guide-launch` only when focus was inside the panel, after a tick so the launcher is visible and focusable again on desktop
- On open, focus goes to the input on fine pointers, or to the panel itself on touch (the panel is `tabindex="-1"`, so assistive tech lands inside without raising the keyboard)
- The thread is `aria-live="polite"` and the "Thinking…" indicator is `role="status"`
- Surfaces use `--color-bg-primary`, never `bg-white`; reply text is `break-words`, and only the message text is `whitespace-pre-wrap` (on the whole bubble it rendered the template's own newlines as a blank last line); linked sources use `--color-primary-text`, unlinked ones `--color-text-secondary`
- The close control is a quiet glyph button: 32px and pulled flush with the header padding on phones, 36px (`--guide-launch-size`) with no pull on desktop; a `::before` keeps its tap area at 44px on both. Send is 44px tall on touch and 36px on fine pointers, matching the input. Interactive elements in the panel set `touch-action: manipulation`

### Reply shape

`POST /api/chat` returns a `ChatApiSuccess` (`src/lib/chatTypes.ts`):

| Field | Meaning |
| --- | --- |
| `mode` | `notes` — answered from `src/content/memory` with no model involved; `model` — real inference |
| `sources` | `ChatSource[]`, rendered as small links under the reply |
| `action` | `none`, or `navigate { href, label, follow }` |

A `navigate` action renders under the reply as a small "→ Navigating to {href}" link, above the source links and separated from the text by a hairline. When `follow` is `true` the guide also navigates after 900ms, unless the visitor has started composing another question or focus is in the input (then the link stays the way through).

### Supporting modules

- `src/lib/guideReply.ts` — decides mode, action, and route; handles small talk and navigation intent
- `src/lib/memorySelect.ts` — selects `src/content/memory` sections and matches routes
- `src/lib/inference.ts` / `inferenceConfig.ts` — provider config (`MODEL_PROVIDER=local|hf`)
- `src/pages/api/health.ts` — reports configuration only; call with `?probe=1` to reach the model

The model is not called unless `GUIDE_MODEL=on`. `/chat` now redirects to `/?chat=1` to deep-link the guide open; the Chat nav link is gone.

## CursorTrail

**File**: `src/components/chrome/CursorTrail.svelte`

Pixel-art cursor trail effect. Renders a custom cursor as a small SVG square. Only active on desktop (`hover: hover` and `pointer: fine`).

## MediaGallery (Astro wrapper)

**File**: `src/components/gallery/MediaGallery.astro`

Processes image paths at build time:
- `.webm` files: served from `/images/` as video
- `.webp` files: served from `/images/` as static images
- Other formats: processed through Astro's image pipeline via `import.meta.glob`

Passes processed `GalleryMedia[]` to `ImageGallery.svelte`.
