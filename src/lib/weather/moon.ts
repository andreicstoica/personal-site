import type { Rgb } from "./palette";

export const MOON_RADIUS = 4.2;
export const MOON_MARIA = [
	[-1.5, -1.1, 1.35, 1.7],
	[0.65, -1.65, 1.1, 0.85],
	[1.6, 0.75, 1.05, 1.35],
	[-0.8, 2.3, 0.6, 0.55],
] as const;

export function moonColor(dx: number, dy: number): Rgb | null {
	const x = Math.floor(dx * 2) / 2 + 0.25;
	const y = Math.floor(dy * 2) / 2 + 0.25;
	const limb = MOON_RADIUS + 0.09 * Math.sin(x * 3 + y * 2);
	if (Math.hypot(x, y) > limb) return null;
	const maria = MOON_MARIA.some(
		([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1,
	);
	return maria ? [128, 151, 166] : [214, 223, 218];
}
