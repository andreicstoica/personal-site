<script lang="ts">
  import type { StarterPrompt } from "../../lib/guidePrompts";
  import Icon from "../ui/Icon.svelte";

  /** Questions the visitor can send with one click; the label is the exact
   *  text sent. Two variants: `starter` rows lead with a topic icon in the
   *  empty thread; `follow-up` rows sit under a reply as a ruled list with a
   *  trailing arrow, like the work table on the home page. */
  let {
    prompts,
    label,
    title,
    variant = "starter",
    animate = false,
    class: className = "",
    onselect,
  }: {
    prompts: readonly StarterPrompt[];
    /** The list's accessible name when there is no visible title. */
    label?: string;
    title?: string;
    variant?: "starter" | "follow-up";
    animate?: boolean;
    class?: string;
    onselect: (text: string) => void;
  } = $props();

  const id = $props.id();
</script>

<div class={["guide-prompts", className]} data-variant={variant} data-animate={animate}>
  {#if title}
    <p id="{id}-title" class="guide-prompts-title">{title}</p>
  {/if}
  <ul
    aria-label={title ? undefined : label}
    aria-labelledby={title ? `${id}-title` : undefined}
  >
    {#each prompts as prompt, index (prompt.text)}
      <li style:--index={index + 1}>
        <button type="button" class="guide-prompt" onclick={() => onselect(prompt.text)}>
          {#if variant === "starter"}
            <Icon name={prompt.icon} class="w-4 h-4 shrink-0" />
          {/if}
          <span class="guide-prompt-text">{prompt.text}</span>
          {#if variant === "follow-up"}
            <Icon name="arrow-right" class="guide-prompt-arrow w-3 h-3 shrink-0" />
          {/if}
        </button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .guide-prompt {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 44px;
    padding-inline: 0.75rem;
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    text-align: start;
    touch-action: manipulation;
    transition: color var(--duration-ui) var(--ease-out);
  }

  .guide-prompt-text {
    flex: 1;
    min-width: 0;
  }

  /* Follow-ups: a quiet label, then padded rows with no rules between them.
     A row takes the source cards' white surface on hover, so the panel has
     one surface language: white means "this goes somewhere". */
  [data-variant="follow-up"] .guide-prompts-title {
    padding-inline: 0.75rem;
    padding-block-end: 0.25rem;
    font-size: 0.75rem;
    line-height: 1.125rem;
    color: var(--color-text-muted);
  }

  [data-variant="follow-up"] ul {
    display: grid;
    gap: 0.125rem;
  }

  [data-variant="follow-up"] .guide-prompt {
    gap: 0.5rem;
    padding-block: 0.375rem;
    font-size: 0.8125rem;
    line-height: 1.25rem;
    transition:
      color var(--duration-ui) var(--ease-out),
      background-color var(--duration-ui) var(--ease-out);
  }

  .guide-prompt :global(.guide-prompt-arrow) {
    opacity: 0.6;
    transition:
      transform 150ms var(--ease-out),
      opacity 150ms var(--ease-out);
  }

  /* The title, then each row, rises 4px and fades in, 40ms apart. */
  [data-animate="true"] .guide-prompts-title,
  [data-animate="true"] li {
    animation: guide-prompt-in 250ms var(--ease-out) both;
    animation-delay: calc(var(--index, 0) * 40ms);
  }

  @keyframes guide-prompt-in {
    from {
      opacity: 0;
      transform: translateY(0.25rem);
    }
  }

  @media (hover: hover) and (pointer: fine) {
    .guide-prompt {
      min-height: 2.25rem;
    }

    .guide-prompt:hover {
      color: var(--color-text-primary);
    }

    [data-variant="follow-up"] .guide-prompt:hover {
      background: var(--color-bg-primary);
    }

    .guide-prompt:hover :global(.guide-prompt-arrow) {
      opacity: 1;
      transform: translateX(2px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .guide-prompt,
    .guide-prompt :global(.guide-prompt-arrow),
    [data-animate="true"] .guide-prompts-title,
    [data-animate="true"] li {
      transition: none;
      animation: none;
    }
  }
</style>
