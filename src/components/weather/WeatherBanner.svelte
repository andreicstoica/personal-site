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

  function browserStorage(): Storage | null {
    try {
      return sessionStorage;
    } catch {
      return null;
    }
  }

  const storage = browserStorage();
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

  async function fetchReading(): Promise<StoredReading> {
    try {
      const response = await fetch("/api/weather");
      const payload: unknown = await response.json();
      const parsed = weatherApiSchema.safeParse(payload);
      if (!response.ok || !parsed.success || !parsed.data.ok) {
        return fallbackReading();
      }
      return {
        weather: parsed.data.weather,
        sunrise: parsed.data.sunrise,
        sunset: parsed.data.sunset,
      };
    } catch {
      return fallbackReading();
    }
  }

  $effect(() => {
    if (readingSettled) return;
    let cancelled = false;
    void fetchReading().then((next) => {
      if (cancelled) return;
      reading = next;
      readingSettled = true;
      if (storage) saveReading(storage, next);
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
>
  <canvas
    bind:this={canvasEl}
    class="banner-canvas"
    aria-hidden="true"
    data-renderer="webgl"
    style="width: 100%;"
  ></canvas>
</div>

{#if showLab}
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
    margin: 0.5rem 0 0;
    display: block;
  }

  .banner-canvas {
    display: block;
    max-width: 100%;
    height: auto;
    aspect-ratio: 160 / 48;
  }
</style>
