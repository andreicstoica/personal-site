import { describe, expect, test } from "bun:test";
import { material } from "./landscapes";
import type { Rgb } from "./palette";

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
	test("front crowns sway over a logical pixel while trunks stay planted", () => {
		const stillEdge = frontCrownEdge(0);
		const stillBase = frontTrunkBase(0);
		let crown = 0,
			base = 0;
		for (let frame = 0; frame <= 12 * 24; frame++) {
			const time = 2 + frame / 24;
			crown = Math.max(crown, Math.abs(frontCrownEdge(time) - stillEdge));
			base = Math.max(base, Math.abs(frontTrunkBase(time) - stillBase));
		}
		expect(crown).toBeGreaterThan(1);
		expect(crown).toBeLessThan(3);
		expect(base).toBeLessThan(0.1);
	});
	test("calm gaps and time zero hold the static orchard", () => {
		expect(frontCrownEdge(8)).toBe(frontCrownEdge(0));
		expect(frontCrownEdge(12 + 8)).toBe(frontCrownEdge(0));
	});
});
