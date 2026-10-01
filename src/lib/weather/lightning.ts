export const LIGHTNING_DURATION = 0.253;

/** Share of strikes that repeat as a double flash (about one in four). */
const DOUBLE_CHANCE = 0.25;

/** Bolts have ten segments; a double re-forks from one near the middle. */
const SPLIT_MIN = 4;
const SPLIT_SPAN = 3;

/** Full brightness holds for less than one 60 Hz frame, then decays. */
const HOLD = 0.012;
/** Exponential decay rate over the rest of the strike. */
const DECAY = 6;
/** Return strokes fade on this time constant, in seconds. */
const RESTROKE_FADE = 0.018;

function random(index: number, seed: number): number {
	let value = Math.imul(index + seed, 0x45d9f3b);
	value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
	return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

/** A four-second quiet period followed by an exponential waiting time. */
export function lightningGap(index: number, seed = 731): number {
	return 4 - Math.log(1 - random(index, seed)) * 7;
}

/** Indexed randomness makes seeks and reduced-motion frames reproducible. */
export function createLightningTimeline(seed = 731) {
	let index = 0;
	let start = 0;
	let next = lightningGap(1, seed);
	return (
		time: number,
	): {
		/** First strike brightness, 0 to 1. */
		flash: number;
		/** Second strike brightness; 0 unless a double is playing. */
		second: number;
		seed: number;
		/** Shared x origin of both strikes, in scene pixels. */
		origin: number;
		/** Segment index where the second strike leaves the first's path. */
		split: number;
		/** Second strike onset, after the first has fully faded. */
		delay: number;
		/** Second strike peak brightness relative to the first. */
		strength: number;
		duration: number;
		double: boolean;
	} => {
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
		// reach exactly zero at the end, so doubles keep their dark beat.
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
		// A dark beat between strikes reads as two flashes, not one moving bolt.
		const delay = duration + 0.05 + random(index + 4000, seed) * 0.06;
		const strength = 0.5 + random(index + 5000, seed) * (2 / 3 - 0.5);
		const flash = index === 0 ? 0 : pulse(age, 9000);
		const second =
			index === 0 || !double ? 0 : pulse(age - delay, 10000) * strength;
		return {
			flash,
			second,
			seed: random(index + 6000, seed) * 1000,
			origin: 8 + random(index + 7000, seed) * 144,
			split: SPLIT_MIN + Math.floor(random(index + 8000, seed) * SPLIT_SPAN),
			delay,
			strength,
			duration,
			double,
		};
	};
}
