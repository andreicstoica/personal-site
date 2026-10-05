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

  let { steps }: { steps: GuideStep[] } = $props();
</script>

<ol class="guide-steps" aria-label="Steps">
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
    gap: 0.25rem;
    font-size: 0.8125rem;
    line-height: 1.25rem;
    color: var(--color-text-secondary);
  }

  .guide-step {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    animation: guide-step-in var(--duration-ui) var(--ease-out) both;
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

  @keyframes guide-step-shimmer {
    from {
      background-position: 100% 0;
    }
    to {
      background-position: 0% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .guide-step,
    .guide-step[data-status="active"] .guide-step-label {
      animation: none;
    }

    .guide-step[data-status="active"] .guide-step-label {
      color: var(--color-text-secondary);
      background: none;
    }
  }
</style>
