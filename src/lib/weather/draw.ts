import { assertNever } from "../assertNever";
import {
	BANNER_HEIGHT,
	BANNER_WIDTH,
	dither,
	hash,
	PixelBuffer,
} from "./buffer";
import { drawPlace, SKY_ROWS } from "./landscapes";
import {
	mix,
	moonColor,
	type Rgb,
	skyStops,
	starColor,
	sunCore,
	sunDisc,
} from "./palette";
import type { Scene } from "./scene";

export type BannerImage = {
	width: number;
	height: number;
	data: Uint8ClampedArray;
};

/** Landscape plate. Weather is composited in the WebGL shader. */
export function renderPlate(scene: Scene, frame: number): BannerImage {
	const buf = new PixelBuffer(BANNER_WIDTH, BANNER_HEIGHT);
	const stops = skyStops(scene);
	const bottom = stops[stops.length - 1] ?? ([0, 0, 0] as Rgb);
	buf.fill(bottom, true);
	const skyHeight = SKY_ROWS[scene.place];
	drawSky(buf, stops, skyHeight);
	if (showStars(scene)) drawStars(buf, skyHeight, starColor(scene), frame);
	drawCelestial(buf, scene, skyHeight);
	drawPlace(buf, scene, frame);
	applySunlight(buf, scene);
	return { width: buf.width, height: buf.height, data: buf.data };
}

function drawSky(
	buf: PixelBuffer,
	stops: readonly Rgb[],
	height: number,
): void {
	const last = stops.length - 1;
	if (last <= 0) return;
	for (let y = 0; y < height; y++) {
		const t = height <= 1 ? 0 : y / (height - 1);
		const scaled = t * last;
		const index = Math.min(last - 1, Math.floor(scaled));
		const from = stops[index];
		const to = stops[index + 1];
		if (from === undefined || to === undefined) continue;
		const frac = scaled - index;
		for (let x = 0; x < buf.width; x++) {
			buf.set(x, y, dither(x, y, from, to, frac), true);
		}
	}
}

function showStars(scene: Scene): boolean {
	return (
		scene.time === "night" &&
		(scene.weather === "clear" || scene.weather === "sunny")
	);
}

function drawStars(
	buf: PixelBuffer,
	skyHeight: number,
	color: Rgb,
	frame: number,
): void {
	const limit = Math.max(2, skyHeight - 1);
	for (let i = 0; i < 22; i++) {
		const twinkles = hash(i * 3) > 0.86;
		const hidden = frame > 0 && twinkles && frame % 16 < 2;
		if (hidden) continue;
		const x = Math.floor(hash(i * 53 + 9) * buf.width);
		const y = Math.floor(hash(i * 29 + 4) * limit);
		buf.set(x, y, color, true);
		if (hash(i * 7) > 0.8) buf.set(x + 1, y, color, true);
	}
}

function drawCelestial(
	buf: PixelBuffer,
	scene: Scene,
	skyHeight: number,
): void {
	if (
		scene.weather === "cloudy" ||
		scene.weather === "rainy" ||
		scene.weather === "fog"
	) {
		return;
	}
	if (scene.time === "night" && scene.weather !== "sunny") {
		buf.ellipse(122, 8, 3, 3, moonColor(), true);
		buf.set(123, 8, skyStops(scene)[0] ?? moonColor(), true);
		return;
	}
	const center = sunCenter(scene, skyHeight);
	const radius = sunRadius(scene);
	buf.ellipse(center.x, center.y, radius, radius, sunDisc(scene), true);
	buf.ellipse(
		center.x - 1,
		center.y - 1,
		Math.max(1, radius - 2),
		Math.max(1, radius - 2),
		sunCore(scene),
		true,
	);
	if (scene.weather !== "sunny") return;
	const ray = sunDisc(scene);
	for (let i = radius + 2; i <= radius + 5; i++) {
		buf.set(center.x + i, center.y, ray, true);
		buf.set(center.x - i, center.y, ray, true);
		buf.set(center.x, center.y + i, ray, true);
		buf.set(center.x, center.y - i, ray, true);
	}
}

function sunCenter(scene: Scene, skyHeight: number): { x: number; y: number } {
	switch (scene.time) {
		case "dawn":
			return { x: 28, y: Math.max(7, skyHeight - 2) };
		case "dusk":
			return { x: 132, y: Math.max(7, skyHeight - 2) };
		case "night":
			return { x: 36, y: 9 };
		case "day":
			return scene.weather === "sunny" ? { x: 42, y: 8 } : { x: 116, y: 8 };
		default:
			return assertNever(scene.time);
	}
}

function sunRadius(scene: Scene): number {
	if (scene.weather === "sunny") return 5;
	if (scene.time === "dawn" || scene.time === "dusk") return 3;
	return 2;
}

function applySunlight(buf: PixelBuffer, scene: Scene): void {
	if (
		scene.weather === "fog" ||
		scene.weather === "rainy" ||
		scene.weather === "cloudy"
	) {
		return;
	}
	if (scene.time === "night" && scene.weather !== "sunny") return;
	const harsh = scene.weather === "sunny";
	const light: Rgb = harsh ? [255, 228, 160] : [255, 210, 150];
	const shadow: Rgb = [16, 12, 28];
	for (let y = 1; y < buf.height - 2; y++) {
		for (let x = 0; x < buf.width; x++) {
			if (buf.isSky(x, y) || !buf.isSky(x, y - 1)) continue;
			const current = buf.get(x, y);
			if (current) {
				buf.set(x, y, mix(current, light, harsh ? 0.62 : 0.3), false);
			}
			if (!harsh) continue;
			const below = buf.get(x, y + 2);
			if (below && !buf.isSky(x, y + 2)) {
				buf.set(x, y + 2, mix(below, shadow, 0.5), false);
			}
		}
	}
}
