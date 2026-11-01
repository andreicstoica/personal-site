<script lang="ts">
  const colors = [
    "var(--tag-work)",
    "var(--tag-personal)",
    "var(--tag-school)",
    "var(--tag-other)",
  ];

  const throttleMs = 25;
  const maxPixels = 30;

  $effect(() => {
    const preference = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    const pixels = new Map<HTMLElement, Animation>();
    const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-out").trim();
    let lastTime = 0;

    const removePixel = (pixel: HTMLElement) => {
      pixels.get(pixel)?.cancel();
      pixels.delete(pixel);
      pixel.remove();
    };
    const clearPixels = () => {
      for (const pixel of pixels.keys()) removePixel(pixel);
    };

    const onMove = (event: MouseEvent) => {
      if (document.hidden) return;
      const now = performance.now();
      if (now - lastTime < throttleMs) return;
      lastTime = now;
      if (document.elementFromPoint(event.clientX, event.clientY)?.closest("nav")) return;

      if (pixels.size >= maxPixels) {
        const oldest = pixels.keys().next().value;
        if (oldest) removePixel(oldest);
      }
      const pixel = document.createElement("div");
      pixel.className = "cursor-pixel";
      pixel.setAttribute("aria-hidden", "true");
      pixel.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)] ?? "var(--tag-work)";
      const size = Math.floor(Math.random() * 7) + 2;
      pixel.style.width = `${size}px`;
      pixel.style.height = `${size}px`;
      pixel.style.transform = `translate(${event.clientX - size / 2}px, ${event.clientY - size / 2}px)`;
      document.body.appendChild(pixel);
      const animation = pixel.animate(
        [
          { opacity: 0.5 },
          { opacity: 0.5, offset: 0.375, easing },
          { opacity: 0 },
        ],
        { duration: 800 },
      );
      pixels.set(pixel, animation);
      void animation.finished.then(() => removePixel(pixel)).catch(() => {});
    };
    const update = () => {
      document.removeEventListener("mousemove", onMove);
      if (preference.matches) document.addEventListener("mousemove", onMove);
      else clearPixels();
    };
    const onVisibility = () => {
      if (document.hidden) clearPixels();
    };
    update();
    preference.addEventListener("change", update);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      preference.removeEventListener("change", update);
      clearPixels();
    };
  });
</script>
