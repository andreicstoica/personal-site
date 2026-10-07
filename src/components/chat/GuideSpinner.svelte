<script lang="ts">
  /** The eight outer blocks of a 3×3 grid, clockwise from the top left. */
  const CELLS = [
    [1, 1],
    [1, 2],
    [1, 3],
    [2, 3],
    [3, 3],
    [3, 2],
    [3, 1],
    [2, 1],
  ] as const;
</script>

<!-- loading.dev's "Loading" mark, drawn for the pixel icons: the brightest
     block circles the ring. Only opacity steps, so at 2x every block and gap
     lands on whole device pixels, like the 12px icons beside it. -->
<span class="guide-spinner" aria-hidden="true">
  {#each CELLS as [row, col], index (index)}
    <span style:grid-area="{row} / {col}" style:--index={index}></span>
  {/each}
</span>

<style>
  .guide-spinner {
    display: inline-grid;
    flex-shrink: 0;
    grid-template: repeat(3, 3px) / repeat(3, 3px);
    gap: 1.5px;
    width: 12px;
    height: 12px;
  }

  .guide-spinner span {
    background: currentColor;
    opacity: 0.2;
    animation: guide-spinner-step 800ms steps(1, end) infinite;
    animation-delay: calc(var(--index) * 100ms - 800ms);
  }

  /* Each block holds full brightness for one step of eight, then one trail
     step, then rests dim until the lead comes round again. */
  @keyframes guide-spinner-step {
    0% {
      opacity: 1;
    }
    12.5% {
      opacity: 0.5;
    }
    25%,
    100% {
      opacity: 0.2;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .guide-spinner span {
      animation: none;
      opacity: 0.4;
    }
  }
</style>
