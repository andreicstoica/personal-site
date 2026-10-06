<script lang="ts">
  import type { StarterPrompt } from "../../lib/guidePrompts";
  import Icon from "../ui/Icon.svelte";

  /** Questions the visitor can send with one click; the label is the exact
   *  text sent. Both variants lead with a topic icon: `starter` rows in the
   *  empty thread, `follow-up` rows under a reply as a quieter, tighter list. */
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
          <Icon name={prompt.icon} class="guide-prompt-icon w-4 h-4 shrink-0" />
          <span class="guide-prompt-text">{prompt.text}</span>
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

  [data-variant="follow-up"] .guide-prompt :global(.guide-prompt-icon) {
    opacity: 0.8;
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

  /* Rows touch, so the three read as one list. On touch a row is 40px: above
     the 24px minimum, a little under 44, so three rows do not float apart
     around 14px text. Fine pointers get 36px. */
  [data-variant="follow-up"] ul {
    display: grid;
  }

  [data-variant="follow-up"] .guide-prompt {
    gap: 0.625rem;
    min-height: 2.5rem;
    padding-block: 0.25rem;
    font-size: var(--text-sm);
    line-height: 1.25rem;
    transition:
      color var(--duration-ui) var(--ease-out),
      background-color var(--duration-ui) var(--ease-out);
  }

  [data-variant="follow-up"] .guide-prompt:focus-visible {
    background: color-mix(in srgb, var(--color-bg-primary) 50%, transparent);
  }

  /* A quiet arrival, well after the reply: the title, then each row, fades
     in over 300ms and rises 2px, 50ms apart. */
  [data-animate="true"] .guide-prompts-title,
  [data-animate="true"] li {
    animation: guide-prompt-in 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--index, 0) * 50ms);
  }

  @keyframes guide-prompt-in {
    from {
      opacity: 0;
      transform: translateY(2px);
    }
  }

  @keyframes guide-prompt-fade {
    from {
      opacity: 0;
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
      background: color-mix(in srgb, var(--color-bg-primary) 50%, transparent);
    }

  }

  /* Reduced motion keeps the fade and drops the movement. */
  @media (prefers-reduced-motion: reduce) {
    .guide-prompt {
      transition: none;
    }

    [data-animate="true"] .guide-prompts-title,
    [data-animate="true"] li {
      animation-name: guide-prompt-fade;
    }
  }
</style>
