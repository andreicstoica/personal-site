<script lang="ts">
  import type { PixelarticonName } from "../../icons/pixelarticons";
  import { bannerLink } from "../../lib/weather/bannerLink.svelte";
  import type { BannerTarget } from "../../lib/weather/interact";
  import { captionWords } from "../../lib/weather/scene";
  import Icon from "../ui/Icon.svelte";

  /** Called after each change, so the panel can show the banner on a phone,
   *  where the sheet covers it. */
  let { onchange }: { onchange?: () => void } = $props();

  type Control = {
    target: BannerTarget;
    icon: PixelarticonName;
    word: string;
    part: string;
  };

  // The caption's words in the caption's order: "A clear night at Smith Rock, OR."
  const controls = $derived.by((): Control[] => {
    const scene = bannerLink.scene;
    if (!scene) return [];
    const words = captionWords(scene);
    return [
      {
        target: "sky",
        icon: scene.weather === "clear" ? "sun" : "cloud",
        word: words.weather,
        part: "weather",
      },
      {
        target: "sun",
        icon:
          scene.time === "night" ? "moon" : scene.time === "day" ? "sun" : "clock",
        word: words.time,
        part: "time of day",
      },
      { target: "land", icon: "map-pin", word: words.place, part: "place" },
    ];
  });

  function change(target: BannerTarget): void {
    bannerLink.advance?.(target);
    onchange?.();
  }
</script>

{#if controls.length > 0}
  <div class="guide-scene" role="group" aria-label="Banner scene">
    {#each controls as control (control.target)}
      <button
        type="button"
        class="guide-scene-part"
        aria-label="{control.word}, next {control.part}"
        onclick={() => change(control.target)}
      >
        <Icon name={control.icon} class="w-3 h-3 shrink-0" />
        <span>{control.word}</span>
        <Icon name="repeat" class="guide-scene-cycle w-3 h-3 shrink-0" />
      </button>
    {/each}
  </div>
{/if}

<style>
  /* One row when it fits. On a narrow reply the place wraps under weather and
     time and every block grows to fill its line, so the blocks still meet.
     The 1px gaps over the divider color draw the shared edges either way. */
  .guide-scene {
    display: flex;
    flex-wrap: wrap;
    gap: 1px;
    width: max-content;
    max-width: 100%;
    border: 1px solid var(--color-divider);
    background: var(--color-divider);
  }

  .guide-scene-part {
    display: flex;
    flex: 1 0 auto;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding-inline: 0.375rem;
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    line-height: 1rem;
    white-space: nowrap;
    user-select: none;
    touch-action: manipulation;
    transition:
      color var(--duration-ui) var(--ease-out),
      background-color var(--duration-ui) var(--ease-out);
  }

  /* The cycle mark sits at the far edge of each block. */
  .guide-scene-part :global(.guide-scene-cycle) {
    margin-inline-start: auto;
    color: var(--color-text-muted);
  }

  @media (hover: hover) and (pointer: fine) {
    .guide-scene-part {
      min-height: 2rem;
    }

    .guide-scene-part:hover {
      color: var(--color-text-primary);
      background: var(--color-bg-sunken);
    }
  }
</style>
