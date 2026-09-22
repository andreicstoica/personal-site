<script lang="ts">
  import {
    BANNER_HEIGHT,
    BANNER_WIDTH,
    displayScale,
  } from "../../lib/weather/buffer";
  import { renderScene } from "../../lib/weather/draw";
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
  let reduceMotion = $state(false);
  let placeOverride = $state<Place | null>(null);
  let weatherOverride = $state<Weather | null>(null);
  let timeOverride = $state<TimeOfDay | null>(null);
  let colorOverride = $state<ColorMode | "system">("system");
  let displayWidth = $state(BANNER_WIDTH * 2);
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let slotEl = $state<HTMLDivElement | null>(null);

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
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      systemMode = colorQuery.matches ? "dark" : "light";
      reduceMotion = motionQuery.matches;
    };
    apply();
    colorQuery.addEventListener("change", apply);
    motionQuery.addEventListener("change", apply);
    return () => {
      colorQuery.removeEventListener("change", apply);
      motionQuery.removeEventListener("change", apply);
    };
  });

  $effect(() => {
    const slot = slotEl;
    if (!slot) return;
    const apply = () => {
      const scale = displayScale(slot.clientWidth);
      displayWidth = BANNER_WIDTH * scale;
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(slot);
    return () => observer.disconnect();
  });

  $effect(() => {
    const canvas = canvasEl;
    const current = scene;
    const still = reduceMotion;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    let frame = 0;
    let raf = 0;
    const draw = () => {
      const image = renderScene(current, still ? 0 : frame);
      const pixels = new Uint8ClampedArray(image.data.byteLength);
      pixels.set(image.data);
      ctx.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
      if (still) return;
      frame += 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  });
</script>

<div
  class="banner-slot"
  bind:this={slotEl}
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
    width={BANNER_WIDTH}
    height={BANNER_HEIGHT}
    aria-hidden="true"
    style="width: {displayWidth}px;"
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
    max-width: 800px;
    min-width: 0;
    margin: 0.75rem auto 0.45rem;
    display: flex;
    justify-content: center;
  }

  .banner-canvas {
    display: block;
    max-width: 100%;
    height: auto;
    aspect-ratio: 160 / 48;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
  }
</style>
