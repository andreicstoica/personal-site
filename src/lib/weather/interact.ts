import { BANNER_HEIGHT, BANNER_WIDTH } from "./buffer";
import { weatherEffect } from "./effects";
import { material } from "./landscapes";
import { layerOffsets } from "./motion";
import { lighting } from "./palette";
import { PLACES, type Scene, TIMES, WEATHERS } from "./scene";

export type BannerTarget = "sun" | "land" | "sky";

/** Below this, rain or fog hides the disc, so a click there is on the sky. */
const SUN_VISIBLE = 0.3;

/**
 * What a click lands on, in logical banner pixels. The sun wins over terrain
 * because the golden-hour sun sits on the ridge line. The terrain test follows
 * the same layer pan as the frame, so a click on a swaying ridge hits the ridge.
 */
export function bannerTarget(
	scene: Scene,
	x: number,
	y: number,
	timeSeconds: number,
	sunRadius: number,
): BannerTarget {
	const effect = weatherEffect(scene);
	const visibility = 1 - Math.max(effect.cloud * 0.85, effect.fog);
	const [sunX, sunY] = lighting(scene).sun;
	const distance = Math.hypot(
		x - sunX * BANNER_WIDTH,
		y - sunY * BANNER_HEIGHT,
	);
	if (visibility >= SUN_VISIBLE && distance <= sunRadius) return "sun";
	const offsets = layerOffsets(timeSeconds, scene.place);
	for (let layer = 0; layer < 3; layer++) {
		if (material(scene.place, layer, x - (offsets[layer] ?? 0), y)) {
			return "land";
		}
	}
	return "sky";
}

function next<T>(items: readonly T[], current: T): T {
	const index = items.indexOf(current);
	return items[(index + 1) % items.length] ?? current;
}

/** Sky cycles weather, land cycles place, and the sun or moon cycles time. */
export function advanceScene(scene: Scene, target: BannerTarget): Scene {
	switch (target) {
		case "sky":
			return { ...scene, weather: next(WEATHERS, scene.weather) };
		case "land":
			return { ...scene, place: next(PLACES, scene.place) };
		case "sun":
			return { ...scene, time: next(TIMES, scene.time) };
	}
}
