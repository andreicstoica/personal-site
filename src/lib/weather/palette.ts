import type { Scene, TimeOfDay } from "./scene";

export type Rgb = readonly [number, number, number];
export type Lighting = {
	zenith: Rgb;
	horizon: Rgb;
	ambient: Rgb;
	direct: Rgb;
	sun: readonly [number, number];
};

/** Linear shader inputs; the fallback uses this same sky and land light. */
export const LIGHTING: Record<TimeOfDay, Lighting> = {
	day: {
		zenith: [0.19, 0.43, 0.68],
		horizon: [0.77, 0.86, 0.87],
		ambient: [0.76, 0.83, 0.88],
		direct: [0.28, 0.23, 0.15],
		sun: [0.73, 0.18],
	},
	"golden-hour": {
		zenith: [0.28, 0.26, 0.46],
		horizon: [0.98, 0.65, 0.38],
		ambient: [0.65, 0.54, 0.57],
		direct: [0.52, 0.31, 0.12],
		sun: [0.76, 0.48],
	},
	night: {
		zenith: [0.018, 0.03, 0.075],
		horizon: [0.16, 0.23, 0.32],
		ambient: [0.16, 0.23, 0.35],
		direct: [0.09, 0.12, 0.17],
		sun: [0.73, 0.18],
	},
};

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
	const amount = Math.min(1, Math.max(0, t));
	return [
		a[0] + (b[0] - a[0]) * amount,
		a[1] + (b[1] - a[1]) * amount,
		a[2] + (b[2] - a[2]) * amount,
	];
}

export function lighting(scene: Scene): Lighting {
	const base = LIGHTING[scene.time];
	const overcast =
		scene.weather === "rainy"
			? 0.7
			: scene.weather === "cloudy"
				? 0.45
				: scene.weather === "fog"
					? 0.65
					: 0;
	const mode = scene.colorMode === "dark" ? 0.88 : 1;
	const scale = (c: Rgb, n: number): Rgb => [c[0] * n, c[1] * n, c[2] * n];
	const sky = mix(base.horizon, base.zenith, 0.4);
	const gray =
		(sky[0] * 0.3 + sky[1] * 0.5 + sky[2] * 0.2) *
		(scene.weather === "rainy" ? 0.75 : 1);
	const haze: Rgb = [gray * 0.88, gray * 0.95, gray];
	return {
		zenith: scale(mix(base.zenith, haze, overcast), mode),
		horizon: scale(mix(base.horizon, haze, overcast), mode),
		ambient: scale(base.ambient, mode * (1 - overcast * 0.2)),
		direct: scale(base.direct, mode * (1 - overcast)),
		sun: base.sun,
	};
}

function multiply(a: Rgb, b: Rgb): Rgb {
	return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}
function bytes(color: Rgb): Rgb {
	return multiply(color, [255, 255, 255]);
}
export function grade(color: Rgb, scene: Scene): Rgb {
	const { ambient, direct } = lighting(scene);
	return multiply(color, [
		ambient[0] + direct[0] * 0.5,
		ambient[1] + direct[1] * 0.5,
		ambient[2] + direct[2] * 0.5,
	]);
}
export function cloudColors(scene: Scene): { lit: Rgb; shade: Rgb } {
	const light = lighting(scene);
	return {
		lit: bytes(mix(light.horizon, light.direct, 0.2)),
		shade: bytes(mix(light.zenith, light.horizon, 0.35)),
	};
}
export function rainColor(scene: Scene): Rgb {
	return cloudColors(scene).lit;
}
export function fogColor(scene: Scene): Rgb {
	return bytes(lighting(scene).horizon);
}
