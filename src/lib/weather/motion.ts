import { BANNER_WIDTH } from "./buffer";

export const OSCILLATION_PERIOD = 30;
export const LAYER_AMPLITUDES = [0.75, 1.5, 3] as const;
// One extra logical pixel beyond the largest pan keeps filtering inside the atlas.
export const ATLAS_MARGIN = 4;
export const ATLAS_WIDTH = BANNER_WIDTH + ATLAS_MARGIN * 2;

export function layerOffsets(timeSeconds: number): [number, number, number] {
	const phase = Math.sin((timeSeconds / OSCILLATION_PERIOD) * Math.PI * 2);
	return [
		phase * LAYER_AMPLITUDES[0],
		phase * LAYER_AMPLITUDES[1],
		phase * LAYER_AMPLITUDES[2],
	];
}
