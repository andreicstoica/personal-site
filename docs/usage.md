# Usage — when to use what

Component decisions, in template form. What the components *are* lives in [components.md](./components.md); token rules in [tokens.md](./tokens.md).

## Button

Use for actions. Navigation is a Link — the nav name (`Nav.astro:2`), footer socials (`SiteFooter.astro:22`), and guide source chips (`FloatingChat.svelte:394`) are all links, and links are green (`--color-secondary`) by default.

Classes: `.btn-primary`, `.btn-secondary`, `.btn-secondary-custom`. Nothing else exists — a fourth class is a bug, not an option.

- `.btn-secondary` — the default for a new button in Astro markup: transparent, `--color-text-primary`, hairline border; safe in both color modes (`global.css:320`).
- `.btn-primary` — the single most important action on a screen; one per view. **Zero call sites today, and broken as-is**: its `color: var(--color-text-inverse)` (`global.css:293`) drops to #272727 on the unthemed blue in dark mode = 2.5:1. Do not add a usage until that color becomes `white`.
- `.btn-secondary-custom` (green) — locked to the project page "Links" section (`ProjectLinks.astro:26,34,42`); all three links share it. Never use it anywhere else; it's page branding, not a style.
- In a Svelte island there is no shared class — copy the guide's Send button (`FloatingChat.svelte:432`): `bg-[var(--color-primary)] text-white rounded-none min-h-[44px]`. 44px is the site-wide touch minimum (`Nav.astro:13`); the footer social links sit at 40px (`SiteFooter.astro:74`), the one deliberate exception — they are text links with a full-width row, not standalone targets.

```
Is it navigation? → Link (green by default; nav/footer override to --color-text-primary)
 └ No, an action
      ├── In a project page "Links" section → btn-secondary-custom
      ├── Inside a Svelte island → guide idiom (bg-primary + text-white + rounded-none + min-h-[44px])
      └── Astro markup elsewhere → btn-secondary (default); btn-primary only after its dark fix
```

```astro
<!-- Correct — ProjectLinks.astro:53 -->
<a href={link.href} class={`${link.className} inline-flex items-center px-4 py-2 transition-colors`}>

<!-- Incorrect — no ghost variant exists, and inventing a class forks the system -->
<a href="/about" class="btn-ghost">About</a>
```

## Island or static Astro

Static `.astro` is the default; an island is a cost you justify. Hydration directives, from real call sites:

```
Does it need client JS?
 ├── No → plain .astro (Nav, SiteFooter, Home, CollectionPage).
 │        Behavior without component state uses a scoped <script> instead —
 │        ExperienceTable.astro:45 does exactly that; don't island it.
 └ Yes
      ├── Server markup would be wrong/blank (WebGL canvas, once-per-visit pick)
      │    → client:only="svelte"          (WeatherBanner, SiteLayout.astro:23)
      ├── Must be interactive at first paint on every page (the guide)
      │    → client:load                   (FloatingChat, SiteLayout.astro:41)
      ├── Decorative chrome that can wait a frame
      │    → client:idle                   (CursorTrail, RootLayout.astro:35)
      └── Media below the fold
           → client:visible                (MediaGallery.astro:64)
```

- Add `transition:persist` only to regions that must survive `ClientRouter` page swaps. Existing keys are exactly `weather-banner`, `site-nav`, `cursor-trail`, `site-footer` (`SiteLayout.astro:25`, `Nav.astro:1`, `RootLayout.astro:35`, `SiteFooter.astro:15`); a fifth key needs a new persistent region, not a duplicate mount.
- Why not `client:load` everywhere: it hydrates on every page view for content most visitors never touch. `client:visible`/`client:idle` defer that work; `client:only` avoids a hydration mismatch, not a perf win — reach for it only when the server markup is meaningless.

## Icon

Pixel-art icon from the `pixelarticons` set. Use it *next to text* in interactive elements; never as the sole carrier of meaning — it renders `aria-hidden="true"` by design (`Icon.astro:23`).

- **`Icon.astro` in Astro markup, `Icon.svelte` only inside a Svelte island.** They're the same SVG; picking the Svelte one in an `.astro` file buys nothing and adds an import across the boundary. Real pair: `ProjectLinks.astro:59` (Astro), `FloatingChat.svelte:452` (Svelte).
- Props: `name` (the `PixelarticonName` union — a new icon means new path data in `src/icons/pixelarticons.ts`, not a string), `class` (default `w-6 h-6`), `id`. Fill is `currentColor` — color comes from the surrounding text, never a `fill-` utility.
- Alternative: the footer's four social glyphs are `BeosIcon.astro` (24px pixel art), whose `kind` union (`person`/`mail`/`terminal`/`balloon`, `navLinks.ts:6-11`) is `assertNever`-checked. New social entry without a glyph = compile error.

```astro
<!-- Correct — ProjectLinks.astro:59: icon + text label -->
<Icon name={link.icon} class="w-5 h-5 mr-2" />{link.label}

<!-- Incorrect — icon-only control: aria-hidden svg = nothing to announce -->
<button><Icon name="chat" class="w-4 h-4" /></button>
```

(If an icon must stand alone, copy `FloatingChat.svelte:446` and give the *button* an `aria-label`.)

## Experience-name chip

The colored type chip exists once, generated by `experienceNameStyle(name, type)` (`experienceUi.ts:17`). Type union is closed: `personal`, `work`, `school`, `other` (`types.ts:1-6`) → `--tag-personal`, `--tag-work`, `--tag-school`, `--tag-other`, each with theme-invariant ink (`--tag-personal-text`, `--tag-work-text`, `--tag-school-text`, `--tag-other-text`) kept outside the dark block. Never hand-roll `background-color: var(--tag-*)`.

- Neutral chips — tech badges and tag spans alike — use `bg-(--color-bg-secondary)` + inherited `--color-text-primary` (`ExperienceRow.astro:52`, `ProjectDisplay.astro:30`): 8.6:1 light / 12.5:1 dark. One pattern, both places.
- Chip text must hold 4.5:1 against its fixed fill — that's why neutral chips take `--color-text-primary` and never `--color-text-muted` (2.8:1 on light), and colored chips take `--tag-*-text` rather than the flipping text tokens (white on `--tag-personal` is 1.3:1).
- The chip stays `display: inline`, never inline-block (`experienceUi.ts:14`): a wrapped name paints one cloned box per line, each hugging its own line's width. `line-height: 1.6` parts the lines into visibly separated stacked bars — at `1` the fragments merged into a single slab that read as one full-column highlight. `line-clamp-2` lives on an outer wrapper, never on the chip itself — `-webkit-box` would override `display: inline` and slab the background across the whole column (`ExperienceRow.astro`). Both chips sit inside an `overflow-hidden` wrapper, so every face's painted top clips flush right under the row's separator (Plex Sans, Plex Serif and LumberSans all land the same way, no per-face margin tuning).
- Lumber Sans applies to the chip only via `usesDisplayFont` (`experienceUi.ts:3`) — a name that isn't literally "Lumber Sans" gets no display face. Because the face is all-caps, the whole Lumber row (name, tags and role, all via `displayRowStyle`) steps down to `0.8rem` so its cap-height presence matches the mixed-case Plex rows instead of looming over them.

```astro
<!-- Correct — ExperienceRow.astro -->
<span class="line-clamp-2">
  <span style={experienceNameStyle(experience.name, experience.type)}>{experience.name}</span>
</span>

<!-- Incorrect — hand-built chip invents a fifth color assignment -->
<span style="background-color: var(--tag-brand)">Refract</span>
```

## MediaGallery

Images that should open in the fullscreen modal inspect go through `MediaGallery`. Alternative: a single non-inspectable image is an inline `<img use:mediaReveal class="media-reveal">` (`patterns.md` — every image/video gets `media-reveal`, no exceptions).

Variants: `desktop`, `mobile`. Nothing else exists (`types.ts:50`), default `desktop`.

- `desktop` — adds `col-span-4`; correct only inside the 10-column experience grid (`ImageGallery.svelte:31-40`).
- `mobile` — no column class; the stacked `lg:hidden` layout (`ExperienceRow.astro:105`). The row renders both; the variant matches the layout, not the device.

```astro
<!-- Correct — about.astro:12 -->
<MediaGallery images={["about.webp"]} experienceName="About" variant="desktop" />

<!-- Incorrect — grid doesn't exist; it fails the assertNever-style union -->
<MediaGallery images={images} experienceName="X" variant="grid" />
```
