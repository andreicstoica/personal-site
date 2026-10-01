import { BANNER_WIDTH } from "./buffer";
import type { Place } from "./scene";

export const OSCILLATION_PERIOD = 30;
export const LAYER_AMPLITUDES = [0.75, 1.5, 3] as const;
// One extra logical pixel beyond the largest pan keeps filtering inside the atlas.
export const ATLAS_MARGIN = 4;
export const ATLAS_WIDTH = BANNER_WIDTH + ATLAS_MARGIN * 2;

// The orchard gust already moves inside the Mount Hood scene; a full layer
// sway on top of it competes with that motion.
const PLACE_SWAY: Record<Place, number> = {
	"painted-hills": 1,
	"bend-plateau": 1,
	"cascade-forest": 0.35,
	"columbia-gorge": 1,
	"oregon-coast": 1,
};

export function layerOffsets(
	timeSeconds: number,
	place?: Place,
): [number, number, number] {
	const sway = place ? PLACE_SWAY[place] : 1;
	const phase =
		Math.sin((timeSeconds / OSCILLATION_PERIOD) * Math.PI * 2) * sway;
	return [
		phase * LAYER_AMPLITUDES[0],
		phase * LAYER_AMPLITUDES[1],
		phase * LAYER_AMPLITUDES[2],
	];
}
