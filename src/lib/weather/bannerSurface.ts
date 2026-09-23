import { BANNER_HEIGHT, BANNER_WIDTH } from "./buffer";
import type { BannerImage } from "./draw";
import { renderLayers, renderPlate } from "./draw";
import { createBannerGl } from "./glBanner";
import type { Scene } from "./scene";

/** A hot reload can drop the context. Wait until it can accept new buffers. */
export function whenBannerReady(canvas: HTMLCanvasElement): Promise<void> {
	const gl = canvas.getContext("webgl2", {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
		premultipliedAlpha: false,
	});
	if (!gl || !gl.isContextLost()) {
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		canvas.addEventListener("contextrestored", () => resolve(), {
			once: true,
		});
		gl.getExtension("WEBGL_lose_context")?.restoreContext();
	});
}

export type BannerFrame = {
	resize: (cssWidth: number, cssHeight: number, dpr: number) => void;
	frame: (scene: Scene, timeSeconds: number) => void;
	destroy: () => void;
};

/**
 * WebGL lights and composites the terrain layers. If that context cannot be created,
 * paint the plate directly so the scene is never left as a black canvas.
 */
export function mountBanner(canvas: HTMLCanvasElement): BannerFrame | null {
	const gl = createBannerGl(canvas);
	if (gl) {
		canvas.dataset.renderer = "webgl";
		let uploadedPlace: Scene["place"] | null = null;
		return {
			resize: gl.resize,
			frame(scene, timeSeconds) {
				gl.setScene(scene);
				if (uploadedPlace !== scene.place) {
					gl.upload(renderLayers(scene.place));
					uploadedPlace = scene.place;
				}
				gl.draw(timeSeconds);
			},
			destroy: gl.destroy,
		};
	}

	// A canvas that acquired WebGL cannot subsequently acquire a 2D context.
	const fallback = document.createElement("canvas");
	fallback.className = canvas.className;
	fallback.style.cssText = canvas.style.cssText;
	fallback.setAttribute("aria-hidden", "true");
	canvas.after(fallback);
	canvas.style.display = "none";
	const plate = createPlatePainter(fallback);
	if (!plate) {
		fallback.remove();
		canvas.style.display = "";
		return null;
	}
	canvas.dataset.renderer = "plate";
	fallback.dataset.renderer = "plate";
	let lastScene = "";
	let lastSize = "";
	return {
		resize: (width, height, dpr) => {
			const size = `${width},${height},${dpr}`;
			if (size === lastSize) return;
			lastSize = size;
			plate.resize(width, height, dpr);
			lastScene = "";
		},
		frame(scene) {
			const key = JSON.stringify(scene);
			if (key === lastScene) return;
			lastScene = key;
			plate.paint(renderPlate(scene));
		},
		destroy() {
			plate.destroy();
			fallback.remove();
			canvas.style.display = "";
		},
	};
}

type PlatePainter = {
	resize: (cssWidth: number, cssHeight: number, dpr: number) => void;
	paint: (image: BannerImage) => void;
	destroy: () => void;
};

function createPlatePainter(canvas: HTMLCanvasElement): PlatePainter | null {
	const ctx = canvas.getContext("2d", { alpha: false });
	if (!ctx) return null;
	const plate = document.createElement("canvas");
	plate.width = BANNER_WIDTH;
	plate.height = BANNER_HEIGHT;
	const plateCtx = plate.getContext("2d");
	if (!plateCtx) return null;

	return {
		resize(cssWidth, cssHeight, dpr) {
			const width = Math.max(1, Math.round(cssWidth * dpr));
			const height = Math.max(1, Math.round(cssHeight * dpr));
			if (canvas.width !== width) canvas.width = width;
			if (canvas.height !== height) canvas.height = height;
		},
		paint(image) {
			if (plate.width !== image.width || plate.height !== image.height) {
				plate.width = image.width;
				plate.height = image.height;
			}
			const copy = new Uint8ClampedArray(image.data);
			plateCtx.putImageData(
				new ImageData(copy, image.width, image.height),
				0,
				0,
			);
			ctx.imageSmoothingEnabled = true;
			ctx.drawImage(plate, 0, 0, canvas.width, canvas.height);
		},
		destroy() {
			plate.width = 0;
			plate.height = 0;
		},
	};
}
