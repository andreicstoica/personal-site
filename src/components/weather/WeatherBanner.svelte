<script lang="ts">
  import { untrack } from "svelte";
  import { mountBanner, whenBannerReady } from "../../lib/weather/bannerSurface";
  import { BANNER_HEIGHT, BANNER_WIDTH } from "../../lib/weather/buffer";
  import {
    loadOrCreatePlace,
    loadReading,
    randomPlace,
    saveReading,
  } from "../../lib/weather/session";
  import {
    type ColorMode,
    fallbackReading,
    type Place,
    presentLiveWeather,
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
  const liveWeather = $derived(presentLiveWeather(reading.weather, liveTime));
  const scene = $derived({
    place: placeOverride ?? place,
    weather: weatherOverride ?? liveWeather,
    time: timeOverride ?? liveTime,
    colorMode: colorOverride === "system" ? systemMode : colorOverride,
  });
  const label = $derived(sceneLabel(scene));

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
    }, 60_000);
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
    let frame = 0;
    let surface = mountBanner(canvas);
    let cancelled = false;

    const paint = (now: number) => {
      if (!surface) return true;
      const current = untrack(() => scene);
      const still = motionQuery.matches;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width > 1 ? rect.width : BANNER_WIDTH * 2;
      const height =
        rect.height > 1 ? rect.height : width * (BANNER_HEIGHT / BANNER_WIDTH);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      surface.resize(width, height, dpr);
      surface.frame(current, still ? 0 : frame, still ? 0 : now / 1000);
      return still;
    };

    const draw = (now: number) => {
      if (paint(now)) return;
      frame += 1;
      drawRaf = requestAnimationFrame(draw);
    };

    const onMotion = () => {
      cancelAnimationFrame(drawRaf);
      frame = 0;
      if (paint(0)) return;
      drawRaf = requestAnimationFrame(draw);
    };

    const begin = () => {
      if (cancelled || !surface) return;
      motionQuery.addEventListener("change", onMotion);
      draw(performance.now());
    };

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
      motionQuery.removeEventListener("change", onMotion);
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
  />
{/if}

<style>
  .banner-slot {
    width: 100%;
    min-width: 0;
    margin: 0.65rem 0 0.35rem;
    display: block;
  }

  .banner-canvas {
    display: block;
    max-width: 100%;
    height: auto;
    aspect-ratio: 160 / 48;
  }
</style>
