import { hash } from "./buffer";
import { mix, type Rgb } from "./palette";
import { placeMotion } from "./placeMotion";
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
	time = 0,
): Rgb | null {
	let color: Rgb | null = null;
	const motion = placeMotion(time, x);
	switch (place) {
		case "cascade-forest": {
			if (layer === 0) {
				const dx = distance(x, 81);
				const crest =
					4 +
					Math.abs(dx / (dx < 0 ? 1.9 : 1.35)) ** 0.91 +
					Math.sin(dx * 0.5) * Math.min(1, Math.abs(dx) * 0.15);
				if (y >= Math.min(crest, ridge(x, 34, 2))) {
					const snowline =
						16 + Math.sin(dx * 0.34) * 2.5 + noise(x, y, 110) * 4;
					const fold =
						0.2 + noise(dx + y * 0.43, y * 0.16, 170) * 0.7 + stone(x, y) * 0.1;
					color =
						y < snowline
							? mix(
									[166, 190, 207],
									[239, 241, 233],
									fold * 0.6 + (dx < 0 ? 0.4 : 0),
								)
							: mix([86, 110, 120], [146, 155, 151], fold * 0.65);
					const ravine = Math.abs(
						dx - (y - 4) * 0.72 - Math.sin(y * 0.55) * 0.45,
					);
					const rib = Math.abs(dx + (y - 4) * 0.43 + Math.sin(y * 0.9) * 0.3);
					if (
						y > 6 &&
						y < snowline &&
						(ravine < (y - 5) * 0.065 || rib < (y - 5) * 0.045)
					)
						color = mix([84, 109, 130], [136, 158, 168], stone(x, y));
				}
			} else if (layer === 1) {
				if (y > ridge(x, 31, 2.5, 1.3)) color = [84, 117, 132];
				if (
					y > ridge(x, 36, 1.7) ||
					(hash(Math.floor(x / 4.3) * 17) > 0.2 && fir(x, y, 4.3, 38, 7))
				)
					color = mix([40, 78, 74], [67, 102, 87], stone(x, y));
			} else if (layer === 2) {
				if (y > ridge(x, 39.5, 2, 0.7))
					color = mix([68, 91, 43], [110, 127, 65], stone(x, y));
				for (let row = 0; row < 3; row++) {
					const cell = Math.floor((x + row * 3) / 6);
					const cx = cell * 6 + 3 - row * 3;
					if (cx < 34 || cx > 119 || (cx < 46 && hash(cell + row * 71) < 0.5))
						continue;
					const ground = ridge(cx, 40.5 + row * 2.6, 2, 0.7);
					const dx = x - cx - motion.sway * Math.max(0, (ground - y) / 3);
					if (Math.abs(dx) < 0.2 && y > ground - 2 && y < ground)
						color = [71, 57, 38];
					if ((dx / 2.1) ** 2 + ((y - ground + 2) / 1.65) ** 2 < 1) {
						color = mix(
							[39, 77, 36],
							[94, 132, 53],
							0.4 + stone(x, y) * 0.3 + motion.shimmer,
						);
						if (
							hash(
								Math.floor((x - motion.sway) * 3) * 71 +
									Math.floor(y * 3) * 331,
							) > 0.978
						)
							color = [180, 62, 39];
					}
				}
				if ((x < 27 || x > 135) && fir(x, y, 11, 47, 13))
					color = mix([18, 43, 35], [46, 70, 43], stone(x, y));
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
				const far = profile(x, [
					[-4, 17],
					[24, 20],
					[61, 26],
					[99, 29],
					[164, 23],
				]);
				if (y > far) color = mix([74, 106, 122], [103, 133, 142], stone(x, y));
				const near = profile(x, [
					[-4, 24],
					[32, 27],
					[73, 31],
					[105, 26],
					[139, 25],
					[164, 27],
				]);
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
					if (
						Math.abs(x - 27.5 + Math.sin(y * 0.7 + time * 0.9) * 0.18) <
							0.35 + 0.07 * Math.sin(time * 0.7 + y) &&
						y > 20
					)
						color = mix(
							[132, 169, 174],
							[211, 227, 222],
							0.5 + 0.5 * Math.sin(y * 2.8 - time * 4),
						);
					if (
						((x - 27.5) / (1.6 + 0.2 * Math.sin(time))) ** 2 +
							((y - 34.4) / 0.8) ** 2 <
						1
					)
						color = mix(color, [157, 184, 179], 0.45);
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
					[134, 38],
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
				if (
					x > 147 &&
					y >
						17 +
							hash(Math.floor(x / 3.7)) * 2 +
							Math.abs((x % 3.7) - 1.85) * 1.4
				)
					color = [30, 56, 39];
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
			if (layer === 2) {
				const bank = ridge(x, 42.5, 1.1);
				if (y > bank) color = mix([22, 42, 39], [43, 68, 47], stone(x, y));
				const brush = bank - 0.3 - noise(x, 0, 170) * 1.1;
				if (y > brush && y < bank + 0.6)
					color = mix([29, 53, 38], [57, 77, 45], stone(x, y));
				if (x < 21 && fir(x, y, 8, 48, 15)) color = [22, 51, 41];
			}
			break;
		}
		case "oregon-coast": {
			if (layer === 0) {
				if (y > 22)
					color = mix(
						[64, 116, 133],
						[117, 156, 159],
						0.4 + 0.15 * Math.sin(y * 2.3 - time * 1.1 + Math.sin(x * 0.09)),
					);
				for (let wave = 0; wave < 3; wave++) {
					const age = (time * (0.19 + wave * 0.027) + wave / 3) % 1;
					const line = 22 + age * 10 + 0.2 * Math.sin(x * 0.15 + wave);
					if (color && Math.abs(y - line) < 0.14)
						color = mix(color, [197, 216, 209], Math.sin(age * Math.PI) * 0.7);
				}
				const rock = x >= 87 && x <= 123 && y >= profile(x, HAYSTACK_CREST);
				let needle = false;
				for (const [cx, top, width] of [
					[126, 20, 1.1],
					[130, 21.5, 0.85],
					[133, 19.7, 0.9],
				] as const) {
					if (
						y >= top &&
						Math.abs(x - cx + Math.sin(y * 1.3) * 0.12) <
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
					y < 27.5 + Math.sin(x * 1.7 - time * 1.8) * 0.35 &&
					((x > 86 && x < 124) || needle)
				)
					color = [170, 190, 183];
			}
			if (layer === 1 && y > ridge(x, 29.8, 1.2)) {
				color = mix([121, 140, 136], [173, 163, 141], (y - 30) / 15);
				const shore = ridge(x, 32, 1.2) + motion.surf;
				if (y < shore + 1.3)
					color = mix(
						color,
						[82, 129, 139],
						Math.max(0, 0.5 - (y - shore) * 0.2),
					);
				if (y < shore) color = [95, 142, 150];
				if (Math.abs(y - shore) < 0.25 + 0.08 * Math.sin(x * 1.7))
					color = [211, 225, 212];
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
				if (
					radius <
					motion.anemone * (1.7 + 0.35 * Math.cos(Math.atan2(ay, ax) * 13))
				)
					color = radius < 0.6 ? [35, 67, 59] : [103, 150, 98];
				const crab = x - motion.crabX;
				const cy = y - 46.1;
				if (
					(crab / 0.75) ** 2 + (cy / 0.35) ** 2 < 1 ||
					(Math.abs(crab) < 1.25 &&
						Math.abs(cy - Math.sin(crab * 9 + time * 3) * 0.18) < 0.1)
				)
					color = [170, 93, 52];
				for (let i = 0; i < 3; i++) {
					const age = (time + i * 4.7) % 13;
					const bx = x - 39 - i * 6;
					const by = y - (45.8 - age * 0.6);
					if (age < 3 && Math.abs(Math.hypot(bx, by) - 0.3) < 0.1)
						color = [152, 191, 178];
					if (
						age >= 3 &&
						age < 3.4 &&
						Math.abs(Math.hypot(bx, (y - 44) * 2) - 0.3 - (age - 3) * 1.5) < 0.1
					)
						color = mix(color, [152, 191, 178], 1 - (age - 3) / 0.4);
				}
			}
			break;
		}
	}
	if (place === "painted-hills" && layer === 1) {
		for (const shift of [0, 84]) {
			const cx = ((motion.baleX + shift + 8) % 180) - 8;
			const ground = ridge(cx, 33, 4, 2) + 1;
			const dx = x - cx,
				dy = y - ground + 1.1 + Math.sin(cx * 1.7) * 0.12;
			if ((dx / 1.9) ** 2 + ((y - ground) / 0.35) ** 2 < 1)
				color = [102, 76, 42];
			const radius = Math.hypot(dx, dy);
			if (radius < 1.3)
				color = mix(
					[144, 106, 47],
					[222, 184, 99],
					0.5 +
						0.3 * Math.sin(radius * 12 + Math.atan2(dy, dx) - motion.baleAngle),
				);
		}
	}
	if (place === "bend-plateau" && layer === 0) {
		for (const [cx, base] of [
			[102, 25],
			[78, 21],
		] as const) {
			const dx = x - cx,
				dy = y - base + motion.climb;
			if (dy > 0 && dy < 6 && Math.abs(dx - 0.3 * Math.sin(dy * 0.5)) < 0.075)
				color = [180, 179, 150];
			if (
				Math.hypot(dx, dy + 1.2) < 0.32 ||
				(Math.abs(dx) < 0.25 && Math.abs(dy) < 0.85) ||
				(Math.abs(dx) < 0.85 &&
					Math.abs(dy - Math.abs(dx) * 0.8 - Math.sin(time * 0.8) * dx * 0.25) <
						0.13)
			)
				color = [36, 43, 49];
		}
	}
	return color ? texture(color, x, y) : null;
}
