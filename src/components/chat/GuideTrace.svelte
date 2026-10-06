<script lang="ts">
  import type { GuideStep } from "../../lib/guideTurn";
  import Icon from "../ui/Icon.svelte";
  import GuideSteps from "./GuideSteps.svelte";

  /** How a reply was made: open by default, so each step appears in place as
   *  it happens, and collapsible. Collapsing is the visitor's call only; a
   *  trace that closed itself after the reply would pull the text up under
   *  the reader. Closed while live, the header names the step in progress. */
  let {
    steps,
    summary,
    live = false,
  }: { steps: GuideStep[]; summary: string; live?: boolean } = $props();

  let open = $state(true);
  const id = $props.id();
  /** Open, the rows already show the step in progress. */
  const headline = $derived(live && open ? "Working" : summary);
</script>

<div class="guide-trace" data-open={open}>
  <button
    type="button"
    class="guide-trace-toggle"
    aria-expanded={open}
    aria-controls="{id}-trace"
    onclick={() => (open = !open)}
  >
    <Icon name="chevron-right" class="guide-trace-caret w-3 h-3 shrink-0" />
    <span class="guide-trace-summary" class:guide-shimmer={live}>{headline}</span>
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
    .guide-trace-body,
    .guide-trace-clip,
    .guide-trace-toggle,
    .guide-trace-toggle :global(.guide-trace-caret) {
      transition: none;
    }
  }
</style>
