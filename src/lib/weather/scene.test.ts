import { describe, expect, test } from "bun:test";
import { renderLayers, renderPlate } from "./draw";
import { DETAIL, material } from "./landscapes";
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
		test(`${place} has opaque ground at every drift phase`, () => {
			const image = renderLayers(place);
			const layerHeight = 48 * DETAIL;
			expect(image.width).toBe(160 * DETAIL);
			expect(image.height).toBe(layerHeight * 3);
			for (const second of [0, 39.99, 40, 79.99, 80, 319.99, 320]) {
				for (let x = 0; x < 160; x++) {
					const coverage = [0.5, 2, 4].some((speed, layer) => {
						const sx = (((x - second * speed) % 160) + 160) % 160;
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
