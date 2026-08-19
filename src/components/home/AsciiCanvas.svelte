<script lang="ts">
  import {
    AsciiImageConverter,
    AsciiVideoConverter,
  } from "../../lib/asciiVideo";

  let {
    src,
    mode = "image",
  }: {
    src: string;
    mode?: "image" | "video";
  } = $props();

  let output = $state<HTMLDivElement | null>(null);

  $effect(() => {
    const el = output;
    if (!el) return;

    let converter: AsciiImageConverter | AsciiVideoConverter | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        converter =
          mode === "video"
            ? new AsciiVideoConverter(src, el)
            : new AsciiImageConverter(src, el, false);
        if (!cancelled) await converter.start();
      } catch (error) {
        console.error("Failed to initialize ASCII canvas:", error);
        el.innerHTML = "ASCII Image Error - Check Console";
      }
    };

    void start();

    const onVisibility = () => {
      if (!converter) return;
      if (document.hidden) converter.stop();
      else void converter.start();
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      converter?.destroy();
    };
  });
</script>

<div
  bind:this={output}
  class="font-mono text-xs leading-none tracking-wider m-0 p-0 overflow-hidden filter drop-shadow-sm ascii-display opacity-75 lg:opacity-90"
  style="background-color: transparent; height: 500px;"
>
  Loading ASCII...
</div>
