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
  let triggerPoint = $state<{ x: number; y: number } | null>(null);
  let stripVideo = $state<HTMLVideoElement | null>(null);
  let videoStartAt = 0;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  /* Keep in sync with --duration-ui so unmount lands with the CSS exit. */
  const modalCloseMs = 180;
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

  function openImage(image: GalleryMedia, trigger: EventTarget | null) {
    if (!(trigger instanceof HTMLButtonElement)) return;
    if (isClosing) {
      if (closeTimer !== undefined) clearTimeout(closeTimer);
      closeTimer = undefined;
      isClosing = false;
      stripVideo?.play().catch(() => {});
    }
    triggerEl = trigger;
    const rect = trigger.getBoundingClientRect();
    triggerPoint = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const thumbVideo = trigger.querySelector("video");
    stripVideo = thumbVideo;
    videoStartAt = thumbVideo?.currentTime ?? 0;
    thumbVideo?.pause();
    selectedImage = image;
  }

  const closeModal = () => {
    if (!selectedImage || isClosing) return;
    isClosing = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimer = setTimeout(() => {
      closeTimer = undefined;
      selectedImage = null;
      isClosing = false;
      void tick().then(() => {
        triggerEl?.focus();
        stripVideo?.play().catch(() => {});
        stripVideo = null;
        triggerEl = null;
        triggerPoint = null;
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

  function seedVideoStart(event: Event) {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;
    if (videoStartAt > 0 && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(videoStartAt, Math.max(0, video.duration - 0.1));
    }
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
    const point = triggerPoint;
    if (!selectedImage || !media || !point) return;
    const box = media.getBoundingClientRect();
    media.style.setProperty(
      "--inspect-origin",
      `${point.x - box.left}px ${point.y - box.top}px`,
    );
  });
</script>

<div class={wrapperClass}>
  <div
    aria-label={`${experienceName} media gallery`}
    class="flex gap-2 flex-nowrap overflow-x-auto scrollbar-always-visible gallery-strip px-2"
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
              autoplay
              loop
              muted
              playsinline
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
          draggable={false}
          onloadedmetadata={seedVideoStart}
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
