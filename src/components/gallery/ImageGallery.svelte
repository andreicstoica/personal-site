<script lang="ts">
  import { mediaReveal } from "../../lib/mediaReveal";

  interface ImageData {
    src: string;
    alt: string;
    isGif: boolean;
    width?: number;
    height?: number;
  }

  interface Props {
    images: ImageData[];
    experienceName: string;
    variant?: "desktop" | "mobile";
  }

  const { images, experienceName, variant = "desktop" }: Props = $props();

  let selectedImage = $state<ImageData | null>(null);
  let isClosing = $state(false);
  let containerRef = $state<HTMLDivElement | null>(null);
  let isVisible = $state(false);

  const modalCloseMs = 180;

  // Intersection Observer for lazy loading
  $effect(() => {
    if (!containerRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
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

  // Derived mobile detection - only recalculates when window changes
  const isMobile = $derived(() => {
    if (typeof window === "undefined") return false;
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768
    );
  });

  const closeModal = () => {
    isClosing = true;
    setTimeout(() => {
      selectedImage = null;
      isClosing = false;
    }, modalCloseMs);
  };

  // Close modal on escape key
  $effect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };

    if (selectedImage) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  });
</script>

{#if variant === "desktop"}
  <div class="col-span-4">
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
              onclick={() => selectedImage = image}
              onkeydown={(e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectedImage = image;
                }
              }}
            >
              {#if image.src.toLowerCase().includes(".webm")}
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
{:else}
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
            onclick={() => selectedImage = image}
            onkeydown={(e: KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectedImage = image;
              }
            }}
          >
            {#if image.src.toLowerCase().includes(".webm")}
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
{/if}

<!-- Simple Modal -->
{#if selectedImage}
  <div
    class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[12000] flex items-center justify-center p-4 modal-backdrop {isClosing ? 'closing' : ''}"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={closeModal}
    onkeydown={(e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    }}
  >
    <div class="relative w-full h-full flex items-center justify-center">
      {#if selectedImage.src.toLowerCase().includes(".webm")}
        <video
          src={selectedImage.src}
          class="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain cursor-zoom-out media-reveal"
          use:mediaReveal
          autoplay
          loop
          muted
          playsinline
          controls
          draggable={false}
          onclick={closeModal}
          style="
            box-shadow:
              0 0 50px rgba(0, 0, 0, 0.3),
              0 25px 50px -12px rgba(0, 0, 0, 0.25),
              0 20px 25px -5px rgba(0, 0, 0, 0.1);
           "
        ></video>
      {:else}
        <button
          type="button"
          class="bg-transparent border-0 p-0 cursor-zoom-out"
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
            class="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain media-reveal"
            use:mediaReveal
            decoding="async"
            fetchpriority="high"
            draggable={false}
            style="
              box-shadow:
                0 0 50px rgba(0, 0, 0, 0.3),
                0 25px 50px -12px rgba(0, 0, 0, 0.25),
                0 20px 25px -5px rgba(0, 0, 0, 0.1);
            "
          />
        </button>
      {/if}
    </div>
  </div>
{/if}
