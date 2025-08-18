"use client";

import { Cambio } from "cambio";
import { useEffect, useRef, useState } from "react";

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

// Fix the ref type
const useIntersectionObserver = (ref: React.RefObject<HTMLElement | null>) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [ref]);

  return isVisible;
};

export default function ImageGalleryReact({
  images,
  experienceName,
  variant = "desktop",
}: Props) {
  // No mount delay; rely on stable dimensions to prevent first-open jank

  const isMobile = () => {
    if (typeof window === "undefined") return false;
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768
    );
  };

  const renderImage = (image: ImageData, index: number) => {
    // Check if this is a WebM video file
    const isWebM = image.src.toLowerCase().includes('.webm');
    
    if (isWebM) {
      return (
        <video
          key={index}
          src={image.src}
          className="h-50 w-auto object-contain"
          autoPlay
          loop
          muted
          playsInline
          style={{ opacity: 0 }}
          onLoadedData={(e: React.SyntheticEvent<HTMLVideoElement>) => {
            e.currentTarget.style.opacity = "1";
          }}
        />
      );
    }

    return (
      <img
        key={index}
        src={image.src}
        alt={image.alt}
        className="h-50 w-auto object-contain"
        loading="lazy"
        width={image.width}
        height={image.height}
        decoding="async"
        onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
          e.currentTarget.style.opacity = "1";
        }}
        style={{ opacity: 0 }}
      />
    );
  };

  // No SSR fallback gymnastics required; Astro island loads this client-side

  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(containerRef);

  const galleryContent = (
    <div
      ref={containerRef}
      className="flex gap-2 flex-nowrap overflow-x-auto scrollbar-always-visible"
    >
      {isVisible &&
        images.map((image, index) => (
          <div key={index} className="shrink-0 min-w-fit">
            {variant === "desktop" && !isMobile() ? (
              <Cambio.Root motion="snappy" dismissible>
                <Cambio.Trigger asChild>
                  <div className="cursor-zoom-in shrink-0 min-w-fit">
                    {renderImage(image, index)}
                  </div>
                </Cambio.Trigger>
                <Cambio.Portal>
                  <Cambio.Backdrop
                    motion="snappy"
                    className="bg-black/80 backdrop-blur-sm z-[12000]"
                  />
                  <Cambio.Popup
                    motion="snappy"
                    className="z-[12001] p-0 bg-transparent flex items-center justify-center"
                  >
                    <Cambio.Close asChild>
                      {image.src.toLowerCase().includes('.webm') ? (
                        <video
                          src={image.src}
                          className="max-w-[90vw] max-h-[85vh] object-contain cursor-zoom-out"
                          autoPlay
                          loop
                          muted
                          playsInline
                          controls
                          draggable={false}
                          style={{
                            boxShadow: `
                            0 0 50px rgba(0, 0, 0, 0.3),
                            0 25px 50px -12px rgba(0, 0, 0, 0.25),
                            0 20px 25px -5px rgba(0, 0, 0, 0.1)
                          `,
                          }}
                        />
                      ) : (
                        <img
                          src={image.src}
                          alt={image.alt}
                          className="max-w-[90vw] max-h-[85vh] object-contain cursor-zoom-out"
                          decoding="async"
                          fetchPriority="high"
                          draggable={false}
                          style={{
                            boxShadow: `
                            0 0 50px rgba(0, 0, 0, 0.3),
                            0 25px 50px -12px rgba(0, 0, 0, 0.25),
                            0 20px 25px -5px rgba(0, 0, 0, 0.1)
                          `,
                          }}
                        />
                      )}
                    </Cambio.Close>
                  </Cambio.Popup>
                </Cambio.Portal>
              </Cambio.Root>
            ) : (
              renderImage(image, index)
            )}
          </div>
        ))}
    </div>
  );

  return variant === "desktop" ? (
    <div className="col-span-4">{galleryContent}</div>
  ) : (
    galleryContent
  );
}
