<script lang="ts">
  import { tick } from "svelte";
  import { assertNever } from "../../lib/assertNever";
  import { mediaReveal } from "../../lib/mediaReveal";
  import { portal } from "../../lib/portal";
  import type { GalleryMedia, GalleryVariant } from "../../lib/types";

  interface Props {
    images: GalleryMedia[];
    experienceName: string;
    variant?: GalleryVariant;
  }

  const { images, experienceName, variant = "desktop" }: Props = $props();

  let selectedImage = $state<GalleryMedia | null>(null);
  let isClosing = $state(false);
  let dialogRef = $state<HTMLDivElement | null>(null);
  let mediaRef = $state<HTMLElement | null>(null);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let triggerRect: DOMRect | null = null;
  let stripVideo = $state<HTMLVideoElement | null>(null);
  let videoStartAt = 0;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  /* Keep in sync with the modal close duration so unmount lands with the CSS exit. */
  const modalCloseMs = 150;
  const mediaShadow =
    "0 0 50px rgba(0, 0, 0, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 20px 25px -5px rgba(0, 0, 0, 0.1)";

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

  /**
   * Thumb rect → media box, both viewport coords, origin 0 0. Null when either
   * has no geometry yet, so an unsized box never produces a bogus morph.
   */
  function flipStartFor(rect: DOMRect, box: DOMRect): string | null {
    if (rect.width < 1 || box.width < 1 || box.height < 1) return null;
    const scale = rect.width / box.width;
    return `translate(${rect.left - box.left}px, ${rect.top - box.top}px) scale(${scale})`;
  }

  /* Start transform from the open effect; reused verbatim on close. */
  let flipStart = "";

  function openImage(image: GalleryMedia, trigger: EventTarget | null) {
    if (!(trigger instanceof HTMLButtonElement)) return;
    if (isClosing) {
      if (closeTimer !== undefined) clearTimeout(closeTimer);
      closeTimer = undefined;
      isClosing = false;
      stripVideo?.play().catch(() => {});
    }
    triggerEl = trigger;
    // Written before `selectedImage` below, so the open effect reads it fresh.
    triggerRect = trigger.getBoundingClientRect();
    const thumbVideo = trigger.querySelector("video");
    stripVideo = thumbVideo;
    videoStartAt = thumbVideo?.currentTime ?? 0;
    thumbVideo?.pause();
    selectedImage = image;
  }

  const closeModal = () => {
    if (!selectedImage || isClosing) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    isClosing = true;
    // Retarget the open transition instead of snapping: with the transform still
    // set, changing it interrupts and eases back to the thumbnail it came from.
    if (!reduced && flipStart && mediaRef) mediaRef.style.transform = flipStart;
    closeTimer = setTimeout(() => {
      closeTimer = undefined;
      selectedImage = null;
      isClosing = false;
      void tick().then(() => {
        triggerEl?.focus();
        stripVideo?.play().catch(() => {});
        stripVideo = null;
        triggerEl = null;
        triggerRect = null;
        flipStart = "";
      });
    }, reduced ? 0 : modalCloseMs);
  };

  function onStageClick(event: MouseEvent) {
    const target = event.target;
    if (
      target === event.currentTarget ||
      (target instanceof Element && target.classList.contains("image-inspect-stage"))
    ) {
      closeModal();
    }
  }

  function onVideoMetadata(event: Event) {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;
    if (videoStartAt > 0 && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(videoStartAt, Math.max(0, video.duration - 0.1));
    }
    // Geometry lands with the metadata — morph from the thumbnail like images.
    morphMedia(video);
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

  /**
   * FLIP the open transition: thumb rect → media box, committed with
   * transitions off before first paint, then released so CSS runs the travel.
   * Same morph for images and video; video callers wait for loadedmetadata
   * so the measured box is the real frame, not the pre-metadata default.
   */
  function morphMedia(media: HTMLElement): void {
    const rect = triggerRect;
    if (!rect) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const start = flipStartFor(rect, media.getBoundingClientRect());
    flipStart = start ?? "";
    if (!start) return;

    // Measuring above forces the style recalc that would otherwise start the
    // transition from a state this effect has not written yet — that
    // mid-flight jump was the stutter.
    media.style.transition = "none";
    media.style.transform = start;
    media.getBoundingClientRect();
    requestAnimationFrame(() => {
      if (mediaRef !== media || isClosing) return;
      media.style.transition = "";
      media.style.transform = "";
    });
  }

  $effect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };

    if (selectedImage) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  });

  $effect(() => {
    if (!selectedImage) return;

    document.documentElement.classList.add("image-inspect-open");
    return () => {
      document.documentElement.classList.remove("image-inspect-open");
    };
  });

  $effect(() => {
    if (selectedImage && dialogRef) {
      dialogRef.focus();
    }
  });

  $effect(() => {
    const media = mediaRef;
    if (!selectedImage || !media) return;
    // Video geometry is a placeholder until metadata lands; the
    // loadedmetadata handler morphs it then. Images morph immediately —
    // width/height attrs hold their box before decode.
    if (
      media instanceof HTMLVideoElement &&
      media.readyState < HTMLMediaElement.HAVE_METADATA
    )
      return;
    morphMedia(media);
  });
</script>

<div class={wrapperClass}>
  <div
    aria-label={`${experienceName} media gallery`}
    class="flex gap-2 flex-nowrap overflow-x-auto scrollbar-always-visible gallery-strip"
  >
    {#each images as image}
      <div class="shrink-0 min-w-fit">
        <button
          type="button"
          class="cursor-zoom-in shrink-0 min-w-fit bg-transparent border-0 p-0"
          aria-label={`Open ${experienceName} image`}
          onclick={(event) => openImage(image, event.currentTarget)}
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

{#if selectedImage}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    bind:this={dialogRef}
    use:portal
    class="image-inspect modal-backdrop {isClosing ? 'closing' : ''}"
    role="dialog"
    aria-modal="true"
    aria-label={`${experienceName} image`}
    tabindex="-1"
    onclick={onStageClick}
  >
    <div class="image-inspect-stage">
      {#if selectedImage.kind === "video"}
        <video
          bind:this={mediaRef}
          src={selectedImage.src}
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
          onclick={closeModal}
        >
          <img
            bind:this={mediaRef}
            src={selectedImage.src}
            alt={selectedImage.alt}
            class="image-inspect-media"
            width={selectedImage.width}
            height={selectedImage.height}
            decoding="async"
            fetchpriority="high"
            draggable={false}
            style="box-shadow: {mediaShadow};"
          />
        </button>
      {/if}
    </div>
  </div>
{/if}
