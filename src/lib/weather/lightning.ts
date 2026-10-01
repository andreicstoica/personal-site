export const LIGHTNING_DURATION = 0.253;

/** Share of strikes that repeat as a double flash (about one in seven). */
const DOUBLE_CHANCE = 0.15;

/** Main channels have ten segments, from the cloud base to the ground line. */
export const BOLT_SEGMENTS = 10;
const BOLT_TOP = 1;
const BOLT_STEP = 2.8;
/** A double's branch leaves the first channel at vertex 3 to 5 of 10, above most ridges. */
const SPLIT_MIN = 3;
const SPLIT_SPAN = 3;
/** The branch lands this far, in scene pixels, from where it leaves. */
const REACH_MIN = 6;
const REACH_SPAN = 8;
const SCENE_MARGIN = 4;
const SCENE_WIDTH = 160;

/** Full brightness holds for less than one 60 Hz frame, then decays. */
const HOLD = 0.012;
/** Exponential decay rate over the rest of the strike: a short, hard core. */
const DECAY = 9;
/** Return strokes fade on this time constant, in seconds. */
const RESTROKE_FADE = 0.018;

/**
 * A new-channel stroke waits far longer than real interstroke intervals
 * (tens of ms) so the banner reads it as a second event, not a flicker,
 * but short enough that a double still reads as one quick storm beat.
 */
const BRANCH_DELAY_MIN = 0.45;
const BRANCH_DELAY_SPAN = 0.3;
/**
 * Afterglow on a double's first channel, like continuing current. It stays
 * dim and fades fast so the first strike does not read as slow.
 */
const GLOW_PEAK = 0.35;
const GLOW_FADE = 0.5;

function random(index: number, seed: number): number {
	let value = Math.imul(index + seed, 0x45d9f3b);
	value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
	return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

/** A four-second quiet period followed by an exponential waiting time. */
export function lightningGap(index: number, seed = 731): number {
	return 4 - Math.log(1 - random(index, seed)) * 7;
}

function xAt(path: Float32Array, vertex: number): number {
	return path[vertex * 2] ?? 0;
}

/** Vertices as x, y pairs, from the cloud base down to the ground line. */
export function boltPath(origin: number, seed: number): Float32Array {
	const path = new Float32Array((BOLT_SEGMENTS + 1) * 2);
	let x = origin;
	path[0] = x;
	path[1] = BOLT_TOP;
	for (let n = 1; n <= BOLT_SEGMENTS; n++) {
		x += (random(n, seed) - 0.5) * 3.4 + (origin - x) * 0.16;
		path[n * 2] = x;
		path[n * 2 + 1] = BOLT_TOP + n * BOLT_STEP;
	}
	return path;
}

/**
 * Shares the first path through vertex `split`, then heads to a new ground
 * point on the side away from the first channel below the split.
 */
export function branchPath(
	first: Float32Array,
	split: number,
	seed: number,
): Float32Array {
	const path = first.slice();
	const rootX = xAt(first, split);
	let lowerX = 0;
	for (let n = split + 1; n <= BOLT_SEGMENTS; n++) lowerX += xAt(first, n);
	lowerX /= BOLT_SEGMENTS - split;
	let side =
		Math.abs(lowerX - rootX) > 0.5
			? Math.sign(rootX - lowerX)
			: random(1, seed) < 0.5
				? -1
				: 1;
	const reach = REACH_MIN + random(2, seed) * REACH_SPAN;
	let target = rootX + side * reach;
	if (target < SCENE_MARGIN || target > SCENE_WIDTH - SCENE_MARGIN) {
		side = -side;
		target = rootX + side * reach;
	}
	let x = rootX;
	for (let n = split + 1; n <= BOLT_SEGMENTS; n++) {
		const left = BOLT_SEGMENTS - n + 1;
		x += (target - x) / left + (random(n + 10, seed) - 0.5) * 3.4;
		path[n * 2] = x;
	}
	return path;
}

export type LightningFrame = {
	/** First strike brightness, 0 to 1. */
	flash: number;
	/** Dim light left on a double's first channel; 0 for single strikes. */
	glow: number;
	/** Second strike brightness; 0 unless a double is playing. */
	second: number;
	/** Fork seed for the shader, per strike. */
	seed: number;
	/** First channel vertices, x, y pairs in scene pixels. */
	path: Float32Array;
	/** Second channel: the first through `split`, then its own branch. */
	branch: Float32Array;
	/** Vertex index where the second strike leaves the first channel. */
	split: number;
	/** Second strike onset after the first strike's onset. */
	delay: number;
	/** Second strike peak brightness relative to the first. */
	strength: number;
	duration: number;
	double: boolean;
};

/** Indexed randomness makes seeks and reduced-motion frames reproducible. */
export function createLightningTimeline(seed = 731) {
	let index = 0;
	let start = 0;
	let next = lightningGap(1, seed);
	let shapedIndex = -1;
	let path: Float32Array = new Float32Array(0);
	let branch = path;
	return (time: number): LightningFrame => {
		if (time < start) {
			index = 0;
			start = 0;
			next = lightningGap(1, seed);
		}
		while (time >= next) {
			start = next;
			index++;
			next += lightningGap(index + 1, seed);
		}
		const double = random(index + 3000, seed) < DOUBLE_CHANCE;
		const duration = LIGHTNING_DURATION;
		// No ease-in: the first frame is the peak. The decay is renormalized to
		// reach exactly zero at the end, so the two bright flashes stay apart.
		const pulse = (age: number, key: number) => {
			if (age < 0 || age >= duration) return 0;
			const x = Math.max(0, age - HOLD) / (duration - HOLD);
			const floor = Math.exp(-DECAY);
			let value = (Math.exp(-DECAY * x) - floor) / (1 - floor);
			// One or two return strokes re-brighten the decay so it flickers.
			const strokes = random(index + key, seed) < 0.5 ? 1 : 2;
			let at = 0.05 + random(index + key + 100, seed) * 0.05;
			let amount = 0.35 + random(index + key + 200, seed) * 0.25;
			for (let stroke = 0; stroke < strokes; stroke++) {
				if (age >= at) {
					const taper = (duration - age) / (duration - at);
					value += amount * Math.exp(-(age - at) / RESTROKE_FADE) * taper;
				}
				at += 0.035 + random(index + key + 300 + stroke, seed) * 0.025;
				amount *= 0.55;
			}
			return Math.min(1, value);
		};
		const age = time - start;
		const delay =
			BRANCH_DELAY_MIN + random(index + 4000, seed) * BRANCH_DELAY_SPAN;
		const strength = 0.5 + random(index + 5000, seed) * (2 / 3 - 0.5);
		const split =
			SPLIT_MIN + Math.floor(random(index + 8000, seed) * SPLIT_SPAN);
		if (shapedIndex !== index) {
			const shape = Math.floor(random(index + 6000, seed) * 1e6);
			path = boltPath(8 + random(index + 7000, seed) * 144, shape);
			branch = branchPath(path, split, shape + 1);
			shapedIndex = index;
		}
		const lit = index > 0;
		const flash = lit ? pulse(age, 9000) : 0;
		const second = lit && double ? pulse(age - delay, 10000) * strength : 0;
		// The afterglow fades slowly, then tapers to zero as the branch fades.
		const end = delay + duration;
		const glow =
			lit && double && age >= 0 && age < end
				? GLOW_PEAK *
					Math.exp(-age / GLOW_FADE) *
					(age > delay ? (end - age) / duration : 1)
				: 0;
		return {
			flash,
			glow,
			second,
			seed: random(index + 6000, seed) * 1000,
			path,
			branch,
			split,
			delay,
			strength,
			duration,
			double,
		};
	};
}
