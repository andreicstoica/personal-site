import { describe, expect, test } from "bun:test";
import { cornerPiece, type Leg, type StitchCorner } from "./crossStitch";

const CORNERS: StitchCorner[] = [
	"top-left",
	"top-right",
	"bottom-left",
	"bottom-right",
];

const cellOf = (leg: Leg) =>
	`${Math.min(leg.from[0], leg.to[0])},${Math.min(leg.from[1], leg.to[1])}`;

describe("cross-stitch corner piece", () => {
	test("every stitch is one under leg crossed by one over leg", () => {
		for (const corner of CORNERS) {
			const { legs } = cornerPiece(corner);
			const under = legs.filter((leg) => !leg.over).map(cellOf);
			const over = legs.filter((leg) => leg.over).map(cellOf);
			expect(new Set(under).size).toBe(under.length);
			expect(new Set(over)).toEqual(new Set(under));
			expect(under.length).toBe(114);
		}
	});

	test("a row lays all its under legs before crossing them", () => {
		const { legs } = cornerPiece("top-left");
		for (const row of new Set(legs.map((leg) => leg.row))) {
			const inRow = legs.filter((leg) => leg.row === row);
			const firstOver = inRow.findIndex((leg) => leg.over);
			expect(inRow.slice(firstOver).every((leg) => leg.over)).toBe(true);
		}
		const rows = legs.map((leg) => leg.row);
		expect(rows).toEqual([...rows].sort((a, b) => a - b));
	});

	test("sewing starts at the corner and the top leg is always \\", () => {
		for (const corner of CORNERS) {
			const { width, height, legs } = cornerPiece(corner);
			const [x, y] = cellOf(legs[0] as Leg)
				.split(",")
				.map(Number);
			expect(x).toBe(corner.endsWith("right") ? width - 1 : 0);
			expect(y).toBe(corner.startsWith("bottom") ? height - 1 : 0);
			for (const leg of legs) {
				const slope = (leg.to[1] - leg.from[1]) / (leg.to[0] - leg.from[0]);
				expect(slope).toBe(leg.over ? 1 : -1);
				expect(leg.from[1]).toBeGreaterThan(leg.to[1]);
			}
		}
	});
});
