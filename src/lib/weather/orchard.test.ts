import { describe, expect, test } from "bun:test";
import { material } from "./landscapes";
import type { Rgb } from "./palette";
import { GUST_SLOT, gustMotion } from "./placeMotion";

// Material texture varies each color slightly, so classify by hue.
const isLeaf = (c: Rgb | null) => c !== null && c[0] < 100 && c[1] > c[0] * 1.3;
const isTrunk = (c: Rgb | null) =>
	c !== null && c[0] < 100 && c[0] > c[1] && c[1] > c[2];

// Only the front-row tree right of the center lane reaches these samples:
// back and middle rows stop at their own ground lines above them.
function frontCrownEdge(time: number): number {
	let edge = Number.NaN;
	for (let x = 80; x < 96; x += 0.05)
		if (isLeaf(material("cascade-forest", 2, x, 42.8, time))) edge = x;
	return edge;
}
function frontTrunkBase(time: number): number {
	let sum = 0,
		count = 0;
	for (let x = 84; x < 92; x += 0.02)
		if (isTrunk(material("cascade-forest", 2, x, 45.6, time))) {
			sum += x;
			count++;
		}
	return sum / count;
}

describe("Mount Hood orchard sway", () => {
	test("front crowns sway about a logical pixel while trunks stay planted", () => {
		const stillEdge = frontCrownEdge(0);
		const stillBase = frontTrunkBase(0);
		let crown = 0,
			base = 0;
		for (let frame = 0; frame <= 6 * GUST_SLOT * 12; frame++) {
			const time = 2 + frame / 12;
			crown = Math.max(crown, Math.abs(frontCrownEdge(time) - stillEdge));
			base = Math.max(base, Math.abs(frontTrunkBase(time) - stillBase));
		}
		expect(crown).toBeGreaterThan(0.8);
		expect(crown).toBeLessThan(2);
		expect(base).toBeLessThan(0.1);
	});
	test("calm gaps and time zero hold the static orchard", () => {
		for (let slot = 0; slot < 4; slot++)
			expect(frontCrownEdge(2 + slot * GUST_SLOT + 6)).toBe(frontCrownEdge(0));
	});
	test("gusts differ in strength and timing from slot to slot", () => {
		const peaks = Array.from({ length: 12 }, (_, slot) => {
			let peak = 0,
				at = 0;
			for (let t = 0; t < 6; t += 0.02) {
				const { gust } = gustMotion(2 + slot * GUST_SLOT + t);
				if (gust > peak) [peak, at] = [gust, t];
			}
			return [peak, at] as const;
		});
		const strengths = new Set(peaks.map(([peak]) => peak.toFixed(2)));
		const timings = new Set(peaks.map(([, at]) => at.toFixed(1)));
		expect(strengths.size).toBeGreaterThan(8);
		expect(timings.size).toBeGreaterThan(8);
		expect(Math.max(...peaks.map(([peak]) => peak))).toBeLessThanOrEqual(1);
	});
});
