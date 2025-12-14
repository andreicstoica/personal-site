<script lang="ts">
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
    }, 100);
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
                  class="h-50 w-auto object-contain"
                  autoplay
                  loop
                  muted
                  playsinline
                  style="opacity: 0"
                  onloadeddata={(e: Event) => {
                    const target = e.currentTarget as HTMLVideoElement;
                    target.style.opacity = "1";
                  }}
                ></video>
              {:else}
                <img
                  src={image.src}
                  alt={image.alt}
                  class="h-50 w-auto object-contain"
                  loading="lazy"
                  width={image.width}
                  height={image.height}
                  decoding="async"
                  style="opacity: 0"
                  onload={(e: Event) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.opacity = "1";
                  }}
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
                class="h-50 w-auto object-contain"
                autoplay
                loop
                muted
                playsinline
                style="opacity: 0"
                onloadeddata={(e: Event) => {
                  const target = e.currentTarget as HTMLVideoElement;
                  target.style.opacity = "1";
                }}
              ></video>
            {:else}
              <img
                src={image.src}
                alt={image.alt}
                class="h-50 w-auto object-contain"
                loading="lazy"
                width={image.width}
                height={image.height}
                decoding="async"
                style="opacity: 0"
                onload={(e: Event) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.opacity = "1";
                }}
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
          class="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain cursor-zoom-out"
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
            class="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain"
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
      <button
        onclick={closeModal}
        class="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full w-8 h-8 flex items-center justify-center transition-colors z-10 cursor-pointer"
        type="button"
        aria-label="Close media modal"
      >
        ✕
      </button>
    </div>
  </div>
{/if}

<style>
  .scrollbar-always-visible {
    /* Always show horizontal scrollbar */
    overflow-x: auto !important;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: #9ca3af transparent;
    white-space: nowrap;
  }

  /* Webkit browsers (Chrome, Safari, etc.) */
  .scrollbar-always-visible::-webkit-scrollbar {
    height: 8px;
    display: block;
  }

  .scrollbar-always-visible::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar-always-visible::-webkit-scrollbar-thumb {
    background-color: #9ca3af;
    border-radius: 4px;
  }

  .scrollbar-always-visible::-webkit-scrollbar-thumb:hover {
    background-color: #6b7280;
  }

  /* Dark mode */
  :global(.dark) .scrollbar-always-visible::-webkit-scrollbar-thumb {
    background-color: #6b7280;
  }

  :global(.dark) .scrollbar-always-visible::-webkit-scrollbar-thumb:hover {
    background-color: #9ca3af;
  }
</style>
