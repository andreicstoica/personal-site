import { describe, expect, test } from "bun:test";
import {
	BOLT_SEGMENTS,
	boltPath,
	branchPath,
	createLightningTimeline,
	LIGHTNING_DURATION,
	lightningGap,
} from "./lightning";

const gaps = Array.from({ length: 100 }, (_, i) => lightningGap(i + 1));
const starts = gaps.map((_, i) => gaps.slice(0, i + 1).reduce((a, b) => a + b));

describe("lightning schedule", () => {
	test("gaps keep the quiet period and vary", () => {
		expect(Math.min(...gaps)).toBeGreaterThanOrEqual(4);
		expect(new Set(gaps).size).toBe(100);
		expect(gaps.reduce((a, b) => a + b, 0) / gaps.length).toBeGreaterThan(8);
		const timeline = createLightningTimeline();
		for (const t of [0, 1, 3.99]) {
			const frame = timeline(t);
			expect(frame.flash + frame.glow + frame.second).toBe(0);
		}
	});

	test("every strike peaks on its first frame and ends at exactly zero", () => {
		const timeline = createLightningTimeline();
		for (const start of starts) {
			expect(timeline(start + 0.001).flash).toBe(1);
			expect(timeline(start + 0.011).flash).toBe(1);
			expect(timeline(start + LIGHTNING_DURATION / 2).flash).toBeLessThan(0.5);
			expect(timeline(start + LIGHTNING_DURATION + 0.001).flash).toBe(0);
		}
	});

	test("origins cover both sides and the center of the scene", () => {
		const timeline = createLightningTimeline();
		const origins = starts.map((start) => timeline(start + 0.08).path[0] ?? 0);
		expect(Math.min(...origins)).toBeLessThan(20);
		expect(Math.max(...origins)).toBeGreaterThan(140);
		expect(origins.filter((x) => x > 60 && x < 100).length).toBeGreaterThan(10);
	});

	test("both strikes decay fast with return-stroke flicker", () => {
		const timeline = createLightningTimeline();
		for (const start of starts.slice(0, 60)) {
			const flash = Array.from(
				{ length: 254 },
				(_, ms) => timeline(start + ms / 1000).flash,
			);
			expect(Math.max(...flash)).toBe(1);
			expect(Math.min(...flash)).toBeGreaterThanOrEqual(0);
			// At least one re-brightening after the peak reads as electric.
			expect(
				flash.filter((v, ms) => ms > 20 && v > (flash[ms - 1] ?? v) + 0.05)
					.length,
			).toBeGreaterThanOrEqual(1);
			const event = timeline(start);
			if (!event.double) continue;
			const second = Array.from(
				{ length: 254 },
				(_, ms) => timeline(start + event.delay + ms / 1000).second,
			);
			expect(Math.max(...second)).toBe(event.strength);
			expect(
				second.filter((v, ms) => ms > 20 && v > (second[ms - 1] ?? v) + 0.02)
					.length,
			).toBeGreaterThanOrEqual(1);
		}
	});

	test("single strikes have no afterglow or second strike", () => {
		const timeline = createLightningTimeline();
		let singles = 0;
		for (const start of starts) {
			if (timeline(start).double) continue;
			singles++;
			for (const age of [0.001, 0.1, 0.3, 0.8, 1.2]) {
				const frame = timeline(start + age);
				expect(frame.glow).toBe(0);
				expect(frame.second).toBe(0);
			}
		}
		expect(singles).toBeGreaterThan(50);
	});

	test("about one in seven strikes doubles", () => {
		const timeline = createLightningTimeline();
		const doubles = starts.filter((start) => timeline(start).double).length;
		expect(doubles).toBeGreaterThan(100 * 0.15 - 8);
		expect(doubles).toBeLessThan(100 * 0.15 + 8);
	});

	test("a double's branch strikes late, against the first channel's afterglow", () => {
		const timeline = createLightningTimeline();
		for (const start of starts) {
			const event = timeline(start);
			if (!event.double) continue;
			expect(event.delay).toBeGreaterThanOrEqual(0.45);
			expect(event.delay).toBeLessThanOrEqual(0.75);
			// The two bright flashes stay apart; only the afterglow overlaps.
			for (let age = 0; age < event.delay + LIGHTNING_DURATION; age += 0.01) {
				const frame = timeline(start + age);
				expect(frame.flash > 0 && frame.second > 0).toBe(false);
			}
			const onset = timeline(start + event.delay + 0.005);
			expect(onset.flash).toBe(0);
			expect(onset.second).toBeCloseTo(onset.strength);
			expect(onset.strength).toBeGreaterThanOrEqual(0.5);
			expect(onset.strength).toBeLessThanOrEqual(2 / 3);
			expect(onset.glow).toBeGreaterThan(0.05);
			const beat = timeline(start + LIGHTNING_DURATION + 0.1);
			expect(beat.flash + beat.second).toBe(0);
			expect(beat.glow).toBeGreaterThan(onset.glow);
			const end = start + event.delay + LIGHTNING_DURATION + 0.001;
			expect(timeline(end).glow + timeline(end).second).toBe(0);
		}
	});

	test("the branch leaves the first channel and lands somewhere new", () => {
		const timeline = createLightningTimeline();
		for (const start of starts) {
			const event = timeline(start);
			if (!event.double) continue;
			const { path, branch, split } = event;
			expect(split).toBeGreaterThanOrEqual(3);
			expect(split).toBeLessThanOrEqual(5);
			// Shared through the split vertex, so the branch starts on the channel.
			expect(branch.subarray(0, split * 2 + 2)).toEqual(
				path.subarray(0, split * 2 + 2),
			);
			const ground = BOLT_SEGMENTS * 2;
			const branchGround = branch[ground] ?? 0;
			expect(Math.abs(branchGround - (path[ground] ?? 0))).toBeGreaterThan(3);
			expect(branchGround).toBeGreaterThanOrEqual(2);
			expect(branchGround).toBeLessThanOrEqual(158);
			for (let n = 0; n <= BOLT_SEGMENTS; n++)
				expect(branch[n * 2 + 1]).toBe(path[n * 2 + 1]);
		}
	});

	test("paths are deterministic in their seed", () => {
		const path = boltPath(80, 12345);
		expect(boltPath(80, 12345)).toEqual(path);
		expect(boltPath(80, 12346)).not.toEqual(path);
		expect(branchPath(path, 4, 9)).toEqual(branchPath(path, 4, 9));
		const timeline = createLightningTimeline();
		const first = (starts[0] ?? 0) + 0.9;
		const sample = timeline(first);
		expect(timeline(first)).toEqual(sample);
		timeline(500);
		expect(timeline(first)).toEqual(sample);
		expect(timeline(0).flash).toBe(0);
	});
});
