import type { Rgb } from "./palette";

export const DITHER_LEVELS = 24;
export const DITHER_CELL_CSS = 2;

export function quantize(color: Rgb, x: number, y: number): Rgb {
	const rank = (x: number, y: number) => 2 * x + 3 * y - 4 * x * y;
	const threshold =
		(4 * rank(x % 2, y % 2) +
			rank(Math.floor(x / 2) % 2, Math.floor(y / 2) % 2) +
			0.5) /
		16;
	const channel = (value: number) =>
		(Math.floor(
			Math.min(1, Math.max(0, value / 255)) * (DITHER_LEVELS - 1) + threshold,
		) *
			255) /
		(DITHER_LEVELS - 1);
	return [channel(color[0]), channel(color[1]), channel(color[2])];
}
