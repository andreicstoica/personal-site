import { describe, expect, test } from "bun:test";
import {
	type SiteNameBox,
	settledBannerHeight,
	siteNameShouldMorph,
} from "./siteNameTransition";

const visible: SiteNameBox = {
	scrollTop: 0,
	width: 190,
	height: 44,
	top: 353,
	bottom: 397,
	scrollerTop: 0,
	scrollerBottom: 900,
};

describe("siteNameShouldMorph", () => {
	test("morphs from the header when the page is unscrolled", () => {
		expect(siteNameShouldMorph(visible)).toBe(true);
	});

	test("does not morph from a box scrolled above the screen", () => {
		expect(
			siteNameShouldMorph({
				...visible,
				scrollTop: 900,
				top: -549,
				bottom: -505,
			}),
		).toBe(false);
	});

	test("does not morph while scrolled even if the name is still on screen", () => {
		expect(
			siteNameShouldMorph({
				...visible,
				scrollTop: 180,
				top: 171,
				bottom: 215,
			}),
		).toBe(false);
	});

	test("does not morph a name clipped by the scrollport or not laid out", () => {
		expect(
			siteNameShouldMorph({
				...visible,
				bottom: 940,
			}),
		).toBe(false);
		expect(siteNameShouldMorph({ ...visible, width: 0, height: 0 })).toBe(
			false,
		);
	});
});

describe("settledBannerHeight", () => {
	test("stays collapsed until the reveal starts, so both snapshots match", () => {
		expect(
			settledBannerHeight({ slid: false, opened: false, bodyHeight: 331 }),
		).toBe(null);
		expect(
			settledBannerHeight({ slid: true, opened: false, bodyHeight: 0 }),
		).toBe(null);
	});

	test("commits the measured body once the reveal has started", () => {
		expect(
			settledBannerHeight({ slid: true, opened: true, bodyHeight: 331 }),
		).toBe(331);
		expect(
			settledBannerHeight({ slid: false, opened: true, bodyHeight: 331 }),
		).toBe(331);
	});
});
