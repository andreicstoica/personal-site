import { describe, expect, test } from "bun:test";
import { DITHER_LEVELS, quantize } from "./dither";
import { renderLayers, renderMotionPatches, renderPlate } from "./draw";
import { birdsAllowed } from "./effects";
import { DETAIL, material, vistaWindow } from "./landscapes";
import {
	createLightningTimeline,
	LIGHTNING_DURATION,
	lightningGap,
} from "./lightning";
import { MOON_RADIUS, moonColor } from "./moon";
import {
	ATLAS_MARGIN,
	ATLAS_WIDTH,
	layerOffsets,
	OSCILLATION_PERIOD,
} from "./motion";
import { lighting } from "./palette";
import {
	baleMotion,
	bubbleMotion,
	placeMotion,
	rapidMotion,
} from "./placeMotion";
import {
	classifyWeather,
	fallbackReading,
	PLACES,
	sceneLabel,
	timeFromClock,
	timeOfDay,
	WEATHERS,
} from "./scene";
import { loadReading } from "./session";

const minute = 60_000;

describe("weather lighting clock", () => {
	const sunrise = new Date(2026, 5, 1, 6).getTime();
	const sunset = new Date(2026, 5, 1, 20).getTime();
	test("sunrise and sunset share golden hour with exact day/night boundaries", () => {
		for (const [now, expected] of [
			[sunrise - 45 * minute - 1, "night"],
			[sunrise - 45 * minute, "golden-hour"],
			[sunrise + 50 * minute - 1, "golden-hour"],
			[sunrise + 50 * minute, "day"],
			[sunset - 50 * minute - 1, "day"],
			[sunset - 50 * minute, "golden-hour"],
			[sunset + 45 * minute - 1, "golden-hour"],
			[sunset + 45 * minute, "night"],
		] as const)
			expect(timeOfDay(now, sunrise, sunset)).toBe(expected);
	});
	test("clock fallback uses the same three states", () => {
		for (const [hour, expected] of [
			[6, "golden-hour"],
			[12, "day"],
			[19, "golden-hour"],
			[23, "night"],
		] as const) {
			const date = new Date(2026, 5, 1, hour);
			expect(timeFromClock(date)).toBe(expected);
			expect(timeOfDay(date.getTime(), null, null)).toBe(expected);
			expect(timeOfDay(date.getTime(), sunset, sunrise)).toBe(expected);
		}
		expect(
			sceneLabel({
				place: "cascade-forest",
				time: "golden-hour",
				weather: "clear",
				colorMode: "light",
			}),
		).toBe("Mount Hood, golden hour, clear");
	});
});

describe("layered terrain", () => {
	test("Mount Hood has continuous material below its summit", () => {
		for (let y = 4; y < 48; y += 0.25)
			expect(material("cascade-forest", 0, 81, y)).not.toBeNull();
		for (let x = 0; x < 160; x++) {
			expect(material("cascade-forest", 1, x, 40)).not.toBeNull();
			expect(material("cascade-forest", 2, x, 47.9)).not.toBeNull();
		}
	});
	test("Smith Rock, Haystack, and Crown Point retain continuous bases", () => {
		for (const [place, layer] of [
			["bend-plateau", 0],
			["oregon-coast", 0],
			["columbia-gorge", 1],
		] as const) {
			for (const x of place === "bend-plateau"
				? [48, 67, 77, 85, 97, 107, 116]
				: place === "oregon-coast"
					? [74.8, 79.3, 87, 93, 101, 107, 116, 124, 132.5]
					: [8, 25, 40, 137, 140, 141, 142, 150, 164]) {
				let entered = false;
				for (let y = 0.125; y < 48; y += 0.25) {
					const covered = material(place, layer, x, y) !== null;
					if (entered && !covered)
						throw new Error(`${place}: gap at ${x},${y}`);
					entered ||= covered;
				}
			}
		}
		for (const x of [100, 101, 102]) {
			expect(material("oregon-coast", 0, x, 5.25)).toBeNull();
			expect(material("oregon-coast", 0, x, 6)).not.toBeNull();
		}
		expect(material("oregon-coast", 0, 90, 18)).toBeNull();
		expect(material("oregon-coast", 0, 115, 18)).not.toBeNull();
		for (const x of [74.8, 79.3, 132.5]) {
			const sea = material("oregon-coast", 0, x, 22.5);
			const basalt = material("oregon-coast", 0, x, 24);
			expect(sea?.[2] ?? 0).toBeGreaterThan(120);
			expect(basalt?.[2] ?? 255).toBeLessThan(90);
			expect(material("oregon-coast", 1, x, 27)).toBeNull();
		}
	});
	test("Gorge foreground contains the river at every phase", () => {
		for (const t of [0, 7.5, 15, 22.5])
			for (let x = -4; x <= 164; x += 0.5) {
				expect(material("columbia-gorge", 2, x, 47.9, t)).not.toBeNull();
				if (x > 40 && x < 115)
					expect(material("columbia-gorge", 2, x, 38, t)).toBeNull();
			}
	});
	test("Vista House has two supported windows with night light", () => {
		for (const x of [140, 142]) {
			expect(vistaWindow(x, 16)).toBe(true);
			expect(material("columbia-gorge", 1, x, 16)).not.toBeNull();
		}
		expect(vistaWindow(141, 16)).toBe(false);
		const scene = {
			place: "columbia-gorge",
			weather: "clear",
			colorMode: "light",
		} as const;
		expect(lighting({ ...scene, time: "day" }).windowLight).toEqual([0, 0, 0]);
		expect(
			lighting({ ...scene, time: "night" }).windowLight[0],
		).toBeGreaterThan(0.5);
	});

	for (const place of PLACES)
		test(`${place} has opaque ground at every oscillation phase`, () => {
			const image = renderLayers(place);
			const layerHeight = 48 * DETAIL;
			expect(image.width).toBe(ATLAS_WIDTH * DETAIL);
			expect(image.height).toBe(layerHeight * 3);
			for (const second of [0, 0.25, 0.5, 0.75, 1].map(
				(phase) => phase * OSCILLATION_PERIOD,
			)) {
				for (let x = 0; x < 160; x++) {
					const coverage = layerOffsets(second).some((offset, layer) => {
						const sx = x - offset;
						return material(place, layer, sx, 47.9) !== null;
					});
					expect(coverage).toBe(true);
				}
			}
			// Interiors stay opaque; filtering alone softens the silhouette edge.
			for (let offset = 3; offset < image.data.length; offset += 4) {
				const alpha = image.data[offset];
				if (alpha !== 0 && alpha !== 255)
					throw new Error(`partial material coverage: ${alpha}`);
			}
		});
	test("oscillation keeps both filtered edge columns inside the atlas", () => {
		for (const second of [0, 7.5, 15, 22.5, 30]) {
			for (const offset of layerOffsets(second)) {
				expect(ATLAS_MARGIN - offset).toBeGreaterThan(0.5 / DETAIL);
				expect(160 + ATLAS_MARGIN - offset).toBeLessThan(
					ATLAS_WIDTH - 0.5 / DETAIL,
				);
			}
		}
		expect(layerOffsets(0)).toEqual([0, 0, 0]);
		expect(layerOffsets(7.5)).toEqual([0.75, 1.5, 3]);
		expect(layerOffsets(22.5)).toEqual([-0.75, -1.5, -3]);
	});

	test("CPU fallback remains opaque and follows day/night lighting", () => {
		const scene = {
			place: "cascade-forest",
			weather: "clear",
			colorMode: "light",
		} as const;
		const day = renderPlate({ ...scene, time: "day" });
		const night = renderPlate({ ...scene, time: "night" });
		let dayLight = 0,
			nightLight = 0;
		for (let i = 0; i < day.data.length; i += 4) {
			expect(day.data[i + 3]).toBe(255);
			expect(night.data[i + 3]).toBe(255);
			dayLight += day.data[i] ?? 0;
			nightLight += night.data[i] ?? 0;
		}
		expect(dayLight).toBeGreaterThan(nightLight * 2);
		expect(MOON_RADIUS / (0.055 * 48)).toBeGreaterThan(1.5);
		expect(MOON_RADIUS / (0.055 * 48)).toBeLessThan(2);
		expect(moonColor(-1.5, -1)).toEqual([128, 151, 166]);
		expect(moonColor(0, 0.8)).toEqual([214, 223, 218]);
		expect(moonColor(5, 0)).toBeNull();
	});
});

describe("weather raster and elapsed time", () => {
	test("Bayer thresholds select adjacent bands without changing mean color", () => {
		const values: number[] = [];
		for (let y = 0; y < 4; y++)
			for (let x = 0; x < 4; x++) {
				values.push(quantize([127.5, 127.5, 127.5], x, y)[0]);
			}
		expect(new Set(values).size).toBe(2);
		expect(Math.max(...values) - Math.min(...values)).toBeCloseTo(
			255 / (DITHER_LEVELS - 1),
		);
		expect(values.reduce((a, b) => a + b, 0) / 16).toBeCloseTo(127.5);
		expect(quantize([-10, 255, 280], 0, 0)).toEqual([0, 255, 255]);
	});
	test("lightning has varied gaps, quiet t=0, occasional doubles, and deterministic seeks", () => {
		const gaps = Array.from({ length: 100 }, (_, i) => lightningGap(i + 1));
		expect(Math.min(...gaps)).toBeGreaterThanOrEqual(4);
		expect(new Set(gaps).size).toBe(100);
		expect(gaps.reduce((a, b) => a + b, 0) / gaps.length).toBeGreaterThan(8);
		const timeline = createLightningTimeline();
		expect(timeline(0).flash).toBe(0);
		let start = 0;
		let doubles = 0;
		for (const gap of gaps) {
			start += gap;
			const event = timeline(start);
			expect(timeline(start + event.duration / 2).flash).toBeCloseTo(1);
			expect(event.duration).toBe(LIGHTNING_DURATION);
			if (!event.double)
				expect(timeline(start + LIGHTNING_DURATION + 0.001).flash).toBe(0);
			expect(timeline(start + 0.47).flash).toBe(0);
			const first = timeline(start + LIGHTNING_DURATION / 2);
			const second = timeline(start + first.delay + LIGHTNING_DURATION / 2);
			if (event.double) {
				doubles++;
				expect(second.flash).toBeGreaterThanOrEqual(0.46);
				expect(second.flash).toBeLessThanOrEqual(0.54);
				expect(second.origin - first.origin).toBeGreaterThanOrEqual(4);
				expect(second.cool).toBe(1);
				expect(first.cool).toBe(0);
			}
		}
		expect(doubles).toBeGreaterThan(10);
		expect(doubles).toBeLessThan(50);
		const sample = timeline(20);
		expect(timeline(20)).toEqual(sample);
		timeline(500);
		expect(timeline(20)).toEqual(sample);
		expect(timeline(0).flash).toBe(0);
	});
});

describe("place motion and merged clear weather", () => {
	test("place frames reproduce after forward and backward seeks", () => {
		for (const place of PLACES) {
			const still = renderMotionPatches(place, 0);
			const moving = renderMotionPatches(place, 4.5);
			expect(moving).not.toEqual(still);
			renderMotionPatches(place, 52);
			expect(renderMotionPatches(place, 4.5)).toEqual(moving);
			expect(renderMotionPatches(place, 0)).toEqual(still);
		}
	});
	test("rain excludes birds even at fractional intensity", () => {
		for (const rain of [0.001, 0.4, 0.85, 1])
			for (const weather of WEATHERS)
				expect(birdsAllowed(weather, rain)).toBe(false);
		expect(birdsAllowed("cloudy", 0)).toBe(false);
		expect(birdsAllowed("clear", 0)).toBe(true);
		expect(birdsAllowed("fog", 0)).toBe(true);
	});
	test("clear codes and stale sunny cache use clear fallback", () => {
		expect(classifyWeather(0)).toBe("clear");
		expect(classifyWeather(1)).toBe("clear");
		const storage = {
			getItem: () =>
				JSON.stringify({ weather: "sunny", sunrise: null, sunset: null }),
		} as unknown as Storage;
		expect(loadReading(storage) ?? fallbackReading()).toEqual(
			fallbackReading(),
		);
	});
});

describe("weather seam regression", () => {
	test("periodic motion joins with continuous value and velocity", () => {
		const epsilon = 0.00001;
		const cases: [number, (t: number) => number][] = [
			[960, (t) => baleMotion(t).x],
			[960, (t) => baleMotion(t).angle],
			[3, (t) => rapidMotion(t).foam],
			[3, (t) => rapidMotion(t).x * rapidMotion(t).foam],
			[
				12,
				(t) => {
					const motion = placeMotion(t);
					return (
						motion.gust * Math.sin(motion.gustPhase + 1.2 * Math.sin(t * 0.11))
					);
				},
			],
			[12, (t) => placeMotion(t).shimmer],
			[13, (t) => bubbleMotion(t).rise],
			[13, (t) => bubbleMotion(t).ring],
			[13, (t) => bubbleMotion(t).y * bubbleMotion(t).rise],
			[13, (t) => bubbleMotion(t).radius * bubbleMotion(t).ring],
			[(Math.PI * 2) / 0.43, (t) => placeMotion(t).anemone],
		];
		for (const [period, sample] of cases) {
			expect(Math.abs(sample(period - epsilon) - sample(0))).toBeLessThan(
				0.001,
			);
			const incoming =
				(3 * sample(period) -
					4 * sample(period - epsilon) +
					sample(period - 2 * epsilon)) /
				(2 * epsilon);
			const outgoing =
				(-3 * sample(0) + 4 * sample(epsilon) - sample(2 * epsilon)) /
				(2 * epsilon);
			expect(Math.abs(incoming - outgoing)).toBeLessThan(0.001);
		}
		for (const reset of [2, 14, 26]) {
			const before = placeMotion(reset - epsilon);
			const after = placeMotion(reset + epsilon);
			expect(
				Math.abs(
					before.gust * Math.sin(before.gustPhase) -
						after.gust * Math.sin(after.gustPhase),
				),
			).toBeLessThan(0.001);
		}
	});
	test("seam patches repaint their ground without new near-black texels", () => {
		for (const [place, boundaries] of [
			["painted-hills", [480, 960]],
			["cascade-forest", [12, 24]],
			["bend-plateau", [3, 6]],
			["columbia-gorge", [3, 6]],
			[
				"oregon-coast",
				[
					3,
					3.6,
					8.3,
					13,
					1 / 0.19,
					2 / 3 / 0.217,
					1 / 3 / 0.244,
					(Math.PI * 2) / 1.45,
				],
			],
		] as const) {
			for (const time of boundaries) {
				const frames = [-1, 0, 1].map((step) =>
					renderMotionPatches(place, time + step / 24),
				);
				for (const frame of frames)
					for (const patch of frame) {
						for (let i = 0; i < patch.data.length; i += 4) {
							if (patch.data[i + 3] === 255)
								expect(
									Math.max(
										patch.data[i] ?? 0,
										patch.data[i + 1] ?? 0,
										patch.data[i + 2] ?? 0,
									),
								).toBeGreaterThan(15);
						}
					}
				const center = frames[1] ?? [];
				for (let p = 0; p < center.length; p++) {
					const before = frames[0]?.[p],
						at = center[p],
						after = frames[2]?.[p];
					if (!before || !at || !after) throw new Error("missing patch");
					for (let i = 3; i < at.data.length; i += 4) {
						if (before.data[i] === 255 && after.data[i] === 255)
							expect(at.data[i]).toBe(255);
					}
				}
			}
		}
	});
	test("orchard, river and coast motion stay inside their upload patches", () => {
		const times = [0.5, 3, 4.5, 5.5, 60, 600];
		const same = (a: readonly number[] | null, b: readonly number[] | null) =>
			a === b || (a !== null && b !== null && a.every((v, i) => v === b[i]));
		const escapes: string[] = [];
		for (const [place, layers] of [
			["bend-plateau", [0, 1]],
			["cascade-forest", [2]],
			["columbia-gorge", [1]],
			["oregon-coast", [0, 1, 2]],
		] as const) {
			const patches = renderMotionPatches(place, 0);
			const inPatch = (x: number, y: number) =>
				patches.some(
					(p) =>
						x >= p.x / DETAIL - ATLAS_MARGIN &&
						x < (p.x + p.width) / DETAIL - ATLAS_MARGIN &&
						y >= p.y / DETAIL &&
						y < (p.y + p.height) / DETAIL,
				);
			for (const layer of layers)
				for (let y = 0.125; y < 48; y += 0.25)
					for (let x = -3.875; x < 164; x += 0.25) {
						// Time zero is the static atlas; sample it once per texel.
						const before = material(place, layer, x, y, 0);
						if (inPatch(x, y + layer * 48)) continue;
						for (const time of times) {
							if (!same(before, material(place, layer, x, y, time)))
								escapes.push(`${place} L${layer} (${x}, ${y}) t=${time}`);
						}
					}
		}
		expect(escapes).toEqual([]);
	}, 20_000);
	test("lightning origins cover both sides and the center of the scene", () => {
		const at = createLightningTimeline();
		let start = 0;
		const origins = [];
		for (let i = 1; i <= 100; i++) {
			start += lightningGap(i);
			origins.push(at(start + 0.08).origin);
		}
		expect(Math.min(...origins)).toBeLessThan(20);
		expect(Math.max(...origins)).toBeGreaterThan(140);
		expect(origins.filter((x) => x > 60 && x < 100).length).toBeGreaterThan(10);
	});
	test("overlapping lightning pulses blend without a cutoff at secondary onset", () => {
		const at = createLightningTimeline();
		let start = 0;
		for (let i = 1; i < 40; i++) {
			start += lightningGap(i);
			const delay = at(start).delay;
			const before = at(start + delay - 0.00001);
			const after = at(start + delay + 0.00001);
			expect(Math.abs(before.flash - after.flash)).toBeLessThan(0.001);
			expect(Math.abs(before.origin - after.origin)).toBeLessThan(0.001);
		}
	});
});
