<script lang="ts">
  import { tick } from "svelte";
  import { assertNever } from "../../lib/assertNever";
  import { mediaReveal } from "../../lib/mediaReveal";
  import { portal } from "../../lib/portal";
  import type { GalleryMedia, GalleryVariant } from "../../lib/types";
  import Icon from "../ui/Icon.svelte";

  interface Props {
    images: GalleryMedia[];
    experienceName: string;
    variant?: GalleryVariant;
  }

  const { images, experienceName, variant = "desktop" }: Props = $props();

  /* One name for the whole site: only one lightbox media morphs at a time. */
  const VT_NAME = "image-inspect-media";
  /* Keep in sync with `.modal-backdrop.closing` so unmount lands with the fade. */
  const modalCloseMs = 140;
  /* The update callback freezes rendering; never hold it long for a slow decode. */
  const mediaReadyTimeoutMs = 250;
  /* The bar needs 44px buttons plus a 12px gap beside the media, inside the dialog padding. */
  const controlsBandPx = 56;
  const stagePaddingPx = 16;
  const desktopMinPx = 768;
  /* Media may give up this much height to make room for the bar; beyond it the bar moves to the sides. */
  const maxShrinkRatio = 0.08;
  const swipeCommitPx = 60;
  const swipeCommitVelocity = 0.11;
  const mediaShadow =
    "0 0 50px rgba(0, 0, 0, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 20px 25px -5px rgba(0, 0, 0, 0.1)";

  let index = $state<number | null>(null);
  let fadingOut = $state(false);
  let slideFrom = $state<"next" | "prev" | null>(null);
  let dragX = $state(0);
  let dragging = $state(false);
  let viewportW = $state(0);
  let viewportH = $state(0);
  let videoRatios = $state<Record<number, number>>({});
  let dialogRef = $state<HTMLDivElement | null>(null);
  let mediaRef = $state<HTMLElement | null>(null);
  const thumbRefs: HTMLButtonElement[] = [];

  let closing = false;
  let pending: Promise<void> | null = null;
  let activeTransition: ViewTransition | null = null;
  let pausedThumb: HTMLVideoElement | null = null;
  let videoStartAt = 0;
  let suppressClick = false;
  let drag: { id: number; x: number; y: number; t: number; axis: "x" | "y" | null } | null =
    null;

  const current = $derived(index === null ? null : (images[index] ?? null));
  const hasCarousel = $derived(images.length > 1);

  function ratioAt(i: number): number {
    const media = images[i];
    if (!media) return 16 / 9;
    if (media.kind === "video") return videoRatios[i] ?? 16 / 9;
    return media.width && media.height ? media.width / media.height : 16 / 9;
  }

  /* One placement per gallery, from its tallest media, so the buttons do not
     jump between slides. Without room above or below, they sit at the sides. */
  const controlsPlacement = $derived.by((): "above" | "below" | "sides" => {
    if (!viewportW || !viewportH) return "sides";
    const tallest = Math.min(...images.map((_, i) => ratioAt(i)));
    const mediaHeight = Math.min(viewportH * 0.9, (viewportW * 0.95) / tallest);
    const room = viewportH - 2 * stagePaddingPx - controlsBandPx;
    if (mediaHeight - room > mediaHeight * maxShrinkRatio) return "sides";
    return viewportW >= desktopMinPx ? "above" : "below";
  });

  const wrapperClass = (() => {
    switch (variant) {
      case "desktop":
        return "col-span-4";
      case "mobile":
        return "";
      default:
        return assertNever(variant);
    }
  })();

  function prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* Astro's ClientRouter owns document.startViewTransition during navigation. */
  function canMorph(): boolean {
    return (
      typeof document.startViewTransition === "function" &&
      !prefersReducedMotion() &&
      !document.documentElement.hasAttribute("data-astro-transition")
    );
  }

  function thumbMediaAt(i: number): HTMLImageElement | HTMLVideoElement | null {
    return thumbRefs[i]?.querySelector<HTMLImageElement | HTMLVideoElement>("img, video") ?? null;
  }

  function isOnScreen(el: Element): boolean {
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    const strip = el.closest(".gallery-strip")?.getBoundingClientRect();
    const left = Math.max(rect.left, strip?.left ?? 0, 0);
    const right = Math.min(rect.right, strip?.right ?? window.innerWidth, window.innerWidth);
    const top = Math.max(rect.top, 0);
    const bottom = Math.min(rect.bottom, window.innerHeight);
    return right - left >= rect.width / 2 && bottom - top >= rect.height / 2;
  }

  /* Horizontal only: the page is scroll-locked, and scrollIntoView would still move it. */
  function revealInStrip(button: HTMLButtonElement) {
    const item = button.parentElement;
    const strip = button.closest<HTMLElement>(".gallery-strip");
    if (!item || !strip) return;
    const itemRect = item.getBoundingClientRect();
    const stripRect = strip.getBoundingClientRect();
    if (itemRect.left >= stripRect.left && itemRect.right <= stripRect.right) return;
    strip.scrollTo({
      left: strip.scrollLeft + itemRect.left - stripRect.left,
      behavior: "instant",
    });
  }

  function mediaReady(el: HTMLElement): Promise<void> {
    let ready: Promise<unknown>;
    if (el instanceof HTMLImageElement) {
      ready = el.decode().catch(() => {});
    } else if (el instanceof HTMLVideoElement && el.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      // A seek drops readyState without firing loadeddata again.
      ready = new Promise((resolve) => {
        el.addEventListener("loadeddata", resolve, { once: true });
        el.addEventListener("seeked", resolve, { once: true });
      });
    } else {
      return Promise.resolve();
    }
    return Promise.race([
      ready.then(() => {}),
      new Promise<void>((resolve) => setTimeout(resolve, mediaReadyTimeoutMs)),
    ]);
  }

  /**
   * Same-document view transition between one thumbnail and the lightbox media.
   * `<html>` is renamed to `root` for the duration because Astro names it with
   * animations off, which would make the scrim pop instead of fading.
   */
  async function morph(
    kind: "open" | "close",
    from: HTMLElement,
    update: () => Promise<HTMLElement | null>,
  ): Promise<void> {
    const root = document.documentElement;
    const named: HTMLElement[] = [from];
    root.dataset.imageInspectVt = kind;
    root.style.viewTransitionName = "root";
    from.style.viewTransitionName = VT_NAME;
    const transition = document.startViewTransition(async () => {
      from.style.viewTransitionName = "";
      const to = await update();
      if (!to) return;
      await mediaReady(to);
      if (to.getBoundingClientRect().width < 1) return;
      named.push(to);
      to.style.viewTransitionName = VT_NAME;
    });
    activeTransition = transition;
    try {
      await transition.finished;
    } catch {
      // A rejected update callback still has to clear the names below.
    } finally {
      for (const el of named) el.style.viewTransitionName = "";
      delete root.dataset.imageInspectVt;
      root.style.viewTransitionName = "";
      activeTransition = null;
    }
  }

  function track(work: Promise<void>): Promise<void> {
    const run = work.finally(() => {
      if (pending === run) pending = null;
    });
    pending = run;
    return run;
  }

  function openImage(i: number) {
    if (index !== null || pending) return;
    const thumb = thumbMediaAt(i);
    videoStartAt = 0;
    pausedThumb = null;
    if (thumb instanceof HTMLVideoElement) {
      videoStartAt = thumb.currentTime;
      thumb.pause();
      pausedThumb = thumb;
    }
    slideFrom = null;
    if (!canMorph() || !thumb) {
      index = i;
      return;
    }
    void track(
      morph("open", thumb, async () => {
        index = i;
        await tick();
        return mediaRef;
      }),
    );
  }

  async function closeModal() {
    if (index === null || closing) return;
    closing = true;
    if (pending) {
      activeTransition?.skipTransition();
      await pending;
    }
    if (index === null) {
      closing = false;
      return;
    }
    const i = index;
    const trigger = thumbRefs[i] ?? null;
    const thumb = thumbMediaAt(i);
    if (trigger) revealInStrip(trigger);
    if (thumb instanceof HTMLVideoElement && mediaRef instanceof HTMLVideoElement) {
      thumb.currentTime = mediaRef.currentTime;
    }

    const unmount = async () => {
      index = null;
      fadingOut = false;
      dragX = 0;
      await tick();
      return thumb;
    };

    const from = mediaRef;
    if (canMorph() && thumb && from && isOnScreen(thumb)) {
      await track(morph("close", from, unmount));
    } else {
      fadingOut = true;
      const delay = prefersReducedMotion() ? 0 : modalCloseMs;
      await track(new Promise<void>((resolve) => setTimeout(resolve, delay)).then(async () => {
        await unmount();
      }));
    }

    if (pausedThumb && isOnScreen(pausedThumb)) pausedThumb.play().catch(() => {});
    pausedThumb = null;
    trigger?.focus({ preventScroll: true });
    closing = false;
  }

  function go(delta: 1 | -1) {
    if (index === null || closing || pending) return;
    const next = index + delta;
    if (next < 0 || next >= images.length) return;
    slideFrom = delta > 0 ? "next" : "prev";
    videoStartAt = 0;
    index = next;
  }

  function onStageClick(event: MouseEvent) {
    const target = event.target;
    if (
      target === event.currentTarget ||
      (target instanceof Element &&
        (target.classList.contains("image-inspect-stage") ||
          target.classList.contains("image-inspect-slide")))
    ) {
      void closeModal();
    }
  }

  function onClickCapture(event: MouseEvent) {
    if (!suppressClick) return;
    suppressClick = false;
    event.stopPropagation();
    event.preventDefault();
  }

  function onPointerDown(event: PointerEvent) {
    suppressClick = false;
    if (!hasCarousel || event.pointerType === "mouse" || !event.isPrimary) return;
    if (closing || pending) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now(), axis: null };
  }

  function atEdge(dx: number): boolean {
    if (index === null) return true;
    return (dx > 0 && index === 0) || (dx < 0 && index === images.length - 1);
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (drag.axis === null) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        drag.axis = "x";
        dragging = true;
        try {
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        } catch {
          // The pointer already ended; the drag still resolves on pointerup.
        }
      } else if (Math.abs(dy) > 8) {
        drag.axis = "y";
      }
    }
    if (drag.axis !== "x") return;
    // Past either end the slide resists instead of hitting a wall.
    dragX = atEdge(dx) ? dx / 4 : dx;
  }

  function onPointerEnd(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    const { axis, x, t } = drag;
    drag = null;
    if (axis !== "x") return;
    suppressClick = true;
    dragging = false;
    const dx = event.clientX - x;
    const velocity = Math.abs(dx) / Math.max(1, performance.now() - t);
    const commit =
      event.type === "pointerup" &&
      !atEdge(dx) &&
      (Math.abs(dx) > swipeCommitPx || (Math.abs(dx) > 20 && velocity > swipeCommitVelocity));
    dragX = 0;
    if (commit) go(dx < 0 ? 1 : -1);
  }

  function onVideoMetadata(event: Event) {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;
    if (index !== null && video.videoWidth > 0 && video.videoHeight > 0) {
      videoRatios[index] = video.videoWidth / video.videoHeight;
    }
    if (videoStartAt > 0 && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(videoStartAt, Math.max(0, video.duration - 0.1));
    }
  }

  function trapFocus(event: KeyboardEvent) {
    if (!dialogRef) return;
    const focusables = [
      ...dialogRef.querySelectorAll<HTMLElement>("button, video[controls]"),
    ].filter((el) => el.getClientRects().length > 0);
    const first = focusables[0];
    const last = focusables.at(-1);
    if (!first || !last) {
      event.preventDefault();
      dialogRef.focus();
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialogRef)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialogRef.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  /** Strip previews only move while visible; hidden duplicates stay parked. */
  function viewportPlay(node: HTMLVideoElement) {
    if (typeof IntersectionObserver === `undefined`) {
      node.play().catch(() => {});
      return {};
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) node.play().catch(() => {});
        else node.pause();
      },
      { threshold: 0.1 },
    );
    observer.observe(node);
    return {
      destroy() {
        observer.disconnect();
      },
    };
  }

  $effect(() => {
    if (index === null) return;
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        void closeModal();
      } else if (e.key === "Tab") {
        trapFocus(e);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        // Focused video controls use the arrows to seek.
        if (e.target instanceof HTMLVideoElement) return;
        e.preventDefault();
        go(e.key === "ArrowRight" ? 1 : -1);
      }
    };
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  });

  $effect(() => {
    if (index === null) return;
    document.documentElement.classList.add("image-inspect-open");
    return () => {
      document.documentElement.classList.remove("image-inspect-open");
    };
  });

  $effect(() => {
    dialogRef?.focus({ preventScroll: true });
  });

  /* Neighbors load ahead, and their thumbs load too so a close can land on them. */
  $effect(() => {
    if (index === null) return;
    for (const n of [index - 1, index, index + 1]) {
      const media = images[n];
      if (media?.kind !== "image") continue;
      const thumb = thumbMediaAt(n);
      if (thumb instanceof HTMLImageElement) thumb.loading = "eager";
      if (n !== index) new Image().src = media.src;
    }
  });
</script>

<svelte:window bind:innerWidth={viewportW} bind:innerHeight={viewportH} />

<div class={wrapperClass}>
  <div
    aria-label={`${experienceName} media gallery`}
    class="flex gap-2 flex-nowrap overflow-x-auto scrollbar-always-visible gallery-strip"
  >
    {#each images as image, i}
      <div class="shrink-0 min-w-fit">
        <button
          bind:this={thumbRefs[i]}
          type="button"
          class="cursor-zoom-in shrink-0 min-w-fit bg-transparent border-0 p-0"
          aria-label={`Open ${experienceName} image`}
          onclick={() => openImage(i)}
        >
          {#if image.kind === "video"}
            <video
              src={image.src}
              class="h-50 w-auto object-contain media-reveal"
              use:mediaReveal
              use:viewportPlay
              autoplay
              loop
              muted
              playsinline
              preload="metadata"
            ></video>
          {:else}
            <img
              src={image.src}
              alt={image.alt}
              class="h-50 w-auto object-contain media-reveal"
              use:mediaReveal
              loading="lazy"
              width={image.width}
              height={image.height}
              decoding="async"
            />
          {/if}
        </button>
      </div>
    {/each}
  </div>
</div>

{#if current && index !== null}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    bind:this={dialogRef}
    use:portal
    class="image-inspect modal-backdrop {fadingOut ? 'closing' : ''}"
    data-controls={hasCarousel ? controlsPlacement : "sides"}
    role="dialog"
    aria-modal="true"
    aria-label={`${experienceName} image`}
    tabindex="-1"
    onclick={onStageClick}
    onclickcapture={onClickCapture}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="image-inspect-stage"
      class:is-swipeable={hasCarousel}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerEnd}
      onpointercancel={onPointerEnd}
    >
      {#key index}
        <div
          class="image-inspect-slide"
          class:is-dragging={dragging}
          data-from={slideFrom}
          style:transform={dragX ? `translateX(${dragX}px)` : undefined}
        >
          {#if current.kind === "video"}
            <video
              bind:this={mediaRef}
              src={current.src}
              class="image-inspect-media"
              autoplay
              loop
              muted
              playsinline
              controls
              preload="auto"
              draggable={false}
              onloadedmetadata={onVideoMetadata}
              style="box-shadow: {mediaShadow};"
            ></video>
          {:else}
            <button
              type="button"
              class="image-inspect-trigger"
              onclick={() => void closeModal()}
            >
              <img
                bind:this={mediaRef}
                src={current.src}
                alt={current.alt}
                class="image-inspect-media"
                width={current.width}
                height={current.height}
                decoding="async"
                fetchpriority="high"
                draggable={false}
                style="box-shadow: {mediaShadow};"
              />
            </button>
          {/if}
        </div>
      {/key}
    </div>

    {#if hasCarousel}
      <div class="image-inspect-bar">
        <button
          type="button"
          class="image-inspect-nav"
          data-dir="prev"
          aria-label="Previous image"
          aria-disabled={index === 0}
          onclick={() => go(-1)}
        >
          <Icon name="chevron-down" class="w-5 h-5 rotate-90" />
        </button>
        <p class="image-inspect-count" aria-live="polite" aria-atomic="true">
          <span aria-hidden="true">{index + 1} / {images.length}</span>
          <span class="sr-only">Image {index + 1} of {images.length}</span>
        </p>
        <button
          type="button"
          class="image-inspect-nav"
          data-dir="next"
          aria-label="Next image"
          aria-disabled={index === images.length - 1}
          onclick={() => go(1)}
        >
          <Icon name="chevron-down" class="w-5 h-5 -rotate-90" />
        </button>
      </div>
    {/if}
  </div>
{/if}
