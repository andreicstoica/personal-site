import { BANNER_HEIGHT, BANNER_WIDTH } from "./buffer";
import { DETAIL, LAYER_SPEEDS, material } from "./landscapes";
import { grade, lighting, mix, type Rgb } from "./palette";
import type { Place, Scene } from "./scene";

export type BannerImage = {
	width: number;
	height: number;
	data: Uint8ClampedArray;
};

/** Three vertically packed RGBA layers. Color is unlit; alpha is coverage. */
export function renderLayers(place: Place): BannerImage {
	const width = BANNER_WIDTH * DETAIL;
	const height = BANNER_HEIGHT * DETAIL;
	const data = new Uint8ClampedArray(width * height * 3 * 4);
	for (let layer = 0; layer < 3; layer++) {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const color = material(
					place,
					layer,
					(x + 0.5) / DETAIL,
					(y + 0.5) / DETAIL,
				);
				if (!color) continue;
				const offset = ((layer * height + y) * width + x) * 4;
				data.set([...color, 255], offset);
			}
		}
	}
	return { width, height: height * 3, data };
}

/** Still CPU fallback, with the same opaque geometry and lighting table. */
export function renderPlate(scene: Scene, timeSeconds = 0): BannerImage {
	const width = BANNER_WIDTH * DETAIL;
	const height = BANNER_HEIGHT * DETAIL;
	const data = new Uint8ClampedArray(width * height * 4);
	const light = lighting(scene);
	for (let y = 0; y < height; y++) {
		const sky = mix(light.zenith, light.horizon, Math.min(1, y / height / 0.7));
		for (let x = 0; x < width; x++) {
			let color: Rgb = [sky[0] * 255, sky[1] * 255, sky[2] * 255];
			for (let layer = 0; layer < 3; layer++) {
				const shifted =
					((x + 0.5) / DETAIL -
						((timeSeconds * (LAYER_SPEEDS[layer] ?? 0)) % BANNER_WIDTH) +
						BANNER_WIDTH) %
					BANNER_WIDTH;
				const surface = material(
					scene.place,
					layer,
					shifted,
					(y + 0.5) / DETAIL,
				);
				if (surface)
					color = mix(
						grade(surface, scene),
						[
							light.horizon[0] * 255,
							light.horizon[1] * 255,
							light.horizon[2] * 255,
						],
						(2 - layer) * 0.13,
					);
			}
			data.set([...color, 255], (y * width + x) * 4);
		}
	}
	return { width, height, data };
}
