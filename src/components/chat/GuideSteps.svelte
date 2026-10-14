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
    <li
      class="guide-step"
      data-status={step.status}
      data-expandable={Boolean(step.detail || step.data || step.icon === "lightbulb" || step.icon === "cpu")}
    >
      <Icon name={step.icon} class="guide-step-icon w-3 h-3 shrink-0" />
      <div class="guide-step-body">
        {#snippet heading()}
          <span class="guide-step-head">
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
            {#if step.status === "error"}
              <span class="guide-step-outcome">Failed</span>
            {/if}
          </span>
        {/snippet}
        {#if step.detail || step.data}
          <details class="guide-step-details">
            <summary>
              {@render heading()}
              <Icon name="chevron-right" class="guide-detail-caret w-3 h-3 shrink-0" />
            </summary>
            {#if step.detail}
              <p class="guide-step-detail">{step.detail}</p>
            {/if}
            {#if step.data}
              <p class="guide-step-data">
                {#each step.data.split(" · ") as part, partIndex (partIndex)}
                  <span class="guide-step-datum"
                    >{partIndex > 0 ? `· ${part}` : part}</span
                  >
                {/each}
              </p>
            {/if}
          </details>
        {:else}
          {@render heading()}
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

  /* One icon column and one text column, so a wrapped line starts where
     the label starts and the connector stays on the icon's center. */
  .guide-step {
    position: relative;
    display: grid;
    grid-template-columns: 0.75rem minmax(0, 1fr);
    column-gap: 0.5rem;
    align-items: start;
    min-width: 0;
  }

  /* Keep the icon centered on the 24px heading, including before details arrive. */
  .guide-step :global(.guide-step-icon) {
    justify-self: center;
    margin-block-start: 0.375rem;
    opacity: 0.8;
  }

  .guide-step-body {
    min-width: 0;
  }

  .guide-step-head {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    height: 1.5rem;
  }

  /* Leave 2px around each icon, independent of the detail height. */
  .guide-step:not(:last-child)::after {
    content: "";
    position: absolute;
    top: 1.25rem;
    bottom: -0.5rem;
    left: 0.375rem;
    width: 1px;
    translate: -0.5px 0;
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
    font-size: inherit;
    opacity: 0.7;
  }

  .guide-step-details summary {
    display: flex;
    align-items: flex-start;
    gap: 0.375rem;
    width: fit-content;
    max-width: 100%;
    min-height: 1.5rem;
    cursor: pointer;
    list-style: none;
    touch-action: manipulation;
  }

  .guide-step-details summary::-webkit-details-marker {
    display: none;
  }

  .guide-step-details .guide-step-head {
    flex: 0 1 auto;
  }

  .guide-step-details :global(.guide-detail-caret) {
    margin-block-start: 0.375rem;
    transition: transform 150ms var(--ease-out);
  }

  .guide-step-details[open] :global(.guide-detail-caret) {
    transform: rotate(90deg);
  }

  @supports (interpolate-size: allow-keywords) {
    .guide-step-details::details-content {
      interpolate-size: allow-keywords;
      height: 0;
      opacity: 0;
      overflow: clip;
      transition:
        height 150ms var(--ease-out),
        opacity 150ms var(--ease-out),
        content-visibility 150ms allow-discrete;
    }

    .guide-step-details[open]::details-content {
      height: auto;
      opacity: 1;
      transition-duration: 200ms;
    }
  }

  .guide-step-outcome {
    font-weight: 600;
  }

  @media (pointer: coarse) {
    .guide-step[data-expandable="true"] .guide-step-body {
      min-height: 2.75rem;
    }

    .guide-step-details summary {
      min-height: 2.75rem;
    }
  }

  .guide-step-detail {
    margin: 0;
    padding-block: 0.25rem;
    opacity: 0.85;
    white-space: pre-wrap;
    text-wrap: pretty;
    overflow-wrap: break-word;
  }

  /* Each figure stays whole. The line breaks at a dot, never inside
     "(13.4K cached)". */
  .guide-step-data {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 0.375rem;
    margin: 0;
    padding-block: 0.25rem;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    line-height: 1.125rem;
    font-variant-numeric: tabular-nums;
    opacity: 0.85;
  }

  .guide-step-datum {
    min-width: 0;
    max-width: 100%;
    white-space: nowrap;
  }

  .guide-step-link {
    padding-block-end: 0;
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
    .guide-step-details summary:hover {
      color: var(--color-text-primary);
    }

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
    .guide-step-details::details-content,
    .guide-step-details :global(.guide-detail-caret) {
      transition: none;
    }

    [data-live="true"] .guide-step,
    [data-live="true"] .guide-step:not(:last-child)::after {
      animation: none;
    }
  }
</style>
