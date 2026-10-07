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
const PAINTED_BANDS: readonly Rgb[] = [
	[151, 68, 48],
	[184, 88, 50],
	[204, 133, 61],
	[221, 169, 91],
	[225, 194, 142],
	[123, 116, 84],
	[91, 83, 67],
	[195, 119, 57],
	[112, 99, 72],
];

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
	sink = 0,
): boolean {
	const cell = Math.floor(x / spacing);
	const center = cell * spacing + spacing * (0.35 + hash(cell * 43) * 0.3);
	if (center < minCenter || center > maxCenter) return false;
	const dx = x - center;
	const h = height * (0.65 + hash(cell * 19 + ground) * 0.35);
	const base = ground + sink * hash(cell * 31 + 5);
	const top = base - h;
	const width = (y - top) * 0.24 * (0.8 + 0.2 * Math.sin(y * 9));
	return y > top && y < base && (Math.abs(dx) < width || Math.abs(dx) < 0.16);
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

function paintedCrest(x: number, layer: number): number {
	if (layer === 0) return ridge(x, 23.5, 3.4, 0.45);
	// An extra partial breaks the long even ridge into mounds with saddles
	// between them, which is how the hills actually group.
	if (layer === 1) return ridge(x, 30.5, 4, 2) + Math.sin(x * 0.21 + 1.1) * 0.9;
	return ridge(x, 44, 3, 4);
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

// Traced from a photo of the massif seen from Misery Ridge, scaled so its two
// tallest spires reach y 5 over a base at 34: a lower jagged buttress on the
// left, a big left mass with a notched crest, a narrow spire left of center,
// a wide recessed cleft under a flat notch, a second spire, then a shelf and
// a steep face down to a talus slope on the right.
const SMITH_CREST: Profile = [
	[60, 34],
	[60.31, 24.03],
	[60.77, 17.89],
	[61.69, 17.12],
	[62.84, 15.74],
	[64.37, 15.97],
	[65.91, 14.82],
	[67.06, 13.9],
	[68.21, 14.21],
	[69.36, 13.67],
	[70.89, 14.21],
	[72.43, 13.9],
	[73.58, 13.29],
	[73.81, 11.37],
	[74.73, 9.45],
	[75.88, 8.07],
	[77.03, 7.15],
	[78.57, 6.92],
	[80.1, 6.53],
	[81.25, 6.76],
	[82.02, 7.22],
	[83.17, 7.3],
	[84.7, 6.76],
	[86.24, 6.76],
	[87.77, 6.38],
	[89.15, 6.61],
	[89.46, 5.46],
	[90.07, 5],
	[90.69, 5.23],
	[91.22, 8.07],
	[91.76, 8.68],
	[95.44, 8.68],
	[96.98, 8.38],
	[97.75, 7.92],
	[99.28, 6.38],
	[100.43, 5.38],
	[101.35, 5],
	[102.35, 6.15],
	[103.12, 6.53],
	[104.27, 7.69],
	[104.8, 9.6],
	[105.8, 9.99],
	[106.95, 10.37],
	[108.1, 10.6],
	[108.49, 11.14],
	[109.79, 11.44],
	[110.79, 12.52],
	[111.56, 14.05],
	[112.09, 15.59],
	[113.09, 17.89],
	[113.86, 19.42],
	[114.62, 21.34],
	[115.39, 23.26],
	[116.16, 24.79],
	[117.31, 25.56],
	[118.46, 26.33],
	[119.99, 27.48],
	[120.92, 29.01],
	[121.38, 34],
];
/** The separate pillar to the massif's right in the same view. */
const SMITH_PILLAR: Profile = [
	[120.38, 34],
	[120.92, 30.16],
	[121.68, 25.56],
	[122.45, 24.03],
	[123.83, 23.03],
	[125.75, 22.49],
	[126.59, 21.49],
	[127.36, 21.57],
	[128.43, 21.96],
	[129.2, 22.26],
	[129.66, 22.72],
	[130.35, 24.79],
	[131.12, 29.4],
	[131.66, 34],
];
/** The wide recessed cleft between the two spires, and its half width. */
const SMITH_CLEFT = 94.5;
const SMITH_CLEFT_HALF = 2.2;
/** Narrower shadowed gullies down the faces. */
const SMITH_GROOVES = [73.7, 82.2, 89.3, 104.6, 111.5];
// Traced from a sunset silhouette of the real rock and scaled so the summit
// sits at y 2.5 on the waterline at 27.5. What makes it read as Haystack is
// the jutting corner where the near-vertical left face meets the summit ridge
// (about 12% across, 82% up); the right side is one straight slope down to a
// steep foot with a detached spike.
const HAYSTACK_CREST: Profile = [
	[88.16, 23.81],
	[89.04, 21.59],
	[90.21, 14.68],
	[90.79, 9.23],
	[91.61, 7.65],
	[91.67, 6.95],
	[93.25, 6.25],
	[94.01, 5.31],
	[94.13, 4.43],
	[94.6, 4.55],
	[94.95, 4.02],
	[95.77, 3.67],
	[96.82, 2.68],
	[97.82, 2.5],
	[109.94, 11.63],
	[110.41, 12.34],
	[112.57, 14.09],
	[113.74, 16.38],
	[114.45, 19.6],
	[115.85, 23.99],
	[116.03, 24.16],
	[116.2, 23.52],
	[116.85, 23.28],
	[117.55, 24.57],
	[117.67, 26.5],
	[117.84, 26.45],
	[118.2, 27.5],
];
/** The Needles: two low peaks against the rock's left foot. */
const NEEDLES_CREST: Profile = [
	[69.4, 27.5],
	[69.72, 26.74],
	[70.36, 26.39],
	[70.94, 27.32],
	[71.65, 27.44],
	[72.41, 27.15],
	[72.76, 24.75],
	[73.46, 22.76],
	[74.75, 21.24],
	[75.04, 21.24],
	[75.34, 22],
	[77.91, 22.7],
	[78.15, 21.53],
	[78.44, 21.53],
	[79.96, 20.01],
	[80.55, 20.83],
	[80.72, 22.35],
	[81.78, 23.81],
	[83.88, 24.75],
	[84.53, 25.45],
	[85.17, 24.34],
	[86.81, 25.39],
	[88.04, 24.34],
	[88.16, 23.81],
];
/** A separate single stack farther left. */
const STACK_CREST: Profile = [
	[54, 27.5],
	[54.26, 27.27],
	[55.02, 27.38],
	[55.43, 24.75],
	[55.96, 24.16],
	[56.43, 22.46],
	[57.71, 21.12],
	[58.71, 20.71],
	[59.29, 21.12],
	[60, 22.76],
	[60.23, 26.8],
	[60.41, 26.62],
	[61.05, 27.03],
	[61.3, 27.5],
];

/** Below a profile and within its span. */
function under(points: Profile, x: number, y: number): boolean {
	const last = points[points.length - 1] ?? points[0];
	return x >= points[0][0] && x <= last[0] && y >= profile(x, points);
}

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
				const gustLead = Math.sin(time * 0.11);
				for (let depth = 0; depth < 3; depth++) {
					const ground = [39.3, 42.3, 45.7][depth] ?? 45.7;
					// Centered on the lanes. Back rows carry more, smaller trees so
					// every depth spans about the front row's width.
					const half = [6.5, 4.5, 3.5][depth] ?? 3.5;
					for (let row = -half; row <= half; row++) {
						const treeSeed = (row + 3.5) * 97 + depth * 331;
						const scale =
							(0.6 + depth * 0.32) * (0.96 + hash(treeSeed + 19) * 0.08);
						if (y < ground - 4.5 * scale || y > ground) continue;
						const jitter = (hash(treeSeed + 7) - 0.5) * 0.42;
						const cx = 81 + row * (5.5 + depth * 4) + jitter;
						// Canopy half-width plus peak bend; the cascade-forest motion
						// patch in draw.ts must cover every row's cx ± this reach.
						if (Math.abs(x - cx) > 5.5) continue;
						// Per-tree phase and rate keep neighbors out of lockstep while
						// the gust still travels across the columns.
						const treePhase = (hash(treeSeed + 29) - 0.5) * 1.4 + depth * 0.55;
						const treeRate = 0.9 + hash(treeSeed + 41) * 0.2;
						// A downwind lean under the oscillation reads as wind rather than
						// wobble; the gust envelope still returns both to zero.
						const sway =
							motion.gust *
							(0.4 +
								Math.sin(
									motion.gustPhase * treeRate +
										row * 0.34 * gustLead +
										treePhase,
								)) *
							1.5 *
							(0.4 + depth * 0.3);
						const height = Math.max(0, (ground - y) / (4.5 * scale));
						const branch = Math.sin((x - cx) * 1.8 + height * 5);
						// The trunk bends and carries the crown as one mass, and tips lead.
						// A pure height shear flattens the small crowns into wedges.
						const bend =
							sway *
							(0.7 * smoothstep(0, 0.45, height) +
								height * height * (0.5 + branch * 0.25));
						const dx = x - cx - bend;
						// The bent crown dips slightly, as a fixed-length stem would.
						const leafY =
							y -
							(bend * bend * 0.12) / scale +
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
				// Bases sit at or below the frame edge so the crop roots each tree.
				if (
					fir(x, y, 11, 48, 16, -Infinity, 24, 3) ||
					fir(x, y, 11, 48, 16, 138, Infinity, 3)
				)
					color = mix([18, 43, 35], [46, 70, 43], stone(x, y));
			}
			break;
		}
		case "painted-hills": {
			const crest = paintedCrest(x, layer);
			const depth = y - crest;
			if (layer === 0 && depth >= 0) {
				const distantFold = noise(x * 0.45, y * 0.3, 52);
				color = mix([92, 111, 123], [142, 143, 128], 0.28 + distantFold * 0.3);
				color = mix(color, [177, 181, 171], smoothstep(0, 18, depth) * 0.18);
			} else if (layer === 1 && depth >= 0) {
				// Band pitch wanders, so beds vary in thickness across the slope
				// instead of marching at one fixed spacing. Real strata pinch and
				// swell; a constant pitch is what reads as corduroy.
				const pitch =
					1.12 +
					(noise(x * 0.42, 3.1, 18) - 0.5) * 0.52 +
					0.06 * Math.sin(x * 0.08 + 0.6);
				const contour =
					depth * pitch +
					Math.sin(x * 0.2 + depth * 0.11) * 0.2 +
					(noise(x * 1.6, 9.4, 58) - 0.5) * 0.34;
				const bandPosition = contour / 0.78;
				const bandNumber = Math.floor(bandPosition);
				const bandIndex =
					((bandNumber % PAINTED_BANDS.length) + PAINTED_BANDS.length) %
					PAINTED_BANDS.length;
				const nextBand = (bandIndex + 1) % PAINTED_BANDS.length;
				const within = bandPosition - bandNumber;
				const bandBlend = smoothstep(0.78, 1, within);
				color = mix(
					PAINTED_BANDS[bandIndex] ?? [151, 68, 48],
					PAINTED_BANDS[nextBand] ?? [184, 88, 50],
					bandBlend,
				);
				const subBand = 0.5 + 0.5 * Math.sin(contour * 17 + x * 0.045);
				color = mix(color, [91, 73, 58], subBand * 0.08);

				// A thin dark marker bed at some contacts, the way a resistant
				// seam outcrops as a line across a softer slope.
				if (hash(bandNumber * 313 + 7) > 0.63) {
					const seam = 1 - smoothstep(0, 0.13, Math.abs(within - 0.03));
					color = mix(color, [78, 63, 54], seam * 0.46);
				}

				// Gullies come in clusters, with bare stretches between them, so a
				// coarse cell decides where one starts and a low-frequency mask
				// decides how much of the slope is drained at all.
				const cluster = noise(x * 0.32, 21.5, 13);
				const rillCell = Math.floor((x + 1.6) / 5.6);
				const rillSeed = rillCell * 149 + 41;
				const rillFade = smoothstep(0.55, 3.2, depth);
				if (hash(rillSeed) < 0.3 + cluster * 0.8) {
					const rillCenter =
						rillCell * 5.6 +
						1.6 +
						(hash(rillSeed) - 0.5) * 3.4 +
						Math.sin(depth * 0.22 + hash(rillSeed + 11) * TAU) * 0.55;
					const rillDistance = x - rillCenter;
					const girth = 0.05 + hash(rillSeed + 3) * 0.13;
					const rillShadow =
						1 -
						smoothstep(girth * 0.5, girth * 2.6, Math.abs(rillDistance - 0.12));
					const rillRim =
						1 -
						smoothstep(girth * 0.4, girth * 1.5, Math.abs(rillDistance + 0.3));
					color = mix(
						color,
						[61, 56, 51],
						rillShadow * rillFade * (0.2 + hash(rillSeed + 9) * 0.24),
					);
					color = mix(color, [229, 196, 139], rillRim * rillFade * 0.1);
				}

				// Finer rills only where the slope is drained, so they gather in
				// the same places as the main ones.
				const fineCell = Math.floor((x + 0.8) / 1.6);
				const fineSeed = fineCell * 211 + 83;
				const fineCenter =
					fineCell * 1.6 +
					0.8 +
					(hash(fineSeed) - 0.5) * 0.48 +
					Math.sin(depth * 0.42 + hash(fineSeed + 5) * TAU) * 0.13;
				const fineRill = 1 - smoothstep(0.035, 0.16, Math.abs(x - fineCenter));
				color = mix(color, [74, 64, 54], fineRill * rillFade * cluster * 0.3);
			} else if (layer === 2) {
				const bladeCell = Math.floor(x * 1.6);
				const bladeX = (bladeCell + 0.2 + hash(bladeCell * 73) * 0.6) / 1.6;
				const bladeHeight = 0.25 + hash(bladeCell * 97 + 17) * 1.05;
				const blade = Math.abs(x - bladeX) < 0.055 && y >= crest - bladeHeight;
				if (depth >= 0 || blade) {
					color = mix(
						[124, 105, 64],
						[190, 157, 83],
						0.28 + noise(x * 0.6, y * 2.2, 96) * 0.52,
					);
					if (blade) color = mix(color, [218, 182, 103], 0.42);
				}
				const shrubCell = Math.floor((x + 4) / 16);
				const shrubX = shrubCell * 16 - 4 + 4 + hash(shrubCell * 107 + 23) * 8;
				const shrubGround = paintedCrest(shrubX, 2);
				const shrubDx = x - shrubX;
				const shrubDy = y - shrubGround + 0.38;
				if (
					(shrubDx / 1.55) ** 2 + (shrubDy / 0.85) ** 2 < 1 &&
					noise(x * 1.8, y * 2.4, 180) > 0.34
				)
					color = mix([112, 102, 51], [213, 173, 58], noise(x, y, 220));
			}
			break;
		}
		case "bend-plateau": {
			if (layer === 0) {
				if (
					under(SMITH_PILLAR, x, y) ||
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
					const cleft =
						(1 -
							smoothstep(
								SMITH_CLEFT_HALF - 0.6,
								SMITH_CLEFT_HALF + 0.9,
								Math.abs(x - SMITH_CLEFT - Math.sin(y * 0.45) * 0.3),
							)) *
						(1 - smoothstep(29, 33, y));
					color = mix(color, [40, 36, 52], cleft * 0.8);
					for (const groove of SMITH_GROOVES) {
						const depth = y - profile(groove, SMITH_CREST);
						if (depth < 0 || depth > 14) continue;
						const shade =
							(1 -
								smoothstep(
									0.15,
									0.6,
									Math.abs(x - groove - Math.sin(y * 0.7 + groove) * 0.15),
								)) *
							(1 - depth / 14);
						color = mix(color, [61, 54, 72], shade * 0.6);
					}
					const talus = 29.4 + noise(x, 0, 90) * 1.6;
					if (y > talus)
						color = mix(
							color,
							mix([118, 101, 72], [168, 142, 101], stone(x, y)),
							0.55 * smoothstep(talus, talus + 1.5, y),
						);
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
				const rock = under(HAYSTACK_CREST, x, y);
				const islet = under(NEEDLES_CREST, x, y);
				const stack = under(STACK_CREST, x, y);
				if ((rock || islet || stack) && y < 27.5) {
					const grain = stone(x, y);
					const face = smoothstep(96.5, 105.5, x + (y - 2.5) * 0.23);
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
						[103.2, 15.5],
						[79, 9.5],
						[57.7, 3.6],
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
			const ground = paintedCrest(cx, 1) + 1;
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
	return color ? texture(color, x, y) : null;
}
