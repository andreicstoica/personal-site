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
	return x - center;
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
	const dx = x - cell * spacing - spacing * (0.35 + hash(cell * 43) * 0.3);
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

type Point = readonly [number, number];
type Profile = readonly [Point, ...Point[]];

function profile(x: number, points: Profile): number {
	let previous = points[0];
	for (const current of points) {
		const [ax, ay] = previous;
		const [bx, by] = current;
		if (x <= bx)
			return bx === ax
				? by
				: ay + (by - ay) * Math.max(0, (x - ax) / (bx - ax));
		previous = current;
	}
	return previous[1];
}

const SMITH_CREST: Profile = [
	[59, 34],
	[64, 24],
	[65, 17],
	[67, 13],
	[69, 12],
	[70, 17],
	[72, 22],
	[75, 17],
	[76, 10],
	[77, 8],
	[79, 8.5],
	[80, 10],
	[81, 10.2],
	[82, 18],
	[84, 16],
	[85, 14],
	[86, 14.5],
	[87, 20],
	[89, 25],
	[93, 20],
	[95, 12],
	[96, 11],
	[97, 6],
	[99, 6.5],
	[100, 7],
	[101, 13],
	[103, 14],
	[104, 18],
	[106, 16],
	[107, 12],
	[108, 12.4],
	[110, 19],
	[112, 21],
	[114, 20],
	[116, 16],
	[120, 17],
	[121, 22],
	[123, 23],
	[125, 27],
	[130, 29],
	[136, 35],
];
const HAYSTACK_CREST: Profile = [
	[87, 27],
	[90, 20],
	[93, 11],
	[96, 7],
	[101, 4.8],
	[107, 4.2],
	[112, 5.5],
	[116, 9],
	[119, 16],
	[123, 27],
];

function riverBank(x: number): number {
	return 33 + 7 * Math.exp(-(((x - 80) / 34) ** 2));
}

export const VISTA_WINDOWS = [
	[139.6, 140.4, 15.4, 16.7],
	[141.6, 142.4, 15.4, 16.7],
] as const;

export function vistaWindow(x: number, y: number): boolean {
	return VISTA_WINDOWS.some(
		([left, right, top, bottom]) =>
			x > left && x < right && y > top && y < bottom,
	);
}

/** Opaque material below each silhouette, transparent above; profiles extend beyond the visible window. */
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
				const monkey = x - 48;
				const head = (monkey / 2.5) ** 2 + ((y - 12) / 2.8) ** 2 < 1;
				const stem =
					y >= 13 &&
					Math.abs(monkey + 0.3 * Math.sin(y * 0.4)) <
						1.25 + Math.max(0, y - 25) * 0.3;
				if (
					head ||
					stem ||
					y >= profile(x, SMITH_CREST) ||
					y > ridge(x, 34, 2)
				) {
					const fold = noise(x, y * 0.07, 140);
					const strata = Math.sin(y * 2.1 + Math.sin(x * 0.09) * 0.6);
					color = mix([116, 83, 91], [216, 143, 76], fold * 0.8 + 0.15);
					color = mix(color, [237, 177, 113], Math.max(0, strata) * 0.15);
					if (noise(x + Math.sin(y * 0.4) * 0.12, y * 0.04, 320) > 0.72)
						color = mix(color, [85, 65, 75], 0.4);
				}
			} else if (layer === 1 && y > riverBank(x)) {
				color = mix(
					[40, 87, 90],
					[92, 132, 129],
					0.5 + 0.5 * Math.sin(y * 5 + Math.sin(x * 0.3)),
				);
				if (y < riverBank(x) + 0.5) color = [156, 139, 102];
			} else if (layer === 2) {
				const ground = riverBank(x) + 5;
				if (y > ground)
					color = mix([108, 100, 62], [156, 134, 88], stone(x, y));
				if (y > ground - 0.7 && y < ground + 1 && noise(x, y, 240) > 0.53)
					color = [111, 117, 76];
				for (const cx of [18, 134]) {
					const dx = x - cx;
					const base = riverBank(cx) + 5.5;
					const dy = y - base;
					if (
						dy > -4 &&
						dy < 0 &&
						Math.abs(dx + 0.8 + dy * 0.28 + Math.sin(dy * 1.7) * 0.25) < 0.4
					)
						color = [79, 69, 49];
					if (dx > 0 && dx < 3.6 && Math.abs(dy + 2.3 + dx * 0.55) < 0.18)
						color = [181, 170, 134];
					for (const [ox, oy, rx, ry] of [
						[-3, -4, 3.1, 1.5],
						[0.1, -5.1, 2.8, 1.9],
						[3, -3.7, 2.2, 1.3],
					] as const) {
						if (
							((dx - ox) / rx) ** 2 + ((dy - oy) / ry) ** 2 <
							1 + 0.13 * Math.sin(x * 5 + y * 3)
						)
							color = mix([43, 57, 32], [66, 77, 44], stone(x, y));
					}
				}
			}
			break;
		}
		case "columbia-gorge": {
			if (layer === 0) {
				const far = Math.min(18 + x * 0.19, 21 + (160 - x) * 0.16);
				if (y > far) color = mix([74, 106, 122], [103, 133, 142], stone(x, y));
				const near = Math.min(22 + x * 0.27, 25 + (160 - x) * 0.23);
				if (y > near) color = [63, 95, 107];
			}
			if (layer === 1) {
				const left = profile(x, [
					[-4, 10],
					[8, 11],
					[13, 17],
					[25, 18],
					[30, 25],
					[40, 27],
					[46, 35],
					[164, 35],
				]);
				if (y > left) {
					color = mix([37, 51, 53], [68, 83, 73], noise(x, y * 0.08, 170));
					if (y < left + 1.4) color = [39, 70, 52];
					if (Math.abs(x - 27.5 + Math.sin(y * 0.7) * 0.2) < 0.4 && y > 20)
						color = [174, 198, 196];
				}
				if (y > 35)
					color = mix(
						[32, 79, 94],
						[67, 122, 132],
						0.5 + 0.5 * Math.sin(y * 4 + Math.sin(x * 0.4)),
					);
				const crown = profile(x, [
					[-4, 49],
					[120, 49],
					[130, 38],
					[136, 19],
					[140, 18],
					[146, 19],
					[153, 22],
					[164, 22],
				]);
				if (y >= crown) {
					color = mix([30, 44, 48], [58, 73, 66], noise(x, y * 0.07, 180));
					if (y < crown + 0.8) color = [40, 64, 43];
				}
				const houseX = Math.abs(x - 141);
				if (
					y >= 14.4 &&
					y <= 18.6 &&
					houseX < 2.9 - Math.max(0, 15.2 - y) * 0.7
				)
					color = houseX > 1.8 ? [147, 146, 124] : [199, 194, 167];
				if (
					y >= 12 &&
					y < 14.7 &&
					(houseX / 3.1) ** 2 + ((y - 14.7) / 2.7) ** 2 < 1
				)
					color = [66, 85, 78];
				if (vistaWindow(x, y)) color = [80, 88, 70];
			}
			if (
				layer === 2 &&
				(y > ridge(x, 47, 0.7) ||
					(x < 21 && (y > 43 + x * 0.12 || fir(x, y, 8, 48, 15))))
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
				const rock = x >= 87 && x <= 123 && y >= profile(x, HAYSTACK_CREST);
				let needle = false;
				for (const [cx, top, width] of [
					[130, 16, 2.3],
					[137, 19, 1.8],
					[143, 17.5, 1.6],
				] as const) {
					if (
						y >= top &&
						Math.abs(x - cx + Math.sin(y * 2) * 0.25) <
							width * Math.min(1, 0.16 + (y - top) * 0.18)
					)
						needle = true;
				}
				if ((rock || needle) && y < 27.5) {
					color = mix([34, 44, 48], [66, 72, 68], stone(x, y));
					if (rock && y > 8 && y < 23 && noise(x, y * 0.07, 220) > 0.68)
						color = mix(color, [130, 137, 121], 0.2);
				}
				if (
					y > 26.6 &&
					y < 27.5 + Math.sin(x * 1.7) * 0.25 &&
					((x > 86 && x < 124) || needle)
				)
					color = [170, 190, 183];
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
