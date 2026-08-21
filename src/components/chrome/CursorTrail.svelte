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
    const activePixels: HTMLElement[] = [];
    let lastTime = 0;

    const createPixel = (x: number, y: number) => {
      if (activePixels.length >= maxPixels) {
        const oldest = activePixels.shift();
        oldest?.remove();
      }

      const pixel = document.createElement("div");
      pixel.className = "cursor-pixel";

      pixel.style.backgroundColor =
        colors[Math.floor(Math.random() * colors.length)] ?? "var(--tag-work)";

      const size = Math.floor(Math.random() * 7) + 2;
      pixel.style.width = `${size}px`;
      pixel.style.height = `${size}px`;
      pixel.style.left = `${x - size / 2}px`;
      pixel.style.top = `${y - size / 2}px`;

      activePixels.push(pixel);
      document.body.appendChild(pixel);

      setTimeout(() => {
        pixel.style.opacity = "0";
        setTimeout(() => {
          const index = activePixels.indexOf(pixel);
          if (index > -1) activePixels.splice(index, 1);
          pixel.remove();
        }, 500);
      }, 300);
    };

    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastTime < throttleMs) return;
      lastTime = now;

      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (element?.closest("nav")) return;

      createPixel(e.clientX, e.clientY);
    };

    document.addEventListener("mousemove", onMove);

    return () => {
      document.removeEventListener("mousemove", onMove);
      for (const pixel of activePixels) pixel.remove();
    };
  });
</script>
