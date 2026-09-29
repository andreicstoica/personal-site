<script lang="ts">
  import { untrack } from "svelte";
  import { mountBanner, whenBannerReady } from "../../lib/weather/bannerSurface";
  import { BANNER_HEIGHT, BANNER_WIDTH } from "../../lib/weather/buffer";
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
    type StoredReading,
    type TimeOfDay,
    timeOfDay,
    type Weather,
    weatherApiSchema,
  } from "../../lib/weather/scene";
  import WeatherLab from "./WeatherLab.svelte";

  let { showLab }: { showLab: boolean } = $props();

  // A slow lookup must not hold the banner back forever.
  const REVEAL_DEADLINE_MS = 2000;

  function browserStorage(): Storage | null {
    try {
      return sessionStorage;
    } catch {
      return null;
    }
  }

  const storage = browserStorage();

  const LAB_KEY = "oregon-banner-lab-v1";
  // Dev and preview builds show the lab by default; any build can toggle it
  // from the chat launcher's context menu (FloatingChat.svelte).
  const storedLab = storage?.getItem(LAB_KEY);
  let labToggled = $state<boolean | null>(
    storedLab == null ? null : storedLab === "on",
  );
  const labVisible = $derived(labToggled ?? showLab);

  $effect(() => {
    const onToggle = () => {
      labToggled = !(labToggled ?? showLab);
      try {
        storage?.setItem(LAB_KEY, labToggled ? "on" : "off");
      } catch {
        // Blocked storage: the toggle still lasts for this page.
      }
    };
    window.addEventListener("weather-lab:toggle", onToggle);
    return () => window.removeEventListener("weather-lab:toggle", onToggle);
  });
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
  let drawRaf = 0;
  let framePainted = $state(false);
  let revealDeadline = $state(false);
  // One way: the lab's localize resets readingSettled and must not hide a live banner.
  let revealed = $state(false);

  $effect(() => {
    if (framePainted && (readingSettled || revealDeadline)) revealed = true;
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
      surface.frame(current, still ? 0 : elapsed);
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
</script>

<div
  class="banner-slot"
  role="img"
  aria-label={label}
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

{#if labVisible}
  <WeatherLab
    place={scene.place}
    weather={scene.weather}
    time={scene.time}
    colorMode={colorOverride}
    onPlace={(next) => (placeOverride = next)}
    onWeather={(next) => (weatherOverride = next)}
    onTime={(next) => (timeOverride = next)}
    onColorMode={(next) => (colorOverride = next)}
    onLocalize={localize}
  />
{/if}

<style>
  .banner-slot {
    width: 100%;
    min-width: 0;
    display: block;
  }

  /* Hidden until the first frame has the located weather, then it comes into
     focus once. The frame in SiteLayout holds the box and its tint meanwhile. */
  .banner-canvas {
    display: block;
    max-width: 100%;
    height: auto;
    aspect-ratio: 160 / 48;
    opacity: 0;
    filter: blur(4px);
    transition:
      opacity var(--duration-media) var(--ease-out),
      filter var(--duration-media) var(--ease-out);
  }

  .banner-slot[data-ready="true"] .banner-canvas {
    opacity: 1;
    filter: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .banner-canvas {
      filter: none;
      transition: opacity var(--duration-ui) var(--ease-out);
    }
  }
</style>
