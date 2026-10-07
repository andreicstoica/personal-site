<script lang="ts">
  import { untrack } from "svelte";
  import { mountBanner, whenBannerReady } from "../../lib/weather/bannerSurface";
  import { bannerLink } from "../../lib/weather/bannerLink.svelte";
  import { BANNER_HEIGHT, BANNER_WIDTH } from "../../lib/weather/buffer";
  import { playClick } from "../../lib/weather/clickSound";
  import {
    advanceScene,
    type BannerTarget,
    bannerTarget,
  } from "../../lib/weather/interact";
  import {
    loadOrCreatePlace,
    loadReading,
    randomPlace,
    savePlace,
    saveReading,
  } from "../../lib/weather/session";
  import {
    type ColorMode,
    fallbackReading,
    type Place,
    sceneLabel,
    captionWords,
    type StoredReading,
    type TimeOfDay,
    timeOfDay,
    type Weather,
    weatherApiSchema,
  } from "../../lib/weather/scene";
  import WeatherLab from "./WeatherLab.svelte";
  import {
    GEIST_STYLESHEET,
    parseTypeface,
    TYPEFACE_KEY,
    type Typeface,
  } from "../../lib/typeface";

  let { showLab }: { showLab: boolean } = $props();

  // Past this, a cold lookup opens on the fallback scene. The slide pushes the
  // page down, so a late open is worse than a brief weather swap.
  const REVEAL_DEADLINE_MS = 1200;

  // The latch covers a layout script that binds after this fires; the layout
  // owns the open attribute so the slide class is on before the height changes
  // (SiteLayout.astro).
  function announceBannerOpen(): void {
    const scope = window as Window & { __weatherBannerOpened?: boolean };
    if (scope.__weatherBannerOpened) return;
    scope.__weatherBannerOpened = true;
    window.dispatchEvent(new Event("weather-banner:ready"));
  }

  function browserStorage(): Storage | null {
    try {
      return sessionStorage;
    } catch {
      return null;
    }
  }

  const storage = browserStorage();

  const LAB_KEY = "oregon-banner-lab-v1";
  let labToggled = $state(storage?.getItem(LAB_KEY) === "on");
  const labVisible = $derived(showLab && labToggled);

  $effect(() => {
    const onToggle = () => {
      labToggled = !labToggled;
      try {
        storage?.setItem(LAB_KEY, labToggled ? "on" : "off");
      } catch {
        // Blocked storage: the toggle still lasts for this page.
      }
    };
    window.addEventListener("weather-lab:toggle", onToggle);
    return () => window.removeEventListener("weather-lab:toggle", onToggle);
  });
  // `?type=areal` works in any build, because `local()` only resolves where the
  // font is installed.
  const typeParam = new URLSearchParams(location.search).get("type");
  let typeface = $state<Typeface>(
    parseTypeface(
      typeParam ??
        (import.meta.env.DEV ? storage?.getItem(TYPEFACE_KEY) : null),
    ),
  );

  // The island persists across ClientRouter swaps, but each swap replaces the
  // root attributes and drops head nodes the new page lacks, so apply again.
  $effect(() => {
    const apply = () => {
      if (typeface === "geist" && !document.getElementById("typeface-geist")) {
        const link = document.createElement("link");
        link.id = "typeface-geist";
        link.rel = "stylesheet";
        link.href = GEIST_STYLESHEET;
        document.head.append(link);
      }
      if (typeface === "plex") delete document.documentElement.dataset.typeface;
      else document.documentElement.dataset.typeface = typeface;
    };
    apply();
    document.addEventListener("astro:after-swap", apply);
    return () => document.removeEventListener("astro:after-swap", apply);
  });

  function chooseTypeface(next: Typeface): void {
    typeface = next;
    try {
      storage?.setItem(TYPEFACE_KEY, next);
    } catch {
      // Blocked storage: the choice still lasts for this page.
    }
  }

  const cachedReading = storage ? loadReading(storage) : null;
  let place = $state<Place>(
    storage ? loadOrCreatePlace(storage) : randomPlace(),
  );
  let reading = $state<StoredReading>(cachedReading ?? fallbackReading());
  let readingSettled = $state(cachedReading !== null);
  let now = $state(Date.now());
  let systemMode = $state<ColorMode>("light");
  let placeOverride = $state<Place | null>(null);
  let weatherOverride = $state<Weather | null>(null);
  let timeOverride = $state<TimeOfDay | null>(null);
  let colorOverride = $state<ColorMode | "system">("system");
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let slotEl = $state<HTMLDivElement | null>(null);
  // The animation time of the last painted frame, for click hit tests.
  let paintedSeconds = 0;
  let drawRaf = 0;
  let framePainted = $state(false);
  let revealDeadline = $state(false);
  // One way: the lab's localize resets readingSettled and must not hide a live banner.
  let revealed = $state(false);

  // Wait for the located weather so the scene does not open on the fallback and
  // then swap. The frame is collapsed meanwhile, so the wait shows no empty box.
  $effect(() => {
    if (revealed || !framePainted || !(readingSettled || revealDeadline)) return;
    revealed = true;
    announceBannerOpen();
  });

  $effect(() => {
    const timer = window.setTimeout(() => {
      revealDeadline = true;
    }, REVEAL_DEADLINE_MS);
    return () => window.clearTimeout(timer);
  });

  const liveTime = $derived(
    timeOfDay(now, reading.sunrise, reading.sunset),
  );
  const liveWeather = $derived(reading.weather);
  const scene = $derived({
    place: placeOverride ?? place,
    weather: weatherOverride ?? liveWeather,
    time: timeOverride ?? liveTime,
    colorMode: colorOverride === "system" ? systemMode : colorOverride,
  });
  const label = $derived(sceneLabel(scene));
  const caption = $derived(captionWords(scene));

  /** Lab: clear every override, roll a fresh backdrop, refetch live weather. */
  function localize(): void {
    placeOverride = null;
    weatherOverride = null;
    timeOverride = null;
    colorOverride = "system";
    place = randomPlace();
    if (storage) savePlace(storage, place);
    readingSettled = false;
  }

  /** Null when live weather is unavailable, so the fallback is never cached. */
  async function fetchReading(): Promise<StoredReading | null> {
    // No browser geolocation: Vercel IP geo headers (city-level) already
    // locate /api/weather. The banner only needs a 4-class weather_code
    // bucket + sunrise/sunset, both stable within IP-geo error radius.
    // Local dev has no IP headers, so the route defaults to New York City.
    try {
      const response = await fetch("/api/weather");
      const payload: unknown = await response.json();
      const parsed = weatherApiSchema.safeParse(payload);
      if (!response.ok || !parsed.success || !parsed.data.ok) {
        return null;
      }
      return {
        weather: parsed.data.weather,
        sunrise: parsed.data.sunrise,
        sunset: parsed.data.sunset,
      };
    } catch {
      return null;
    }
  }

  $effect(() => {
    if (readingSettled) return;
    let cancelled = false;
    void fetchReading().then((next) => {
      if (cancelled) return;
      reading = next ?? fallbackReading();
      readingSettled = true;
      if (storage && next) saveReading(storage, next);
    });
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    const clock = window.setInterval(() => {
      now = Date.now();
    }, 900_000);
    return () => window.clearInterval(clock);
  });

  $effect(() => {
    const colorQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      systemMode = colorQuery.matches ? "dark" : "light";
    };
    apply();
    colorQuery.addEventListener("change", apply);
    return () => {
      colorQuery.removeEventListener("change", apply);
    };
  });

  $effect(() => {
    const canvas = canvasEl;
    if (!canvas) return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let elapsed = 0;
    let previous = 0;
    let visible = false;
    let surface = mountBanner(canvas);
    let cancelled = false;

    const paint = () => {
      if (!surface) return true;
      const current = untrack(() => scene);
      const still = motionQuery.matches;
      const rect =
        canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
      const width = rect.width > 1 ? rect.width : BANNER_WIDTH * 2;
      const height =
        rect.height > 1 ? rect.height : width * (BANNER_HEIGHT / BANNER_WIDTH);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      surface.resize(width, height, dpr);
      paintedSeconds = still ? 0 : elapsed;
      surface.frame(current, paintedSeconds);
      framePainted = true;
      return still || canvas.dataset.renderer === "plate";
    };

    const draw = (now: number) => {
      if (document.hidden || !visible) {
        previous = 0;
        return;
      }
      if (previous) elapsed += (now - previous) / 1000;
      previous = now;
      if (paint()) return;
      drawRaf = requestAnimationFrame(draw);
    };

    const resume = () => {
      cancelAnimationFrame(drawRaf);
      previous = 0;
      if (!document.hidden && visible) drawRaf = requestAnimationFrame(draw);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      resume();
    });
    observer.observe(canvas.parentElement ?? canvas);
    const resize = new ResizeObserver(() => {
      if (visible && !document.hidden) paint();
    });
    resize.observe(canvas.parentElement ?? canvas);
    const begin = () => {
      if (cancelled || !surface) return;
      motionQuery.addEventListener("change", resume);
      document.addEventListener("visibilitychange", resume);
      resume();
    };

    // Track scene changes even when reduced motion stops the animation loop.
    const stopSceneWatch = $effect.root(() => {
      $effect(() => {
        scene;
        if (visible && !document.hidden) paint();
      });
    });

    if (surface) {
      begin();
    } else {
      void whenBannerReady(canvas).then(() => {
        if (cancelled) return;
        surface = mountBanner(canvas);
        begin();
      });
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(drawRaf);
      motionQuery.removeEventListener("change", resume);
      document.removeEventListener("visibilitychange", resume);
      observer.disconnect();
      resize.disconnect();
      stopSceneWatch();
      surface?.destroy();
    };
  });

  // Sky cycles weather, land cycles place, the sun or moon cycles time.
  // Overrides never persist past this page.
  function advance(target: BannerTarget): void {
    const next = advanceScene(untrack(() => scene), target);
    if (target === "sky") weatherOverride = next.weather;
    if (target === "land") placeOverride = next.place;
    if (target === "sun") timeOverride = next.time;
    playClick(target);
  }

  // The guide's scene controls read and change the banner through this link.
  $effect(() => {
    bannerLink.scene = scene;
  });
  $effect(() => {
    bannerLink.advance = advance;
    return () => {
      bannerLink.advance = null;
      bannerLink.scene = null;
    };
  });

  // Clicks on the canvas are pointer only; the caption's words are the
  // keyboard and screen reader way to do the same.
  $effect(() => {
    const slot = slotEl;
    if (!slot) return;
    const onClick = (event: MouseEvent) => {
      if (!revealed) return;
      const rect = slot.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const cssPerPixel = rect.width / BANNER_WIDTH;
      const current = untrack(() => scene);
      const target = bannerTarget(
        current,
        ((event.clientX - rect.left) / rect.width) * BANNER_WIDTH,
        ((event.clientY - rect.top) / rect.height) * BANNER_HEIGHT,
        paintedSeconds,
        // A 44 CSS px target on small screens, about the glow on large ones.
        Math.max(7, 22 / cssPerPixel),
      );
      advance(target);
    };
    slot.addEventListener("click", onClick);
    return () => slot.removeEventListener("click", onClick);
  });
</script>

<!-- The layout measures this body, caption included, to open the frame. -->
<div class="banner-body" data-banner-body>
<div
  bind:this={slotEl}
  class="banner-slot"
  role="img"
  aria-label={label}
  data-banner-slot
  data-place={scene.place}
  data-weather={scene.weather}
  data-time={scene.time}
  data-color={scene.colorMode}
  data-ready={revealed}
>
  <canvas
    bind:this={canvasEl}
    class="banner-canvas"
    aria-hidden="true"
    data-renderer="webgl"
    style="width: 100%;"
  ></canvas>
</div>
<!-- Each word cycles its part of the scene, the same as a click on the sky,
     sun, or land, and is the keyboard and screen reader way to do it. -->
<p class="banner-caption">
  A <button
    type="button"
    class="banner-caption-word"
    aria-label="{caption.weather}, next weather"
    onclick={() => advance("sky")}>{caption.weather}</button
  >
  <button
    type="button"
    class="banner-caption-word"
    aria-label="{caption.time}, next time of day"
    onclick={() => advance("sun")}>{caption.time}</button
  >
  at <button
    type="button"
    class="banner-caption-word"
    aria-label="{caption.place}, next place"
    onclick={() => advance("land")}>{caption.place}</button
  >.
</p>
</div>

{#if labVisible}
  <WeatherLab
    place={scene.place}
    weather={scene.weather}
    time={scene.time}
    colorMode={colorOverride}
    {typeface}
    onPlace={(next) => (placeOverride = next)}
    onWeather={(next) => (weatherOverride = next)}
    onTime={(next) => (timeOverride = next)}
    onColorMode={(next) => (colorOverride = next)}
    onTypeface={chooseTypeface}
    onLocalize={localize}
  />
{/if}

<style>
  .banner-slot {
    width: 100%;
    min-width: 0;
    display: block;
    /* Keeps its height while `.banner-frame` is collapsed, so the renderer
       measures a real box and the slide clips rather than resizes. */
    aspect-ratio: 160 / 48;
    /* Quick repeat taps cycle the scene instead of zooming the page. */
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  /* The page's own background, over the frame's sunken placeholder. The end
     padding keeps the underline inside the frame, which clips. */
  .banner-caption {
    padding-block: 0.375rem 0.25rem;
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
    font-size: var(--text-xs);
    font-style: italic;
    line-height: 1rem;
    text-align: center;
    user-select: none;
  }

  /* The site's link mark: dotted, solid on hover. */
  .banner-caption-word {
    position: relative;
    text-decoration-line: underline;
    text-decoration-style: dotted;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.3em;
    text-decoration-color: color-mix(in oklch, currentColor 50%, transparent);
    touch-action: manipulation;
    transition: color var(--duration-ui) var(--ease-out);
  }

  /* A 32px target on a 16px line, short of the banner above. */
  .banner-caption-word::before {
    content: "";
    position: absolute;
    inset: -0.5rem -0.125rem;
  }

  @media (hover: hover) and (pointer: fine) {
    .banner-caption-word:hover {
      color: var(--color-text-primary);
      text-decoration-style: solid;
      text-decoration-color: currentColor;
    }
  }

  .banner-canvas {
    display: block;
    max-width: 100%;
    height: auto;
    aspect-ratio: 160 / 48;
  }
</style>
