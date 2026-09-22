import { assertNever } from "../assertNever";
import type { ColorMode, Scene, TimeOfDay, Weather } from "./scene";

export type Rgb = readonly [number, number, number];

const STEP = 32;

export function rgb(r: number, g: number, b: number): Rgb {
	return [clampChannel(r), clampChannel(g), clampChannel(b)];
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
	const amount = Math.min(1, Math.max(0, t));
	return rgb(
		a[0] + (b[0] - a[0]) * amount,
		a[1] + (b[1] - a[1]) * amount,
		a[2] + (b[2] - a[2]) * amount,
	);
}

export function quantize(color: Rgb): Rgb {
	return [snap(color[0]), snap(color[1]), snap(color[2])];
}

function snap(value: number): number {
	const clamped = clampChannel(value);
	const snapped = Math.round(clamped / STEP) * STEP;
	return clampChannel(snapped);
}

function clampChannel(value: number): number {
	return Math.max(0, Math.min(255, Math.round(value)));
}

function contrast(color: Rgb, amount: number): Rgb {
	return rgb(
		(color[0] - 128) * amount + 128,
		(color[1] - 128) * amount + 128,
		(color[2] - 128) * amount + 128,
	);
}

function desaturate(color: Rgb, amount: number): Rgb {
	const gray = color[0] * 0.3 + color[1] * 0.5 + color[2] * 0.2;
	return mix(color, [gray, gray, gray], amount);
}

export function grade(color: Rgb, scene: Scene): Rgb {
	const timed = applyTime(color, scene.time);
	const weathered = applyWeather(timed, scene.weather);
	return quantize(applyMode(weathered, scene.colorMode));
}

function applyTime(color: Rgb, time: TimeOfDay): Rgb {
	switch (time) {
		case "day":
			return color;
		case "dawn":
			return mix(color, [255, 150, 88], 0.24);
		case "dusk":
			return mix(color, [188, 78, 62], 0.3);
		case "night":
			return rgb(
				color[0] * 0.4 + 12,
				color[1] * 0.44 + 16,
				color[2] * 0.56 + 24,
			);
		default:
			return assertNever(time);
	}
}

function applyWeather(color: Rgb, weather: Weather): Rgb {
	switch (weather) {
		case "clear":
			return color;
		case "sunny":
			return contrast(mix(color, [255, 206, 110], 0.14), 1.24);
		case "cloudy":
			return mix(color, [148, 154, 160], 0.26);
		case "rainy":
			return mix(
				rgb(color[0] * 0.8, color[1] * 0.86, color[2] * 0.96),
				[58, 76, 98],
				0.24,
			);
		case "fog":
			return mix(desaturate(color, 0.4), [188, 188, 182], 0.16);
		default:
			return assertNever(weather);
	}
}

function applyMode(color: Rgb, mode: ColorMode): Rgb {
	switch (mode) {
		case "light":
			return mix(color, [252, 248, 240], 0.05);
		case "dark":
			return mix(color, [8, 10, 14], 0.2);
		default:
			return assertNever(mode);
	}
}

const SKY: Record<ColorMode, Record<TimeOfDay, readonly Rgb[]>> = {
	light: {
		dawn: [
			[42, 36, 92],
			[112, 74, 140],
			[232, 132, 84],
			[250, 196, 140],
		],
		day: [
			[56, 116, 204],
			[104, 164, 224],
			[184, 218, 244],
			[232, 244, 252],
		],
		dusk: [
			[36, 24, 76],
			[112, 48, 104],
			[224, 92, 68],
			[244, 164, 96],
		],
		night: [
			[8, 10, 28],
			[16, 22, 48],
			[28, 36, 72],
			[40, 52, 92],
		],
	},
	dark: {
		dawn: [
			[18, 12, 40],
			[58, 32, 78],
			[164, 84, 60],
			[196, 132, 96],
		],
		day: [
			[12, 36, 72],
			[24, 68, 116],
			[44, 100, 148],
			[68, 124, 168],
		],
		dusk: [
			[16, 8, 28],
			[64, 24, 52],
			[156, 60, 48],
			[188, 100, 64],
		],
		night: [
			[4, 6, 14],
			[8, 10, 24],
			[14, 20, 40],
			[22, 30, 52],
		],
	},
};

const FOG: Record<ColorMode, readonly Rgb[]> = {
	light: [
		[176, 176, 168],
		[196, 196, 188],
		[214, 214, 206],
		[232, 230, 222],
	],
	dark: [
		[72, 74, 76],
		[92, 94, 96],
		[112, 114, 116],
		[132, 134, 132],
	],
};

export function skyStops(scene: Scene): Rgb[] {
	const base = SKY[scene.colorMode][scene.time];
	if (scene.weather === "fog") {
		return FOG[scene.colorMode].map((color, index) =>
			quantize(mix(color, base[index] ?? color, 0.2)),
		);
	}
	return base.map((color) => quantize(adjustSky(color, scene.weather)));
}

function adjustSky(color: Rgb, weather: Weather): Rgb {
	switch (weather) {
		case "clear":
		case "sunny":
			return weather === "sunny"
				? contrast(mix(color, [255, 196, 110], 0.16), 1.12)
				: color;
		case "cloudy":
			return mix(color, [142, 150, 158], 0.48);
		case "rainy":
			return mix(color, [42, 54, 72], 0.58);
		case "fog":
			return color;
		default:
			return assertNever(weather);
	}
}

export function sunCore(scene: Scene): Rgb {
	if (scene.time === "dawn" || scene.time === "dusk") {
		return quantize([255, 236, 196]);
	}
	return quantize([255, 248, 220]);
}

export function sunDisc(scene: Scene): Rgb {
	if (scene.time === "dawn" || scene.time === "dusk") {
		return quantize([255, 140, 40]);
	}
	if (scene.weather === "sunny") return quantize([255, 196, 32]);
	return quantize([255, 228, 144]);
}

export function cloudColors(scene: Scene): { lit: Rgb; shade: Rgb } {
	if (scene.weather === "rainy") {
		return scene.colorMode === "dark"
			? { lit: quantize([68, 78, 92]), shade: quantize([36, 44, 56]) }
			: { lit: quantize([120, 128, 138]), shade: quantize([72, 80, 92]) };
	}
	return scene.colorMode === "dark"
		? { lit: quantize([132, 140, 148]), shade: quantize([72, 80, 92]) }
		: { lit: quantize([236, 240, 244]), shade: quantize([168, 178, 188]) };
}

export function rainColor(scene: Scene): Rgb {
	return scene.colorMode === "dark"
		? quantize([96, 132, 168])
		: quantize([168, 196, 216]);
}

export function fogColor(scene: Scene): Rgb {
	return scene.colorMode === "dark"
		? quantize([120, 124, 124])
		: quantize([214, 214, 206]);
}

export function moonColor(): Rgb {
	return quantize([228, 232, 214]);
}

export function starColor(scene: Scene): Rgb {
	return scene.colorMode === "dark"
		? quantize([220, 224, 232])
		: quantize([244, 244, 236]);
}
