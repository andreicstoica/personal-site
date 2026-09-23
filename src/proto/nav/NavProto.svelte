<script lang="ts">
  import { onMount } from "svelte";

  const variants = [
    { name: "Bar", id: "bar" },
    { name: "Margin", id: "margin" },
    { name: "Colophon", id: "colophon" },
  ] as const;

  let current = $state(0);
  let ready = $state(false);
  let pickerEl = $state<HTMLElement | null>(null);
  let highlight = $state({ width: 0, x: 0 });

  function measure() {
    if (!pickerEl) return;
    const items = pickerEl.querySelectorAll<HTMLButtonElement>(
      ".proto-picker-item",
    );
    const el = items[current];
    if (!el) return;
    highlight = { width: el.offsetWidth, x: el.offsetLeft };
  }

  function setActive(index: number) {
    if (index < 0 || index >= variants.length) return;
    current = index;
    const picked = variants[index];
    if (picked) document.documentElement.dataset.protoNav = picked.id;
    const url = new URL(location.href);
    url.searchParams.set("v", String(index + 1));
    history.replaceState(null, "", url);
  }

  onMount(() => {
    const raw = Number(new URLSearchParams(location.search).get("v"));
    if (Number.isFinite(raw) && raw >= 1 && raw <= variants.length) {
      current = raw - 1;
    }
    const frame = requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(() => {
        ready = true;
      });
    });
    const onResize = () => measure();
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const num = Number.parseInt(event.key, 10);
      if (num >= 1 && num <= variants.length) setActive(num - 1);
      else if (event.key === "ArrowRight") {
        setActive((current + 1) % variants.length);
      } else if (event.key === "ArrowLeft") {
        setActive((current - 1 + variants.length) % variants.length);
      }
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey);
    };
  });

  $effect(() => {
    current;
    pickerEl;
    measure();
  });
</script>

<nav
  class="proto-picker"
  aria-label="Prototype variants"
  data-ready={ready ? "" : undefined}
  bind:this={pickerEl}
>
  <span
    class="proto-picker-highlight"
    aria-hidden="true"
    style="width: {highlight.width}px; transform: translateX({highlight.x}px);"
  ></span>
  {#each variants as variant, index (variant.name)}
    <button
      type="button"
      class="proto-picker-item"
      data-active={index === current ? "" : undefined}
      aria-current={index === current ? "true" : undefined}
      onclick={() => setActive(index)}
    >
      {variant.name}
    </button>
  {/each}
</nav>

<style>
  .proto-picker {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: 999px;
    background: rgba(10, 10, 10, 0.82);
    -webkit-backdrop-filter: blur(12px) saturate(1.4);
    backdrop-filter: blur(12px) saturate(1.4);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08) inset,
      0 8px 24px rgba(0, 0, 0, 0.24),
      0 2px 6px rgba(0, 0, 0, 0.12);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 13px;
    line-height: 1;
    -webkit-font-smoothing: antialiased;
    user-select: none;
    -webkit-user-select: none;
  }

  .proto-picker-highlight {
    position: absolute;
    top: 4px;
    left: 0;
    height: 28px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    will-change: transform;
  }

  .proto-picker[data-ready] .proto-picker-highlight {
    transition:
      transform 250ms cubic-bezier(0.23, 1, 0.32, 1),
      width 250ms cubic-bezier(0.23, 1, 0.32, 1);
  }

  @media (prefers-reduced-motion: reduce) {
    .proto-picker[data-ready] .proto-picker-highlight {
      transition: none;
    }
  }

  .proto-picker-item {
    position: relative;
    display: flex;
    align-items: center;
    height: 28px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: rgba(255, 255, 255, 0.55);
    font: inherit;
    cursor: pointer;
    transition: color 150ms ease-out;
  }

  .proto-picker-item:hover {
    color: rgba(255, 255, 255, 0.85);
  }

  .proto-picker-item:active {
    transform: scale(0.97);
  }

  .proto-picker-item:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.4);
    outline-offset: 2px;
  }

  .proto-picker-item[data-active] {
    color: #fff;
  }
</style>
