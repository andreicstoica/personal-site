import { describe, expect, test } from "bun:test";
import { DITHER_LEVELS, quantize } from "./dither";
import { renderLayers, renderPlate } from "./draw";
import { DETAIL, material } from "./landscapes";
import { createLightningTimeline, lightningGap } from "./lightning";
import {
	ATLAS_MARGIN,
	ATLAS_WIDTH,
	layerOffsets,
	OSCILLATION_PERIOD,
} from "./motion";
import { PLACES, sceneLabel, timeFromClock, timeOfDay } from "./scene";

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
			expect(timeline(start + 0.11).flash).toBeCloseTo(1);
			if (timeline(start + 0.42).flash > 0) doubles++;
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
