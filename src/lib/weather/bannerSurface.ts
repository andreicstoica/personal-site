import { BANNER_HEIGHT, BANNER_WIDTH } from "./buffer";
import type { BannerImage } from "./draw";
import { renderPlate } from "./draw";
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
	if (!(gl instanceof WebGL2RenderingContext) || !gl.isContextLost()) {
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
	frame: (scene: Scene, animationFrame: number, timeSeconds: number) => void;
	destroy: () => void;
};

/**
 * WebGL composites weather over the plate. If that context cannot be created,
 * paint the plate directly so the scene is never left as a black canvas.
 */
export function mountBanner(canvas: HTMLCanvasElement): BannerFrame | null {
	const gl = createBannerGl(canvas);
	if (gl) {
		canvas.dataset.renderer = "webgl";
		return {
			resize: gl.resize,
			frame(scene, animationFrame, timeSeconds) {
				gl.setScene(scene);
				gl.upload(renderPlate(scene, animationFrame));
				gl.draw(timeSeconds);
			},
			destroy: gl.destroy,
		};
	}

	const plate = createPlatePainter(canvas);
	if (!plate) return null;
	canvas.dataset.renderer = "plate";
	return {
		resize: plate.resize,
		frame(scene, animationFrame) {
			plate.paint(renderPlate(scene, animationFrame));
		},
		destroy() {
			plate.destroy();
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
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(plate, 0, 0, canvas.width, canvas.height);
		},
		destroy() {
			plate.width = 0;
			plate.height = 0;
		},
	};
}
