"use client";

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
			{ threshold: 0.1 },
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
	const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
	const [isClosing, setIsClosing] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const isVisible = useIntersectionObserver(containerRef);

	const isMobile = () => {
		if (typeof window === "undefined") return false;
		return (
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				navigator.userAgent,
			) || window.innerWidth <= 768
		);
	};

	const renderImage = (image: ImageData, index: number) => {
		// Check if this is a WebM video file
		const isWebM = image.src.toLowerCase().includes(".webm");

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

	const closeModal = () => {
		setIsClosing(true);
		setTimeout(() => {
			setSelectedImage(null);
			setIsClosing(false);
		}, 100);
	};

	// Close modal on escape key
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeModal();
		};

		if (selectedImage) {
			document.addEventListener("keydown", handleEscape);
			return () => document.removeEventListener("keydown", handleEscape);
		}
	}, [selectedImage]);

	const galleryContent = (
		<div
			ref={containerRef}
			className="flex gap-2 flex-nowrap overflow-x-auto scrollbar-always-visible"
		>
			{isVisible &&
				images.map((image, index) => (
					<div key={index} className="shrink-0 min-w-fit">
						{variant === "desktop" && !isMobile() ? (
							<div
								className="cursor-zoom-in shrink-0 min-w-fit"
								onClick={() => setSelectedImage(image)}
							>
								{renderImage(image, index)}
							</div>
						) : (
							renderImage(image, index)
						)}
					</div>
				))}
		</div>
	);

	return (
		<>
			{variant === "desktop" ? (
				<div className="col-span-4">{galleryContent}</div>
			) : (
				galleryContent
			)}

			{/* Simple Modal */}
			{selectedImage && (
				<div
					className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[12000] flex items-center justify-center p-4 modal-backdrop ${
						isClosing ? "closing" : ""
					}`}
					onClick={closeModal}
				>
					<div className="relative w-full h-full flex items-center justify-center">
						{selectedImage.src.toLowerCase().includes(".webm") ? (
							<video
								src={selectedImage.src}
								className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain cursor-zoom-out"
								autoPlay
								loop
								muted
								playsInline
								controls
								draggable={false}
								onClick={closeModal}
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
								src={selectedImage.src}
								alt={selectedImage.alt}
								className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain cursor-zoom-out"
								decoding="async"
								fetchPriority="high"
								draggable={false}
								onClick={closeModal}
								style={{
									boxShadow: `
                    0 0 50px rgba(0, 0, 0, 0.3),
                    0 25px 50px -12px rgba(0, 0, 0, 0.25),
                    0 20px 25px -5px rgba(0, 0, 0, 0.1)
                  `,
								}}
							/>
						)}
						<button
							onClick={closeModal}
							className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full w-8 h-8 flex items-center justify-center transition-colors z-10"
						>
							✕
						</button>
					</div>
				</div>
			)}
		</>
	);
}
