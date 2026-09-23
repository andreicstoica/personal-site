import { hash } from "./buffer";
import { mix, type Rgb } from "./palette";
import type { Place } from "./scene";

export const SKY_ROWS: Record<Place, number> = {
	"painted-hills": 20,
	"bend-plateau": 23,
	"cascade-forest": 26,
	"columbia-gorge": 25,
	"oregon-coast": 22,
};
export const LAYER_SPEEDS = [0.5, 2, 4] as const;
export const DETAIL = 4;
const TAU = Math.PI * 2;

function ridge(x: number, base: number, amplitude: number, phase = 0): number {
	return (
		base +
		amplitude *
			(Math.sin((x / 160) * TAU + phase) +
				0.32 * Math.sin((x / 160) * TAU * 3 + phase))
	);
}
function distance(x: number, center: number): number {
	return ((x - center + 240) % 160) - 80;
}
function noise(x: number, y: number, cells = 32): number {
	const px = (x / 160) * cells;
	const py = (y / 160) * cells;
	const ix = Math.floor(px),
		iy = Math.floor(py);
	const fx = px - ix,
		fy = py - iy;
	const u = fx * fx * (3 - 2 * fx),
		v = fy * fy * (3 - 2 * fy);
	const sample = (dx: number, dy: number) =>
		hash(((((ix + dx) % cells) + cells) % cells) * 137 + (iy + dy) * 7919);
	return (
		(sample(0, 0) * (1 - u) + sample(1, 0) * u) * (1 - v) +
		(sample(0, 1) * (1 - u) + sample(1, 1) * u) * v
	);
}
function stone(x: number, y: number): number {
	return noise(x, y, 24) * 0.5 + noise(x, y, 80) * 0.3 + noise(x, y, 240) * 0.2;
}

function fir(
	x: number,
	y: number,
	spacing: number,
	ground: number,
	height: number,
): boolean {
	const cell = Math.floor(x / spacing);
	const dx = (x % spacing) - spacing * (0.35 + hash(cell * 43) * 0.3);
	const h = height * (0.65 + hash(cell * 19 + ground) * 0.35);
	const top = ground - h;
	const width = (y - top) * 0.24 * (0.8 + 0.2 * Math.sin(y * 9));
	return y > top && y < ground && (Math.abs(dx) < width || Math.abs(dx) < 0.16);
}
function texture(color: Rgb, x: number, y: number, strength = 0.05): Rgb {
	const grain =
		(hash(Math.floor(x * 4) * 73 + Math.floor(y * 4) * 7919) - 0.5) * strength;
	return [
		color[0] * (1 + grain),
		color[1] * (1 + grain),
		color[2] * (1 + grain),
	];
}

/** Opaque material below each silhouette, transparent above; all profiles tile. */
export function material(
	place: Place,
	layer: number,
	x: number,
	y: number,
): Rgb | null {
	let color: Rgb | null = null;
	switch (place) {
		case "cascade-forest": {
			if (layer === 0) {
				const dx = distance(x, 81);
				const crest = 4 + Math.abs(dx / (dx < 0 ? 1.8 : 1.5)) ** 0.91;
				if (y >= Math.min(crest, ridge(x, 34, 2))) {
					const snowline = 17 + Math.sin(dx * 0.45) * 1.1 + noise(x, y, 80) * 2;
					const fold =
						0.35 + 0.3 * Math.sin((dx / (y + 1)) * 27) + stone(x, y) * 0.35;
					color =
						y < snowline
							? mix(
									[166, 190, 207],
									[239, 241, 233],
									fold * 0.6 + (dx < 0 ? 0.4 : 0),
								)
							: mix([86, 110, 120], [146, 155, 151], fold * 0.65);
				}
			} else if (layer === 1) {
				if (y > ridge(x, 34, 2) || fir(x, y, 3.2, 37, 9))
					color = mix([40, 78, 74], [67, 102, 87], stone(x, y));
			} else if (y > ridge(x, 45, 1.4) || fir(x, y, 13.3333333333, 48, 19)) {
				color = mix([14, 40, 36], [40, 72, 48], stone(x, y));
			}
			break;
		}
		case "painted-hills": {
			const crest = ridge(x, 24 + layer * 9, 5 - layer, layer * 2);
			if (y >= crest) {
				const strata = (y - crest) * 0.9 + Math.sin((x / 160) * TAU * 5) * 0.3;
				const bands: Rgb[] = [
					[166, 80, 52],
					[207, 151, 79],
					[219, 182, 126],
					[106, 74, 61],
				];
				const index = Math.floor(strata / 2) % bands.length;
				color = mix(
					bands[index] ?? [166, 80, 52],
					bands[(index + 1) % bands.length] ?? [166, 80, 52],
					((strata / 2) % 1) * 0.35,
				);
				color = mix(color, [58, 53, 43], layer * 0.1);
				if (layer === 2 && noise(x, y, 240) > 0.74)
					color = mix(color, [54, 49, 33], 0.4);
			}
			break;
		}
		case "bend-plateau": {
			if (layer === 0) {
				const dx = distance(x, 99);
				const wall = 17 + 2 * Math.sin(x * 0.25) + Math.sin(x * 1.3);
				const monkey = Math.abs(distance(x, 48));
				const tower =
					y > 11 && y < 17
						? monkey < 4.5
						: monkey < 2.5 + Math.max(0, y - 17) * 0.18;
				if (
					(Math.abs(dx) < 33 && y > wall) ||
					(tower && y > 11) ||
					y > ridge(x, 32, 3)
				) {
					color = mix(
						[136, 91, 66],
						[213, 163, 112],
						0.2 + stone(x, y) * 0.65 + noise(x, y * 0.12, 120) * 0.15,
					);
				}
			} else if (layer === 1 && y > ridge(x, 35, 1.5)) {
				color = mix(
					[40, 87, 90],
					[92, 132, 129],
					0.5 + 0.5 * Math.sin(y * 5 + Math.sin(x * 0.3)),
				);
			} else if (layer === 2) {
				const ground = ridge(x, 44, 1.5);
				if (y > ground)
					color = mix([108, 100, 62], [156, 134, 88], stone(x, y));
				for (const cx of [18, 134]) {
					const dx = distance(x, cx);
					if (
						(dx / 5) ** 2 + ((y - 37) / 3.5) ** 2 <
							1 + 0.16 * Math.sin(x * 3) ||
						(Math.abs(dx) < 0.35 && y > 37 && y < 46)
					)
						color = [35, 63, 43];
				}
			}
			break;
		}
		case "columbia-gorge": {
			if (layer === 0 && y > ridge(x, 25, 5)) color = [88, 119, 116];
			if (layer === 1) {
				const dx = Math.abs(distance(x, 0));
				const crest = 10 + dx * 0.6 + Math.sin((x / 160) * TAU * 9);
				if (y > crest) {
					color = mix(
						[43, 65, 60],
						[79, 104, 76],
						stone(x, y) * 0.5 + noise(x, y * 0.1, 120) * 0.5,
					);
					if (
						Math.abs(distance(x, 137) + Math.sin(y * 0.8) * 0.3) < 0.65 &&
						y > 25
					)
						color = [185, 208, 200];
				}
				if (y > 35)
					color = mix(
						[32, 79, 94],
						[67, 122, 132],
						0.5 + 0.5 * Math.sin(y * 4 + Math.sin(x * 0.4)),
					);
			}
			if (
				layer === 2 &&
				(y > ridge(x, 47, 1.7) ||
					(Math.abs(distance(x, 12)) < 14 && fir(x, y, 8, 48, 15)))
			)
				color = [22, 51, 41];
			break;
		}
		case "oregon-coast": {
			if (layer === 0) {
				if (y > 22)
					color = mix(
						[64, 116, 133],
						[117, 156, 159],
						(Math.sin(y * 5 + Math.sin(x * 0.4)) + 1) / 2,
					);
				for (const [cx, height, width] of [
					[110, 17, 10],
					[129, 8, 3],
					[139, 5, 2],
				] as const) {
					const t = (y - (24 - height)) / height;
					if (
						t >= 0 &&
						y < 27 &&
						Math.abs(distance(x, cx)) < width * Math.min(1, 0.13 + t * 1.3)
					)
						color = mix([62, 77, 77], [116, 126, 116], stone(x, y));
				}
			}
			if (layer === 1 && y > ridge(x, 31, 1.2)) {
				color = mix([121, 140, 136], [173, 163, 141], (y - 30) / 15);
				if (y < ridge(x, 31, 1.2) + 0.5) color = [200, 211, 198];
			}
			if (layer === 2 && y > ridge(x, 41, 1.5)) {
				color = [151, 143, 116];
				const dx = distance(x, 43);
				const pool = (dx / 20) ** 2 + ((y - 44.7) / 2.2) ** 2;
				if (pool < 1.15) color = pool > 0.9 ? [58, 69, 60] : [32, 88, 91];
				const sx = dx + 7,
					sy = (y - 43) * 1.3;
				const angle = Math.atan2(sy, sx);
				if (Math.hypot(sx, sy) < 0.95 + 0.65 * Math.cos(angle * 5))
					color = [205, 111, 65];
				const ax = dx - 8,
					ay = (y - 43) * 1.6;
				const radius = Math.hypot(ax, ay);
				if (radius < 1.7 + 0.35 * Math.cos(Math.atan2(ay, ax) * 13))
					color = radius < 0.6 ? [35, 67, 59] : [103, 150, 98];
			}
			break;
		}
	}
	return color ? texture(color, x, y) : null;
}
