<script lang="ts">
  import type { GuideStep } from "../../lib/guideTurn";
  import Icon from "../ui/Icon.svelte";
  import GuideSpinner from "./GuideSpinner.svelte";
  import GuideSteps from "./GuideSteps.svelte";

  /** How a reply was made, in one line. While the guide works, a spinner
   *  sits where the caret goes and the line names the step in progress,
   *  changing in place; the steps never unfold on their own, so nothing
   *  above the reply grows while it streams. Done, the line reads "Worked
   *  for 2.1s" and the caret opens the steps. */
  let {
    steps,
    summary,
    live = false,
  }: {
    steps: GuideStep[];
    summary: string;
    live?: boolean;
  } = $props();

  let open = $state(false);
  const id = $props.id();
</script>

<div class="guide-trace" data-open={open}>
  <button
    type="button"
    class="guide-trace-toggle"
    aria-expanded={open}
    aria-controls="{id}-trace"
    onclick={() => (open = !open)}
  >
    {#if live}
      <GuideSpinner />
    {:else}
      <Icon name="chevron-right" class="guide-trace-caret w-3 h-3 shrink-0" />
    {/if}
    <!-- Keyed, so each new step fades in where the last one stood. -->
    {#key summary}
      <span class="guide-trace-summary">{summary}</span>
    {/key}
  </button>
  <!-- inert while closed: the collapsed rows leave the tab order and the
       accessibility tree, not just the screen. -->
  <div id="{id}-trace" class="guide-trace-body" inert={!open}>
    <div class="guide-trace-clip">
      <div class="guide-trace-rows">
        <GuideSteps {steps} {live} />
      </div>
    </div>
  </div>
</div>

<style>
  .guide-trace-toggle {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 100%;
    font-size: 0.75rem;
    line-height: 1.125rem;
    color: var(--color-text-secondary);
    transition: color var(--duration-ui) var(--ease-out);
  }

  /* A 44px tap area on an 18px row. */
  .guide-trace-toggle::before {
    content: "";
    position: absolute;
    inset: -0.8125rem -0.25rem;
  }

  .guide-trace-summary {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    animation: guide-trace-step 150ms var(--ease-out);
  }

  @keyframes guide-trace-step {
    from {
      opacity: 0;
    }
  }

  .guide-trace-toggle :global(.guide-trace-caret) {
    transition: transform 150ms var(--ease-out);
  }

  .guide-trace[data-open="true"] .guide-trace-toggle :global(.guide-trace-caret) {
    transform: rotate(90deg);
  }

  /* Height follows the rows through the 0fr → 1fr grid track, so nothing is
     measured in script. Open 200ms, close 150ms: the close answers faster. */
  .guide-trace-body {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 150ms var(--ease-out);
  }

  .guide-trace[data-open="true"] .guide-trace-body {
    grid-template-rows: 1fr;
    transition-duration: 200ms;
  }

  .guide-trace-clip {
    min-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: opacity 150ms var(--ease-out);
  }

  .guide-trace[data-open="true"] .guide-trace-clip {
    opacity: 1;
  }

  .guide-trace-rows {
    padding-block: 0.375rem 0.25rem;
  }

  @media (hover: hover) and (pointer: fine) {
    .guide-trace-toggle:hover {
      color: var(--color-text-primary);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .guide-trace-summary {
      animation: none;
    }

    .guide-trace-body,
    .guide-trace-clip,
    .guide-trace-toggle,
    .guide-trace-toggle :global(.guide-trace-caret) {
      transition: none;
    }
  }
</style>
