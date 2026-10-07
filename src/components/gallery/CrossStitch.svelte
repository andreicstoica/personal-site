<script lang="ts">
  import {
    cornerPiece,
    type Leg,
    type StitchCorner,
    THREAD_COLOR,
    type Thread,
  } from "../../lib/crossStitch";

  let { corner }: { corner: StitchCorner } = $props();

  /** CSS px per stitch. */
  const CELL = 3.15;
  /** Stitches, whole piece. Each leg gets about 10ms. */
  const SEW_MS = 2400;
  /** How long the photo must stay in view before the needle starts. */
  const DWELL_MS = 300;
  /** Thread stops short of each hole, so the holes read between crosses. */
  const INSET = 0.12;
  const THREADS = Object.keys(THREAD_COLOR) as Thread[];

  const piece = $derived(cornerPiece(corner));
  /** Legs sewn so far; the fraction is the leg in progress. */
  let sewn = $state(0);

  function segment(leg: Leg, amount = 1): string {
    const [x1, y1] = leg.from;
    const [x2, y2] = leg.to;
    const dx = Math.sign(x2 - x1) * INSET;
    const dy = Math.sign(y2 - y1) * INSET;
    const sx = x1 + dx;
    const sy = y1 + dy;
    const ex = sx + (x2 - dx - sx) * amount;
    const ey = sy + (y2 - dy - sy) * amount;
    return `M${sx} ${sy}L${ex} ${ey}`;
  }

  /** One path per thread and layer, so over legs always sit on under legs. */
  const layers = $derived.by(() => {
    const whole = Math.floor(sewn);
    const paths = [false, true].flatMap((over) =>
      THREADS.map((thread) => ({ over, thread, d: "" })),
    );
    piece.legs.forEach((leg, i) => {
      if (i > whole) return;
      const amount = i < whole ? 1 : sewn - whole;
      if (amount <= 0) return;
      const path = paths.find((p) => p.over === leg.over && p.thread === leg.thread);
      if (path) path.d += segment(leg, amount);
    });
    return paths;
  });

  /** The needle rides the tip of the leg in progress, pointing the way it pulls. */
  const needle = $derived.by(() => {
    const leg = piece.legs[Math.floor(sewn)];
    if (!leg || sewn <= 0) return null;
    const amount = sewn - Math.floor(sewn);
    const [x1, y1] = leg.from;
    const [x2, y2] = leg.to;
    const x = x1 + (x2 - x1) * amount;
    const y = y1 + (y2 - y1) * amount;
    const ux = Math.sign(x2 - x1) * 0.7071;
    const uy = Math.sign(y2 - y1) * 0.7071;
    return `M${x} ${y}L${x + ux * 2.4} ${y + uy * 2.4}`;
  });

  function sew(node: SVGSVGElement) {
    const total = piece.legs.length;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sewn = total;
      return;
    }
    let frame = 0;
    let delay = 0;
    let started = false;
    const image = node.parentElement?.querySelector("img");
    const painted = () => !image || (image.complete && image.naturalWidth > 0);
    const start = () => {
      if (started || !painted()) return;
      started = true;
      observer.disconnect();
      const begin = performance.now();
      const tick = (now: number) => {
        sewn = Math.min(total, ((now - begin) / SEW_MS) * total);
        if (sewn < total) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    // Sew once the photo is painted and has stayed on screen for a beat. While
    // the page above is still loading, the gallery passes through view and
    // must not start then.
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(delay);
        if (entry?.isIntersecting) delay = window.setTimeout(start, DWELL_MS);
      },
      { threshold: 0.6 },
    );
    // A photo that loads while in view gets a fresh look from the observer.
    const reobserve = () => {
      if (started) return;
      observer.disconnect();
      observer.observe(node);
    };
    image?.addEventListener("load", reobserve);
    observer.observe(node);
    return {
      destroy() {
        observer.disconnect();
        image?.removeEventListener("load", reobserve);
        window.clearTimeout(delay);
        cancelAnimationFrame(frame);
      },
    };
  }
</script>

<svg
  class="cross-stitch"
  data-corner={corner}
  viewBox="0 0 {piece.width} {piece.height}"
  width={piece.width * CELL}
  height={piece.height * CELL}
  aria-hidden="true"
  use:sew
>
  {#each layers as layer (`${layer.over}-${layer.thread}`)}
    <g style:--thread={THREAD_COLOR[layer.thread]}>
      <path class="stitch-shadow" d={layer.d} />
      <path class="stitch-thread" d={layer.d} />
      <path class="stitch-ply" d={layer.d} />
    </g>
  {/each}
  {#if needle && sewn < piece.legs.length}
    <path class="stitch-needle" d={needle} />
  {/if}
</svg>

<style>
  .cross-stitch {
    position: absolute;
    margin: 0.25rem;
    overflow: visible;
    pointer-events: none;
  }

  [data-corner="top-left"] {
    top: 0;
    left: 0;
  }

  [data-corner="top-right"] {
    top: 0;
    right: 0;
  }

  [data-corner="bottom-left"] {
    bottom: 0;
    left: 0;
  }

  [data-corner="bottom-right"] {
    right: 0;
    bottom: 0;
  }

  path {
    fill: none;
    stroke-linecap: round;
  }

  /* Raised thread throws a small shadow down and right onto the print. */
  .stitch-shadow {
    stroke: rgb(0 0 0 / 0.35);
    stroke-width: 0.44;
    transform: translate(0.1px, 0.14px);
  }

  .stitch-thread {
    stroke: var(--thread);
    stroke-width: 0.42;
  }

  /* Short light dashes along each leg read as the twist of the plies. */
  .stitch-ply {
    stroke: color-mix(in oklch, var(--thread) 55%, white);
    stroke-width: 0.12;
    stroke-dasharray: 0.18 0.16;
    opacity: 0.55;
    transform: translate(-0.05px, -0.06px);
  }

  .stitch-needle {
    stroke: #c7cbd1;
    stroke-width: 0.16;
  }
</style>
