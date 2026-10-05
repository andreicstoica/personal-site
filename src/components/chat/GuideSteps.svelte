<script module lang="ts">
  import type { PixelarticonName } from "../../icons/pixelarticons";

  export type GuideStep = {
    icon: PixelarticonName;
    label: string;
    status: "active" | "complete";
  };
</script>

<script lang="ts">
  import Icon from "../ui/Icon.svelte";

  /** `live` animates rows as they arrive. A finished chain renders still, so
   *  swapping the live chain for the finished one does not replay entrances. */
  let { steps, live = false }: { steps: GuideStep[]; live?: boolean } = $props();
</script>

<ol class="guide-steps" aria-label="Steps" data-live={live}>
  {#each steps as step, index (index)}
    <li class="guide-step" data-status={step.status}>
      <Icon name={step.icon} class="w-3.5 h-3.5 shrink-0" />
      <span class="guide-step-label">{step.label}</span>
    </li>
  {/each}
</ol>

<style>
  .guide-steps {
    display: grid;
    gap: 0.375rem;
    font-size: 0.8125rem;
    line-height: 1.25rem;
    color: var(--color-text-secondary);
  }

  .guide-step {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  /* A 1px line from below each icon to above the next one: the 0.875rem icon
     sits centered in a 1.25rem row, so it ends 1.0625rem down, and the next
     icon starts 0.75rem after that. 0.125rem of air on each end. */
  .guide-step:not(:last-child)::after {
    content: "";
    position: absolute;
    top: 1.1875rem;
    left: calc(0.4375rem - 0.5px);
    width: 1px;
    height: 0.5rem;
    background: var(--color-text-secondary);
    opacity: 0.4;
    transform-origin: top;
  }

  /* Live: the line draws down when the next step arrives, then that step
     fades in. The line exists only once a row is no longer last, so its
     animation starts exactly then. */
  [data-live="true"] .guide-step {
    animation: guide-step-in var(--duration-ui) var(--ease-out) 60ms both;
  }

  [data-live="true"] .guide-step:first-child {
    animation-delay: 0ms;
  }

  [data-live="true"] .guide-step:not(:last-child)::after {
    animation: guide-step-line var(--duration-ui) var(--ease-out) both;
  }

  .guide-step-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* The active label shimmers: a lighter band sweeps across the text. */
  .guide-step[data-status="active"] .guide-step-label {
    background: linear-gradient(
        90deg,
        var(--color-text-secondary) 0%,
        var(--color-text-secondary) 40%,
        var(--color-text-primary) 50%,
        var(--color-text-secondary) 60%,
        var(--color-text-secondary) 100%
      )
      0 0 / 250% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    animation: guide-step-shimmer 1.6s linear infinite;
  }

  @keyframes guide-step-in {
    from {
      opacity: 0;
      transform: translateY(0.25rem);
    }
  }

  @keyframes guide-step-line {
    from {
      transform: scaleY(0);
    }
  }

  @keyframes guide-step-shimmer {
    from {
      background-position: 100% 0;
    }
    to {
      background-position: 0% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-live="true"] .guide-step,
    [data-live="true"] .guide-step:not(:last-child)::after,
    .guide-step[data-status="active"] .guide-step-label {
      animation: none;
    }

    .guide-step[data-status="active"] .guide-step-label {
      color: var(--color-text-secondary);
      background: none;
    }
  }
</style>
