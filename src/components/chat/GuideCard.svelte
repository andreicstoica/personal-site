<script lang="ts">
  import type { SourceCard } from "../../lib/guideTurn";
  import Icon from "../ui/Icon.svelte";

  /** A source under a reply: a page of this site, or a blog post that opens
   *  in a new tab. A plain link either way, so it still works with a middle
   *  click, a modifier key, or no script. */
  let {
    card,
    onclick,
  }: {
    card: SourceCard;
    /** Runs on a plain click of a site card; the guide moves the page itself. */
    onclick?: (event: MouseEvent) => void;
  } = $props();
</script>

<a
  href={card.href}
  class="guide-card"
  target={card.external ? "_blank" : undefined}
  rel={card.external ? "noopener noreferrer" : undefined}
  {onclick}
>
  <Icon name={card.external ? "book-open" : "directions"} class="w-4 h-4 shrink-0" />
  <span class="guide-card-body">
    <span class="guide-card-title">{card.title}</span>
    <span class="guide-card-meta" class:guide-shimmer={card.active}>{card.meta}</span>
  </span>
  <Icon
    name={card.external ? "external-link" : "arrow-right"}
    class="guide-card-go w-3 h-3 shrink-0"
  />
  {#if card.external}<span class="sr-only">(opens in a new tab)</span>{/if}
</a>

<style>
  /* The same white surface as the visitor's own message, so a source reads as
     an object in the thread, not more prose. Square, like the rest of the
     panel. */
  .guide-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 44px;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-primary);
    border: 1px solid transparent;
    color: var(--color-text-secondary);
    text-decoration: none;
    touch-action: manipulation;
    transition: border-color var(--duration-ui) var(--ease-out);
  }

  .guide-card-body {
    display: grid;
    flex: 1;
    min-width: 0;
  }

  .guide-card-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-sm);
    line-height: 1.25rem;
    color: var(--color-text-primary);
  }

  .guide-card-meta {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.75rem;
    line-height: 1.125rem;
  }

  .guide-card :global(.guide-card-go) {
    opacity: 0.6;
    transition: opacity 150ms var(--ease-out);
  }

  .guide-card:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (hover: hover) and (pointer: fine) {
    .guide-card:hover {
      border-color: var(--color-text-muted);
    }

    .guide-card:hover :global(.guide-card-go) {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .guide-card,
    .guide-card :global(.guide-card-go) {
      transition: none;
    }
  }
</style>
