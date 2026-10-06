<script lang="ts">
  import type { StarterPrompt } from "../../lib/guidePrompts";
  import Icon from "../ui/Icon.svelte";

  /** Questions the visitor can send with one click; the label is the exact
   *  text sent. The starter prompts use it without a title, and "Continue
   *  exploring" with a title and an entrance. */
  let {
    prompts,
    label,
    title,
    animate = false,
    class: className = "",
    onselect,
  }: {
    prompts: readonly StarterPrompt[];
    /** The list's accessible name when there is no visible title. */
    label?: string;
    title?: string;
    animate?: boolean;
    class?: string;
    onselect: (text: string) => void;
  } = $props();

  const id = $props.id();
</script>

<div class={["guide-prompts", className]} data-animate={animate}>
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
          <Icon name={prompt.icon} class="w-4 h-4 shrink-0" />
          <span>{prompt.text}</span>
        </button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .guide-prompts-title {
    padding-inline: 0.75rem;
    padding-block-end: 0.25rem;
    font-size: 0.75rem;
    line-height: 1rem;
    color: var(--color-text-secondary);
  }

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
  }

  @media (prefers-reduced-motion: reduce) {
    .guide-prompt,
    [data-animate="true"] .guide-prompts-title,
    [data-animate="true"] li {
      transition: none;
      animation: none;
    }
  }
</style>
