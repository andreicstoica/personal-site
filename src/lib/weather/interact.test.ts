import { describe, expect, test } from "bun:test";
import { BANNER_HEIGHT, BANNER_WIDTH } from "./buffer";
import { advanceScene, bannerTarget } from "./interact";
import { lighting } from "./palette";
import { PLACES, type Scene, TIMES, WEATHERS } from "./scene";

const base: Scene = {
	place: "painted-hills",
	weather: "clear",
	time: "day",
	colorMode: "light",
};

function sunPixel(scene: Scene): [number, number] {
	const [x, y] = lighting(scene).sun;
	return [x * BANNER_WIDTH, y * BANNER_HEIGHT];
}

describe("bannerTarget", () => {
	test("the bottom row is land and the top-left corner is sky in every place", () => {
		for (const place of PLACES) {
			const scene = { ...base, place };
			expect(bannerTarget(scene, 80, BANNER_HEIGHT - 0.5, 0, 7)).toBe("land");
			expect(bannerTarget(scene, 1, 1, 0, 7)).toBe("sky");
		}
	});

	test("the visible sun and moon are their own target", () => {
		for (const time of TIMES) {
			for (const weather of ["clear", "cloudy"] as const) {
				const scene = { ...base, time, weather };
				const [x, y] = sunPixel(scene);
				expect(bannerTarget(scene, x, y, 0, 7)).toBe("sun");
			}
		}
	});

	test("rain and fog hide the disc, so its spot is sky", () => {
		for (const weather of ["rainy", "fog"] as const) {
			const scene = { ...base, weather };
			const [x, y] = sunPixel(scene);
			expect(bannerTarget(scene, x, y, 0, 7)).toBe("sky");
		}
	});
});

describe("advanceScene", () => {
	test("each target cycles one field through every value and wraps", () => {
		let scene = base;
		const weathers = WEATHERS.map(() => {
			scene = advanceScene(scene, "sky");
			return scene.weather;
		});
		expect(new Set(weathers).size).toBe(WEATHERS.length);
		expect(scene.weather).toBe(base.weather);
		expect(scene.place).toBe(base.place);

		const places = PLACES.map(() => {
			scene = advanceScene(scene, "land");
			return scene.place;
		});
		expect(new Set(places).size).toBe(PLACES.length);
		expect(scene.place).toBe(base.place);

		expect(advanceScene(base, "sun").time).toBe("golden-hour");
		expect(advanceScene({ ...base, time: "night" }, "sun").time).toBe("day");
	});
});
