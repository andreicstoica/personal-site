# Patterns

Recurring behaviors and their rules.

## Image galleries

Two layers: the thumbnail strip (inline) and the modal inspect (portal).

### Thumbnail strip

- Horizontal scroll with visible scrollbar (`.scrollbar-always-visible`)
- Scroll snap: `.gallery-strip` applies `scroll-snap-type: x proximity` and `touch-action: pan-x`
- Thumbnails are 200px tall, natural aspect ratio
- All thumbnails render immediately; there is no `IntersectionObserver` gating. Offscreen images defer via native `loading="lazy"`
- Images use `loading="lazy"`, `decoding="async"`, explicit `width`/`height`
- Videos autoplay muted loop inline

### Modal inspect

- Portal-mounted to `document.body` (required for `position: fixed` to work correctly)
- Full-viewport overlay with blur backdrop
- Close: click anywhere on backdrop, or Escape key
- Body scroll locked via `html.image-inspect-open` class
- Animation: opacity fade 280ms in, 180ms out
- `overscroll-behavior: none` prevents browser back gesture

### What's missing (improvement targets)

1. **Prev/next navigation** in modal. Arrow keys and swipe gestures.
2. **Zoom/pan** for large images. Pinch-to-zoom on mobile, scroll-to-zoom on desktop.
3. **Image counter** ("2 of 5") in modal.
4. **Keyboard navigation** in gallery strip. Tab should move between thumbnails.
5. **Preload adjacent images** when modal opens.

## Media reveal

Images and videos fade in and unblur when loaded: `opacity: 0` with `filter: blur(4px)` transitions to `opacity: 1` with `filter: blur(0)` over 180ms. Implemented via the `mediaReveal` action in `src/lib/mediaReveal.ts`.

When media is already cached (ready before hydration), the action defers `is-loaded` by one `requestAnimationFrame` so the element paints at `opacity: 0` first. Without the deferral the browser skips the transition entirely.

```svelte
<img use:mediaReveal class="media-reveal" />
```

The action adds `is-loaded` class when the media is ready. CSS transitions handle the animation.

Rule: every image and video in the site must use `media-reveal` class and `use:mediaReveal` action. No exceptions.

## Dark mode

System-preference driven via `prefers-color-scheme: dark`. No manual toggle.

- Tokens swap at `:root` level in `global.css`
- Components use semantic tokens; dark mode is automatic
- ASCII art has a separate dark mode palette (brighter, more saturated)
- Scrollbar colors adjust for dark backgrounds

Rule: never hardcode light-mode colors in component code. Always use tokens.

## Scroll behavior

- `scrollbar-gutter: stable` on `html` and `.scrollbar-gutter-stable` prevents layout shift when scrollbar appears/disappears
- Experience table uses `overflow-y: auto` with `scrollbar-gutter: stable`
- Gallery strip uses `overflow-x: auto` with custom thin scrollbar styling

## Focus management

- Global `:focus-visible` ring: `2px solid var(--color-primary)`, `offset: 2px`
- Modal traps focus: `dialogRef.focus()` on open
- Guide panel closes on Escape, the close button, or an outside click, and hands focus back to `.guide-launch` when focus was inside (see [components.md](./components.md))

## Reduced motion

`@media (prefers-reduced-motion: reduce)` disables:
- All CSS transitions (set to `none`)
- All CSS animations (set to `none`)
- Media reveal animation (`.media-reveal` snaps to `opacity: 1`, no blur)
- Modal backdrop animation
- Nav hover transitions

Components that use `setTimeout` for animation (modal close) still fire but the visual change is instant.

## Custom scrollbar

`.scrollbar-always-visible` forces a thin scrollbar on horizontal scroll containers:
- 8px height, gray thumb, transparent track
- Dark mode: lighter thumb
- Hover: darker thumb (fine pointer only)

Used on gallery thumbnail strips.

## Pixel cursor

Custom SVG cursor defined on `html` element. 8x8 pixel square, black fill, white stroke. Falls back to `auto` on touch devices.

`.cursor-pixel` class is used for the cursor trail effect (fixed position, 8x8px, 50% opacity, fades out).
