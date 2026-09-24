import { hash } from "./buffer";
import { mix, type Rgb } from "./palette";
import {
	baleMotion,
	bubbleMotion,
	placeMotion,
	rapidMotion,
	smoothstep,
} from "./placeMotion";
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
	minCenter = -Infinity,
	maxCenter = Infinity,
): boolean {
	const cell = Math.floor(x / spacing);
	const center = cell * spacing + spacing * (0.35 + hash(cell * 43) * 0.3);
	if (center < minCenter || center > maxCenter) return false;
	const dx = x - center;
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
	[83, 27.5],
	[87, 24],
	[90, 18.5],
	[93, 12.5],
	[96, 8.5],
	[99, 6],
	[101, 5.5],
	[103, 5.8],
	[106, 8.4],
	[110, 12.4],
	[115, 16.7],
	[119, 21.2],
	[124, 25.1],
	[128, 27.5],
];
const NEEDLES_CREST: Profile = [
	[71, 27.3],
	[73, 26.1],
	[74.5, 23.1],
	[75.2, 23],
	[76.5, 25.5],
	[78, 25.6],
	[79, 23.6],
	[79.6, 23.4],
	[80.6, 26.2],
	[82, 27.3],
];

function riverBank(x: number): number {
	return 33 + 7 * Math.exp(-(((x - 80) / 34) ** 2));
}

function riverRock(
	color: Rgb,
	x: number,
	y: number,
	cx: number,
	cy: number,
	size: number,
	time: number,
): Rgb {
	const dx = x - cx,
		dy = y - cy;
	if (dx < -size - 1 || dx > size + 6 || Math.abs(dy) > size * 0.6 + 0.4)
		return color;
	for (let crest = 0; crest < 3; crest++) {
		const flow = rapidMotion(time, crest);
		const tail = dx - size * 0.45 - flow.x;
		const side = (crest % 2 === 0 ? 1 : -1) * size * 0.43;
		if (Math.abs(tail) < 0.7 && Math.abs(dy - side) < 0.13)
			color = mix(
				color,
				[191, 216, 207],
				flow.foam * (1 - Math.abs(tail) / 0.7),
			);
	}
	if (
		dx > -size * 0.6 &&
		dx < size * 1.5 &&
		Math.abs(Math.abs(dy) - size * 0.44) < 0.12
	)
		color = mix(color, [173, 202, 196], 0.55);
	if ((dx / size) ** 2 + (dy / (size * 0.45)) ** 2 < 1)
		return mix([42, 48, 57], [88, 92, 93], Math.max(0, 0.5 - dy));
	return color;
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
	const motion = placeMotion(time);
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
					color = mix([25, 57, 57], [44, 79, 70], stone(x, y));
			} else if (layer === 2) {
				if (y > ridge(x, 39.5, 2, 0.7))
					color = mix([124, 151, 66], [167, 183, 96], stone(x, y));
				if (color && y > 38.5) {
					const spacing = profile(y, [
						[39.3, 5.5],
						[42.3, 9.5],
						[45.7, 13.5],
					]);
					for (let lane = -3; lane <= 3; lane++) {
						if (Math.abs(x - 81 - lane * spacing) < 0.3 + (y - 38.5) * 0.045)
							color = mix(color, [189, 180, 113], 0.5);
					}
				}
				for (let depth = 0; depth < 3; depth++) {
					const ground = [39.3, 42.3, 45.7][depth] ?? 45.7;
					const scale = 0.6 + depth * 0.32;
					if (y < ground - 4.5 * scale || y > ground) continue;
					for (let row = -3.5; row <= 3.5; row++) {
						const cx = 81 + row * (5.5 + depth * 4);
						if (Math.abs(x - cx) > 4.5) continue;
						const sway = motion.sway * (0.7 + depth * 0.15);
						const height = Math.max(0, (ground - y) / (4.5 * scale));
						const branch = Math.sin((x - cx) * 1.8 + height * 5);
						const dx =
							x - cx - sway * height * (0.55 + height * 0.8 + branch * 0.28);
						const leafY =
							y +
							motion.shimmer *
								Math.sin((x - cx) * 2.4 + height * 7) *
								(0.7 + depth * 0.2);
						if (
							Math.abs(dx) < 0.22 * scale &&
							y > ground - 3 * scale &&
							y < ground
						)
							color = [77, 55, 35];
						if (
							(dx / (2.25 * scale)) ** 2 +
								((leafY - ground + 2.6 * scale) / (1.9 * scale)) ** 2 <
							1 + 0.12 * Math.sin((dx * 4) / scale + (leafY * 3) / scale)
						) {
							color = mix(
								[27, 78, 38],
								[77, 128, 43],
								0.25 +
									stone(cx + dx, leafY) * 0.5 +
									0.15 * Math.sin((dx * 2.5) / scale + (leafY * 2) / scale) +
									motion.shimmer * (0.6 + branch * 0.4),
							);
							const seed = (row + 3) * 71 + depth * 331;
							for (let cluster = 0; cluster < 2; cluster++) {
								const ax =
									(cluster * 1.3 - 0.65 + hash(seed + cluster) * 0.3) * scale;
								const ay =
									ground - (2.4 + hash(seed + cluster + 9) * 0.7) * scale;
								for (
									let apple = 0;
									apple < 2 + Math.floor(hash(seed + cluster + 15) * 2);
									apple++
								) {
									const ox = (apple - 1) * 0.42 * scale;
									const oy = (apple % 2) * 0.35 * scale;
									if (
										Math.hypot(dx - ax - ox, leafY - ay - oy) <
										0.19 * scale + 0.06
									)
										color = [206, 65, 36];
								}
							}
						}
					}
				}
				if (fir(x, y, 11, 47, 13, -Infinity, 24) || fir(x, y, 11, 47, 13, 138))
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
					const fold = noise(x, y * 0.07, 45);
					const strata = Math.sin(y * 2.1 + Math.sin(x * 0.09) * 0.6);
					color = mix(
						[83, 79, 103],
						[229, 166, 91],
						Math.max(0, Math.min(1, (fold - 0.25) * 2.2)),
					);
					color = mix(color, [237, 177, 113], Math.max(0, strata) * 0.15);
					if (noise(x + Math.sin(y * 0.4) * 0.12, y * 0.04, 320) > 0.72)
						color = mix(color, [48, 44, 61], 0.7);
				}
			} else if (layer === 1 && y > riverBank(x)) {
				color = mix(
					[40, 87, 90],
					[92, 132, 129],
					0.4 + noise(x * 0.4, y * 3, 60) * 0.2,
				);
				if (y < riverBank(x) + 0.9)
					color = mix([81, 136, 44], [129, 170, 67], stone(x, y));
				for (const [cx, offset, size] of [
					[30, 2.2, 1.5],
					[60, 3, 1.1],
					[91, 2.6, 1.8],
					[121, 2, 1.2],
				] as const) {
					color = riverRock(
						color,
						x,
						y,
						cx,
						riverBank(cx) + offset,
						size,
						time,
					);
				}
			} else if (layer === 2) {
				const ground = riverBank(x) + 5;
				if (y > ground)
					color = mix([108, 100, 62], [156, 134, 88], stone(x, y));
				if (y > ground - 0.25 && y < ground + 1.2)
					color = mix([70, 121, 38], [127, 160, 57], stone(x, y));
				const trail = ground + 2.4 + 0.7 * Math.sin(x * 0.12);
				if (y > ground && Math.abs(y - trail) < 0.35)
					color = mix([177, 148, 103], [204, 179, 130], stone(x, y));
				for (const cx of [5, 11, 26, 37, 57, 112, 147, 157]) {
					const base = riverBank(cx) + 6.1;
					const dx = x - cx,
						dy = y - base;
					if (
						(dx / 1.8) ** 2 + ((dy + 0.65) / 1.05) ** 2 <
						1 + 0.18 * Math.sin(x * 7 + y * 5)
					)
						color = mix([79, 98, 65], [133, 144, 97], stone(x, y));
				}
				for (const cx of [8, 23, 42]) {
					const dy = y - riverBank(cx) - 7;
					if (((x - cx) / 1.5) ** 2 + (dy / 0.7) ** 2 < 1)
						color = mix([84, 81, 73], [154, 147, 126], Math.max(0, 0.5 - dy));
				}
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
						0.4 + noise(x * 0.4, y * 3, 60) * 0.2,
					);
				if (y > 35) {
					for (const [cx, cy, size] of [
						[36, 37.4, 0.9],
						[58, 39, 1.2],
						[83, 36.8, 0.7],
						[103, 40, 1.4],
						[119, 38, 0.85],
					] as const)
						color = riverRock(color ?? [32, 79, 94], x, y, cx, cy, size, time);
				}
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
						0.4 +
							(y < 33
								? 0.15 * Math.sin(y * 2.3 - time * 1.1 + Math.sin(x * 0.09))
								: 0),
					);
				for (let wave = 0; wave < 3; wave++) {
					const age = (time * (0.19 + wave * 0.027) + wave / 3) % 1;
					const line = 22 + age * 10 + 0.2 * Math.sin(x * 0.15 + wave);
					if (color && Math.abs(y - line) < 0.14)
						color = mix(
							color,
							[197, 216, 209],
							Math.sin(age * Math.PI) ** 2 * 0.7,
						);
				}
				const crest = profile(x, HAYSTACK_CREST);
				const rock = x >= 83 && x <= 128 && y >= crest;
				const islet = x >= 71 && x <= 82 && y >= profile(x, NEEDLES_CREST);
				const needle =
					y >= 23.1 &&
					Math.abs(x - 132.5 + Math.sin(y * 1.3) * 0.08) <
						0.2 + (y - 23.1) * 0.2;
				if ((rock || islet || needle) && y < 27.5) {
					const grain = stone(x, y);
					const face = smoothstep(100, 109, x + (y - 6) * 0.23);
					color = mix(
						mix([32, 44, 53], [57, 68, 73], grain),
						mix([76, 75, 60], [128, 115, 83], grain),
						face,
					);
					const chute = noise(x + (y - 10) * 0.035, y * 0.035, 260);
					const cleft = smoothstep(0.48, 0.76, chute);
					color = mix(color, [27, 38, 45], cleft * 0.65);
					if (rock && y < 16) {
						const cap = 0.6 + noise(x, y * 0.1, 170) * 1.5;
						const gully = cleft * (1 - smoothstep(10, 16, y));
						const moss = Math.max(
							(1 - smoothstep(cap, cap + 0.7, y - crest)) *
								(1 - smoothstep(11, 15, crest)),
							gully * 0.75,
						);
						color = mix(color, mix([46, 67, 43], [105, 111, 61], face), moss);
					}
				}
				if (color && y > 25 && y < 30 && x > 68 && x < 136) {
					const mist =
						Math.exp(-(((y - 26.9) / 0.8) ** 2)) *
						(1 - smoothstep(25, 35, Math.abs(x - 102))) *
						(0.26 + noise(x, y, 100) * 0.13);
					color = mix(color, [180, 199, 194], mist);
					for (const [cx, width] of [
						[105.5, 23.5],
						[76.5, 6.5],
						[132.5, 1.9],
					] as const) {
						const flank = Math.abs((x - cx) / width);
						if (flank >= 1.1) continue;
						const impact = 0.5 + 0.5 * Math.sin(time * 1.45 - flank * 2.4);
						const collar = 27.3 + 0.65 * Math.sqrt(Math.max(0, 1 - flank ** 2));
						const edge = collar + impact * 0.24 + Math.sin(x * 2.1) * 0.1;
						const foam =
							(1 - smoothstep(0.08, 0.25 + impact * 0.18, Math.abs(y - edge))) *
							(1 - smoothstep(0.95, 1.1, flank));
						color = mix(color, [224, 233, 219], foam * (0.6 + impact * 0.35));
					}
				}
			}
			if (layer === 1 && y > ridge(x, 29.8, 1.2)) {
				color = mix([121, 140, 136], [173, 163, 141], (y - 30) / 15);
				const reflectedX = x + Math.sin(y * 7.1) * 0.8;
				const reflectedY = 27.5 - (y - 27.5) * 1.65;
				const reflection =
					(1 -
						smoothstep(
							-0.8,
							1.2,
							profile(reflectedX, HAYSTACK_CREST) - reflectedY,
						)) *
					(1 - smoothstep(33, 41, y)) *
					(0.22 + 0.05 * Math.sin(y * 9));
				color = mix(color, [50, 68, 72], reflection);
				const shore = ridge(x, 32, 1.2) + motion.surf;
				if (y < shore + 1.3)
					color = mix(
						color,
						[82, 129, 139],
						Math.max(0, 0.5 - (y - shore) * 0.2),
					);
				if (y < shore)
					color = mix([95, 142, 150], [50, 68, 72], reflection * 0.7);
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
					const bubble = bubbleMotion(time, i);
					const bx = x - 39 - i * 6;
					if (Math.abs(Math.hypot(bx, y - bubble.y) - 0.3) < 0.1)
						color = mix(color, [152, 191, 178], bubble.rise);
					if (Math.abs(Math.hypot(bx, (y - 44) * 2) - bubble.radius) < 0.1)
						color = mix(color, [152, 191, 178], bubble.ring);
				}
			}
			break;
		}
	}
	if (place === "painted-hills" && layer === 1) {
		for (const shift of [0, 235]) {
			const bale = baleMotion(time + shift);
			const cx = bale.x;
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
					0.5 + 0.3 * Math.sin(radius * 12 + Math.atan2(dy, dx) - bale.angle),
				);
		}
	}
	if (place === "bend-plateau" && layer === 0 && color) {
		const cx = 103,
			base = 25,
			scale = 0.48;
		const waist = base - motion.climb;
		const ropeEnd = 35;
		if (
			y >= waist &&
			y <= ropeEnd &&
			Math.abs(
				x -
					cx -
					0.15 -
					0.16 * Math.sin(((y - waist) / (ropeEnd - waist)) * Math.PI),
			) < 0.13
		)
			color = [221, 210, 170];
		if (Math.hypot(x - cx - 0.15, y - ropeEnd) < 0.25) color = [33, 39, 46];
		const dx = (x - cx) / scale,
			dy = (y - waist) / scale;
		if (Math.abs(dx) > 2 || dy < -4.2 || dy > 3) return texture(color, x, y);
		const reach = Math.sin(time * 0.12) * 0.2;
		const limb = (
			ax: number,
			ay: number,
			bx: number,
			by: number,
			width: number,
		) => {
			const vx = bx - ax,
				vy = by - ay;
			const t = Math.max(
				0,
				Math.min(1, ((dx - ax) * vx + (dy - ay) * vy) / (vx * vx + vy * vy)),
			);
			return Math.hypot(dx - ax - t * vx, dy - ay - t * vy) < width;
		};
		if (
			Math.hypot(dx - 0.25, dy + 2.3) < 0.48 ||
			limb(0, -1.4, -0.3, 0.5, 0.48) ||
			limb(0.1, -1.3, 1.1, -2.2, 0.25) ||
			limb(1.1, -2.2, 1.2 + reach, -3.8, 0.24) ||
			limb(-0.2, -1.1, -1.25, -0.6, 0.25) ||
			limb(-1.25, -0.6, -1.5, -1.5, 0.24) ||
			limb(-0.3, 0.4, -1.25, 1.4, 0.3) ||
			limb(-1.25, 1.4, -0.8, 2.6, 0.28) ||
			limb(-0.1, 0.4, 1.3, 0.9, 0.3) ||
			limb(1.3, 0.9, 1.2, 1.8, 0.28)
		)
			color = [24, 30, 39];
		if (limb(-0.05, -1.25, -0.25, -0.05, 0.33)) color = [247, 210, 106];
		if (Math.hypot(dx - 0.25, dy + 2.3) < 0.32) color = [171, 112, 77];
		if (Math.hypot(dx + 0.65, dy - 0.2) < 0.26) color = [219, 206, 172];
	}
	return color ? texture(color, x, y) : null;
}
