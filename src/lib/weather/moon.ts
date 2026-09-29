import type { Rgb } from "./palette";

export const MOON_RADIUS = 3.57;
/** Dark maria as [x, y, rx, ry] ellipses, scaled with the disc. */
export const MOON_MARIA = [
	[-1.28, -0.94, 1.15, 1.45],
	[0.55, -1.4, 0.94, 0.72],
	[1.36, 0.64, 0.89, 1.15],
	[-0.68, 1.96, 0.51, 0.47],
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
