<script lang="ts">
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
  let containerRef = $state<HTMLDivElement | null>(null);
  let isVisible = $state(false);
  let dialogRef = $state<HTMLDivElement | null>(null);

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

  $effect(() => {
    if (!containerRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          isVisible = true;
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef);

    return () => {
      observer.disconnect();
    };
  });

  const closeModal = () => {
    if (!selectedImage || isClosing) return;
    isClosing = true;
    setTimeout(() => {
      selectedImage = null;
      isClosing = false;
    }, modalCloseMs);
  };

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
</script>

<div class={wrapperClass}>
  <div
    bind:this={containerRef}
    aria-label={`${experienceName} media gallery`}
    class="flex gap-2 flex-nowrap overflow-x-auto scrollbar-always-visible px-2"
  >
    {#if isVisible}
      {#each images as image}
        <div class="shrink-0 min-w-fit">
          <button
            type="button"
            class="cursor-zoom-in shrink-0 min-w-fit bg-transparent border-0 p-0"
            aria-label={`Open ${experienceName} image`}
            onclick={() => (selectedImage = image)}
            onkeydown={(e: KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectedImage = image;
              }
            }}
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
    {/if}
  </div>
</div>

{#if selectedImage}
  <div
    bind:this={dialogRef}
    use:portal
    class="image-inspect modal-backdrop {isClosing ? 'closing' : ''}"
    role="dialog"
    aria-modal="true"
    aria-label={`${experienceName} image`}
    tabindex="-1"
    onclick={closeModal}
    onkeydown={(e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    }}
  >
    <div class="image-inspect-stage">
      {#if selectedImage.kind === "video"}
        <video
          src={selectedImage.src}
          class="image-inspect-media cursor-zoom-out media-reveal"
          use:mediaReveal
          autoplay
          loop
          muted
          playsinline
          controls
          draggable={false}
          onclick={closeModal}
          style="box-shadow: {mediaShadow};"
        ></video>
      {:else}
        <button
          type="button"
          class="image-inspect-trigger"
          onclick={closeModal}
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              closeModal();
            }
          }}
        >
          <img
            src={selectedImage.src}
            alt={selectedImage.alt}
            class="image-inspect-media media-reveal"
            use:mediaReveal
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
