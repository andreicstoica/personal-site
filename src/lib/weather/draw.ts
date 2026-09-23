import { BANNER_HEIGHT, BANNER_WIDTH } from "./buffer";
import { DITHER_CELL_CSS, quantize } from "./dither";
import { weatherEffect } from "./effects";
import { DETAIL, material, vistaWindow } from "./landscapes";
import { ATLAS_MARGIN, ATLAS_WIDTH, layerOffsets } from "./motion";
import { grade, lighting, mix, type Rgb } from "./palette";
import type { Place, Scene } from "./scene";

export type BannerImage = {
	width: number;
	height: number;
	data: Uint8ClampedArray;
};

/** Three vertically packed RGBA layers. Color is unlit; alpha is coverage. */
export function renderLayers(place: Place): BannerImage {
	const width = ATLAS_WIDTH * DETAIL;
	const height = BANNER_HEIGHT * DETAIL;
	const data = new Uint8ClampedArray(width * height * 3 * 4);
	for (let layer = 0; layer < 3; layer++) {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const color = material(
					place,
					layer,
					(x + 0.5) / DETAIL - ATLAS_MARGIN,
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
export function renderPlate(
	scene: Scene,
	timeSeconds = 0,
	width = BANNER_WIDTH * DETAIL,
	height = BANNER_HEIGHT * DETAIL,
	ditherSize = DITHER_CELL_CSS,
): BannerImage {
	const data = new Uint8ClampedArray(width * height * 4);
	const light = lighting(scene);
	const offsets = layerOffsets(timeSeconds);
	const effect = weatherEffect(scene);
	const golden = scene.time === "golden-hour" ? 1 : 0;
	const night = scene.time === "night";
	const radius = night ? 0.035 : 0.055 + golden * 0.035;
	const sunColor: Rgb = night
		? [0.65, 0.76, 0.86]
		: golden
			? [1, 0.68, 0.35]
			: [1, 0.91, 0.72];
	const visibility = 1 - Math.max(effect.cloud * 0.85, effect.fog);
	for (let y = 0; y < height; y++) {
		const ramp = Math.min(1, (y + 0.5) / height / 0.78);
		const sky = mix(light.zenith, light.horizon, ramp * ramp * (3 - 2 * ramp));
		for (let x = 0; x < width; x++) {
			const uvX = (x + 0.5) / width;
			const uvY = (y + 0.5) / height;
			const distance = Math.hypot(
				(uvX - light.sun[0]) * 3.3333,
				uvY - light.sun[1],
			);
			const core = Math.exp(-((distance / radius) ** 2) * 2);
			const glow =
				Math.exp(-((distance / (radius * 3)) ** 2)) *
				visibility *
				(night ? 0.045 : 0.13 + golden * 0.13);
			let color: Rgb = mix(
				[
					(sky[0] + sunColor[0] * glow) * 255,
					(sky[1] + sunColor[1] * glow) * 255,
					(sky[2] + sunColor[2] * glow) * 255,
				],
				[sunColor[0] * 255, sunColor[1] * 255, sunColor[2] * 255],
				core * visibility * (night ? 0.55 : 0.85),
			);
			let depth = 0;
			for (let layer = 0; layer < 3; layer++) {
				const shifted = uvX * BANNER_WIDTH - (offsets[layer] ?? 0);
				const surface = material(
					scene.place,
					layer,
					shifted,
					uvY * BANNER_HEIGHT,
				);
				if (surface) {
					depth = (layer + 1) / 3;
					const lit = grade(surface, scene);
					const window =
						scene.place === "columbia-gorge" &&
						layer === 1 &&
						vistaWindow(shifted, uvY * BANNER_HEIGHT);
					const emission = window ? light.windowLight : ([0, 0, 0] as const);
					color = mix(
						[
							lit[0] + emission[0] * 255,
							lit[1] + emission[1] * 255,
							lit[2] + emission[2] * 255,
						],
						[
							light.horizon[0] * 255,
							light.horizon[1] * 255,
							light.horizon[2] * 255,
						],
						(2 - layer) * 0.14 + effect.fog * (0.42 - layer * 0.13),
					);
				}
			}
			color = mix(
				color,
				[
					light.horizon[0] * 255,
					light.horizon[1] * 255,
					light.horizon[2] * 255,
				],
				effect.fog * 0.27 * (1 - depth * 0.65),
			);
			const vignette = 1 - 0.1 * ((uvX - 0.5) ** 2 + (uvY - 0.5) ** 2);
			color = quantize(
				[color[0] * vignette, color[1] * vignette, color[2] * vignette],
				Math.floor(x / ditherSize),
				Math.floor((height - 1 - y) / ditherSize),
			);
			data.set([...color, 255], (y * width + x) * 4);
		}
	}
	return { width, height, data };
}

/** Bound updates to animated material, preserving the static atlas elsewhere. */
export function renderMotionPatches(place: Place, time: number) {
	const regions: Record<
		Place,
		readonly (readonly [number, number, number, number, number])[]
	> = {
		"cascade-forest": [[2, 30, 34, 104, 14]],
		"columbia-gorge": [[1, 25, 20, 5, 16]],
		"oregon-coast": [
			[0, -4, 22, 168, 11],
			[1, -4, 28, 168, 9],
			[2, 34, 41, 22, 7],
		],
		"painted-hills": [[1, -4, 25, 168, 15]],
		"bend-plateau": [[0, 101, 15, 4, 21]],
	};
	return regions[place].map(([layer, left, top, w, h]) => {
		const width = w * DETAIL,
			height = h * DETAIL;
		const data = new Uint8ClampedArray(width * height * 4);
		for (let y = 0; y < height; y++)
			for (let x = 0; x < width; x++) {
				const color = material(
					place,
					layer,
					left + (x + 0.5) / DETAIL,
					top + (y + 0.5) / DETAIL,
					time,
				);
				if (color) data.set([...color, 255], (y * width + x) * 4);
			}
		return {
			x: (left + ATLAS_MARGIN) * DETAIL,
			y: (layer * BANNER_HEIGHT + top) * DETAIL,
			width,
			height,
			data,
		};
	});
}
