# Components

Components are split between Astro (static composition) and Svelte (client state). Hydrate with `client:visible` or `client:idle` only where interaction needs JS.

## Nav

**File**: `src/components/nav/Nav.astro`

Static header: the name link, and nothing else. No nav boxes, no dropdown, no drawer — the weather-banner rewrite emptied the header out, so this is Astro markup with a scoped `<style>` and no hydration.

- `.site-nav` sets the row padding; `.nav-name` is the only link (`/`)
- `.nav-name` sets `color: var(--color-text-primary)` so the global green `a` color doesn't apply
- The bar sits on `--color-bg-primary` with a `border-b` hairline — no gradient wash, because it overlaps the top of the weather banner
- The name link carries `min-h-[44px]` for the touch minimum
- `transition:persist="site-nav"` keeps it mounted while `ClientRouter` swaps the page body

### Usage

```astro
<Nav transition:persist="site-nav" />
```

Page links live in the content instead of the header: the home statement links to `/about`, and social links sit in the footer. The `.nav-box` rules, social dropdown, and mobile drawer CSS were deleted along with `Nav.svelte`.

## SiteFooter

**Files**: `src/components/footer/SiteFooter.astro`, `src/components/footer/BeosIcon.astro`

Global footer rendered inside the scroll region, below the page slot.

- One list item per `socialNavItems` entry in `src/lib/navLinks.ts` (GitHub, LinkedIn, Substack, X)
- Each link opens in a new tab with `rel="noopener noreferrer"`
- `BeosIcon` maps the `icon` field (`person` / `mail` / `terminal` / `balloon`) to a 32px pixel-art SVG. The switch is exhaustive via `assertNever`, so a new `SocialIcon` without a glyph is a compile error
- Hairline `border-top` from `color-mix(in srgb, var(--color-text-primary) 12%, transparent)`, so it holds in both modes
- `transition:persist="site-footer"`

### Usage

```astro
<SiteFooter transition:persist="site-footer" />
```

## ImageGallery

**File**: `src/components/gallery/ImageGallery.svelte`

Horizontal-scroll thumbnail strip with a full-screen modal inspect overlay.

### Gallery strip

- `flex gap-2 flex-nowrap overflow-x-auto scrollbar-always-visible gallery-strip px-2`
- `.gallery-strip` adds `scroll-snap-type: x proximity` and `touch-action: pan-x`
- Thumbnails are `h-50 w-auto object-contain` (200px tall, natural width)
- All thumbnails render on mount; there is no `IntersectionObserver` gate. Offscreen images defer via native `loading="lazy"`
- Each thumbnail is a `<button>` with `cursor-zoom-in`

### Modal inspect

- Portal-mounted to `document.body` via `portal` action
- Full-screen overlay: `position: fixed; inset: 0; background: rgb(0 0 0 / 0.8); backdrop-filter: blur(4px)`
- Images max out at `95vw` x `90dvh`
- Close: click backdrop or press Escape
- Animation: `modal-enter` / `modal-exit` keyframes (opacity fade, 280ms)

### Usage

```astro
<MediaGallery images={experience.images} experienceName={experience.name} variant="desktop" />
```

`MediaGallery.astro` is the Astro wrapper. It processes image paths and passes `GalleryMedia[]` to the Svelte island. Hydrated with `client:visible`.

### Known issues

- **No prev/next navigation.** Users must close and reopen to see another image.
- **No swipe on mobile.** The gallery strip scrolls horizontally, but the modal has no gesture support.
- **No zoom/pan.** Images display at fixed max dimensions.
- **No keyboard nav in modal.** Only Escape works; no arrow keys to cycle images.

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
| `.btn-secondary-custom` | `--tag-personal` (green) | Project links |
| `.btn-accent-custom` | `--tag-school` (yellow) | Project links |

All buttons: `padding: var(--spacing-sm) var(--spacing-md)`, `border-radius: var(--radius-md)`, `display: inline-flex`, `gap: var(--spacing-xs)`.

### When to use which

Is it the primary action on the screen?
- Yes: `btn-primary`. One per view.
- No: `btn-secondary`. This is the default.

The custom variants (`btn-secondary-custom`, `btn-accent-custom`) are exceptions for project link styling. Do not create new button variants without adding them to this file.

## ExperienceTable

**File**: `src/components/home/ExperienceTable.astro`

A spreadsheet-like layout with 10-column grid on desktop. Columns: Experience name (1), Role (2), Tags (2), Date (1), Media (4).

- Header row is `sticky top-0` with a type filter dropdown
- Filter uses `data-filter` attribute on the container; CSS rules hide rows by `data-type`
- The table reserves height for the unfiltered view to prevent layout shift when filtering

### ExperienceRow

**File**: `src/components/home/ExperienceRow.astro`

Each row has two layouts:
- **Desktop** (`lg:grid lg:grid-cols-10`): name, role, tags, date, media gallery side by side
- **Mobile** (`lg:hidden`): stacked vertically with name, role, date in a flex row

Experience names use `experienceNameStyle()` which applies Lumber Sans font for certain names and color-codes by type.

## MarkdownBody

**File**: `src/components/content/MarkdownBody.astro`

Renders markdown content with custom styling. Uses `.markdown-body` class with nested selectors for h1, h2, h3, ul, li, a, p.

- Links use `--color-secondary` (green)
- Lists use `*` bullets (not default markers)
- Line height: 1.625

### Usage

```astro
<MarkdownBody content={content} />
```

## Home

**File**: `src/components/home/Home.astro`

Top of the front page: the `.text-lead` personal statement (`personalStatement` in `src/lib/experience.ts`, whose inline links lead to `/about` and the blog), then the `ExperienceTable`.

## WeatherBanner

**File**: `src/components/weather/WeatherBanner.svelte`

Dithered pixel strip that replaces the old ASCII hero. Mounted in `SiteLayout` as `client:only="svelte"`. Place is chosen once per visit; weather comes from coarse IP plus Open-Meteo, with a clear-sky fallback.

- Rendered at 160×48 (`BANNER_WIDTH` / `BANNER_HEIGHT` in `src/lib/weather/buffer.ts`), Bayer-dithered, then scaled to the page column up to `MAX_BANNER_SCALE` (5×)
- `src/lib/weather/glBanner.ts` composites it in a WebGL shader; `draw.ts` renders the same `PixelBuffer` for the plate and lab paths
- `palette.ts` owns the color ramps; `landscapes.ts` and `effects.ts` paint terrain, rain, and fog
- Place and last reading persist in `sessionStorage` (`oregon-banner-place-v1`, `oregon-banner-reading-v1`), so a reload doesn't re-pick the place
- The canvas carries an `aria-label` from `sceneLabel()`, so the scene reads as text
- `transition:persist="weather-banner"` keeps it mounted while the page body swaps
- `src/pages/api/weather.ts` reads `x-vercel-ip-*` headers, calls Open-Meteo with a 4s timeout, and answers **503** when coordinates are missing or upstream fails — the client then paints a clear-sky fallback
- `WeatherLab.svelte` is a dev/preview-only override panel, gated by `showWeatherLab()` in `src/lib/weather/lab.ts`

### Usage

```astro
<WeatherBanner client:only="svelte" showLab={showLab} transition:persist="weather-banner" />
```

## FloatingChat (the guide)

**File**: `src/components/chat/FloatingChat.svelte`

The floating "Ask Andrei" guide. Replaces the old `FullPageChat`. Mounted once in `SiteLayout.astro` with `client:load`, so it is present on every page.

- Portal-mounted (`.guide-dock` via the `portal` action) so it escapes page stacking contexts
- Collapsed: `.guide-launch` button in the bottom corner. Expanded: `.guide-panel` with header, thread, and input form
- Thread persists to `sessionStorage` under `andrei-guide-v1` (per-tab; cleared when the tab closes)
- Cold start shows three starter prompts instead of an empty thread

### Interaction and accessibility

- One close path (`closeGuide`) handles Escape, the close button, and outside clicks: it cancels an in-flight turn (AbortController) and returns focus to `.guide-launch` only when focus was inside the panel
- On open, focus goes to the input on fine pointers, or to the panel itself on touch (the panel is `tabindex="-1"`, so assistive tech lands inside without raising the keyboard)
- The thread is `aria-live="polite"` and the "Thinking…" indicator is `role="status"`
- Surfaces use `--color-bg-primary`, never `bg-white`; reply text is `break-words`; source chips use `--color-text-secondary` (`--color-text-muted` cannot reach 4.5:1 on a light surface)
- Prompts, Send, and `.guide-action` are at least 44px tall, and interactive elements in the panel set `touch-action: manipulation`

### Reply shape

`POST /api/chat` returns a `ChatApiSuccess` (`src/lib/chatTypes.ts`):

| Field | Meaning |
| --- | --- |
| `mode` | `notes` — answered from `src/content/memory` with no model involved; `model` — real inference |
| `sources` | `ChatSource[]`, rendered as small links under the reply |
| `action` | `none`, or `navigate { href, label, follow }` |

A `navigate` action renders as `.guide-action` — a button with the `hammer` icon and the route label. When `follow` is `true` the guide also navigates after 900ms, unless the visitor has started composing another question or focus is in the input (then the action link stays the way through).

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
