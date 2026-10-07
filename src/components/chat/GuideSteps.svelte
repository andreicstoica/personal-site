<script lang="ts">
  import type { GuideStep } from "../../lib/guideTurn";
  import Icon from "../ui/Icon.svelte";

  /** `live` animates rows as they arrive. A finished chain renders still, so
   *  swapping the live chain for the finished one does not replay entrances. */
  let { steps, live = false }: { steps: GuideStep[]; live?: boolean } = $props();

  const external = (href: string) => /^https?:/.test(href);
</script>

<ol class="guide-steps" aria-label="Steps" data-live={live}>
  {#each steps as step, index (index)}
    <li class="guide-step" data-status={step.status}>
      <Icon name={step.icon} class="guide-step-icon w-3 h-3 shrink-0" />
      <div class="guide-step-body">
        <div class="guide-step-head">
          {#if step.href}
            <a
              href={step.href}
              class="guide-step-label guide-step-link"
              class:guide-shimmer={step.status === "active"}
              target={external(step.href) ? "_blank" : undefined}
              rel={external(step.href) ? "noopener noreferrer" : undefined}
              >{step.label}</a
            >
          {:else}
            <span class="guide-step-label" class:guide-shimmer={step.status === "active"}
              >{step.label}</span
            >
          {/if}
          {#if step.tool}
            <code class="guide-step-tool">{step.tool}</code>
          {/if}
        </div>
        {#if step.detail}
          <p class="guide-step-detail" title={step.detail}>{step.detail}</p>
        {/if}
        {#if step.data}
          <p class="guide-step-data">{step.data}</p>
        {/if}
      </div>
    </li>
  {/each}
</ol>

<style>
  /* Metadata about the reply, so it sits a size below it: 12px rows and
     12px icons (crisp at 2x, where a 24-grid icon lands on whole pixels).
     Text stays in the secondary tone, which keeps 12px readable on the
     sunken panel; only the icons and connector use the muted tone. The
     reply stays the loudest thing in the turn. */
  .guide-steps {
    display: grid;
    gap: 0.25rem;
    font-size: 0.75rem;
    line-height: 1.125rem;
    color: var(--color-text-secondary);
  }

  .guide-step {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    min-width: 0;
  }

  /* The 0.75rem icon sits centered on the first 1.125rem line. */
  .guide-step :global(.guide-step-icon) {
    margin-block-start: 0.1875rem;
    opacity: 0.8;
  }

  .guide-step-body {
    min-width: 0;
    flex: 1;
  }

  .guide-step-head {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
  }

  /* A 1px line from below each icon to above the next one, however tall the
     row is: it starts 0.125rem under the icon (which ends 0.9375rem down) and
     stops 0.125rem above the next icon (0.1875rem into the next row, past
     the 0.25rem gap). */
  .guide-step:not(:last-child)::after {
    content: "";
    position: absolute;
    top: 1.0625rem;
    bottom: -0.3125rem;
    left: calc(0.375rem - 0.5px);
    width: 1px;
    background: var(--color-text-muted);
    opacity: 0.5;
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
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* The tool's real name in mono: the one place the trace shows the
     system's own vocabulary. */
  .guide-step-tool {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    opacity: 0.7;
  }

  /* Reasoning keeps its paragraph breaks, up to three lines. */
  .guide-step-detail {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
    margin-block-start: 0.0625rem;
    opacity: 0.85;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .guide-step-data {
    margin-block-start: 0.0625rem;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
    opacity: 0.85;
    overflow-wrap: anywhere;
  }

  .guide-step-link {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: var(--color-divider);
    text-underline-offset: 0.2em;
  }

  /* Same link-out mark as the site's markdown links (global.css). */
  .guide-step-link[target="_blank"]::after {
    content: "↗";
    content: "↗" / "";
    display: inline-block;
    margin-inline-start: 0.25em;
  }

  @media (hover: hover) and (pointer: fine) {
    .guide-step-link:hover {
      color: var(--color-text-primary);
    }
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

  @media (prefers-reduced-motion: reduce) {
    [data-live="true"] .guide-step,
    [data-live="true"] .guide-step:not(:last-child)::after {
      animation: none;
    }
  }
</style>
