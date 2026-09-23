# Components

Components are split between Astro (static composition) and Svelte (client state). Hydrate with `client:visible` or `client:idle` only where interaction needs JS.

## Nav

**File**: `src/components/nav/Nav.svelte`

Desktop: row of bordered boxes aligned to the bottom-right. Mobile: slide-in drawer from the right.

### Desktop nav boxes

The `.nav-box` class is the core nav element. It is defined in `src/styles/global.css` as a plain CSS class. Do not use Tailwind utilities to recreate it.

| State | Style |
| --- | --- |
| Default | White background, gray border, text primary |
| Hover | Blue background, blue border, white text |
| Active (pressed) | `transform: scale(0.98)`, 160ms |
| Focus | 2px solid `--color-primary` outline |

The "Social" item has a dropdown panel. It opens on hover (desktop) and click (pinned). The dropdown uses `transform: scale(0.98) translateY(-4px)` for enter and reverses for exit.

### Mobile drawer

Slides in from the right with `translate-x-full` to `translate-x-0`. Overlay fades in with `opacity 0` to `1`. Social links expand with `grid-template-rows: 0fr` to `1fr`.

### Touch targets

The name link, the mobile menu toggle, the drawer close button, and mobile links carry `min-h-[44px]` / `min-w-[44px]` so they meet the 44px minimum on touch.

### Usage

```astro
<Nav mainNavItems={mainNavItems} socialNavItems={socialNavItems} client:load />
```

Nav is always hydrated with `client:load` because it manages open/close state.

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

## AsciiHero

**File**: `src/components/home/AsciiHero.astro`

Full-width hero with personal statement text on the left and an ASCII art canvas on the right. The canvas renders a webcam/image as ASCII characters using `AsciiCanvas.svelte`.

- Text: `.text-lead` class (17px, relaxed line height)
- Canvas: monospace font, `line-height: 0.7`, blue glow effect
- Canvas sizes: 350px (mobile), 500px (desktop), 650px (large desktop)
- Glow animation: `ascii-glow` keyframes (brightness/contrast oscillation, 3s infinite)

## FloatingChat (the guide)

**File**: `src/components/chat/FloatingChat.svelte`

The floating "Ask Andrei" guide. Replaces the old `FullPageChat`. Mounted once in `SiteLayout.astro` with `client:load`, so it is present on every page.

- Portal-mounted (`.guide-dock` via the `portal` action) so it escapes page stacking contexts
- Collapsed: `.guide-launch` button in the bottom corner. Expanded: `.guide-panel` with header, thread, and input form
- Thread persists to `localStorage` under `andrei-guide-v1`
- Cold start shows three starter prompts instead of an empty thread

### Reply shape

`POST /api/chat` returns a `ChatApiSuccess` (`src/lib/chatTypes.ts`):

| Field | Meaning |
| --- | --- |
| `mode` | `notes` — answered from `src/content/memory` with no model involved; `model` — real inference |
| `sources` | `ChatSource[]`, rendered as small links under the reply |
| `action` | `none`, or `navigate { href, label, follow }` |

A `navigate` action renders as `.guide-action` — a button with the `hammer` icon and the route label. When `follow` is `true` the guide also navigates after a delay.

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
