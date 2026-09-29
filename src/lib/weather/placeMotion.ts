import { hash } from "./buffer";

const TAU = Math.PI * 2;

export function smoothstep(from: number, to: number, value: number): number {
	const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
	return t * t * (3 - 2 * t);
}

/** Wrapped subjects are fully invisible, with zero fade velocity, at each reset. */
export function bubbleMotion(time: number, index = 0) {
	const age = (((time + index * 4.7) % 13) + 13) % 13;
	return {
		y: 45.8 - age * 0.6,
		rise: smoothstep(0, 0.5, age) * (1 - smoothstep(2.6, 3, age)),
		ring: smoothstep(2.8, 3.05, age) * (1 - smoothstep(3.05, 3.6, age)),
		radius: 0.3 + Math.max(0, age - 2.8) * 1.5,
	};
}

export function baleMotion(time: number) {
	const x = 82 - 90 * Math.cos((time / 960) * TAU);
	return { x, angle: (x + 8) / 1.25 };
}

export const GUST_SLOT = 12;

/**
 * One seeded gust per 12 s slot, with its own start, length, strength, sway
 * rate, and flutter, so no two gusts match. Every gust ends by 5.5 s into its
 * slot and fades with zero velocity, so each slot keeps a calm, static tail.
 */
export function gustMotion(time: number) {
	const shifted = time - 2;
	const slot = Math.floor(shifted / GUST_SLOT);
	const age = shifted - slot * GUST_SLOT;
	const seed = slot * 7919;
	const start = hash(seed + 1) * 1.5;
	const length = 2.5 + hash(seed + 2) * 1.5;
	// About one slot in six stays calm, so the rhythm has longer lulls.
	const strength = hash(seed + 3) < 0.17 ? 0 : 0.45 + hash(seed + 4) * 0.55;
	const gustPhase = age * (1.7 + hash(seed + 5) * 0.6);
	const u = (age - start) / length;
	if (u <= 0 || u >= 1) return { gust: 0, gustPhase };
	const flutter =
		0.8 + 0.2 * Math.sin(u * TAU * (1.5 + hash(seed + 6) * 1.5) + slot);
	return { gust: strength * Math.sin(u * Math.PI) ** 2 * flutter, gustPhase };
}

/** Analytic motion uses elapsed time only, including backward seeks. */
export function placeMotion(time: number) {
	const { gust, gustPhase } = gustMotion(time);
	const bale = baleMotion(time);
	return {
		gust,
		gustPhase,
		shimmer: gust * 0.13,
		surf: Math.sin(time * 0.73) * 1.15 + Math.sin(time * 0.31) * 0.45,
		baleX: bale.x,
		baleAngle: bale.angle,
		crabX: 43 + 6 * Math.sin((time * 0.24 - Math.sin(time * 0.24)) * 0.35),
		anemone: 0.85 + 0.15 * Math.sin(time * 0.43),
	};
}

/** Foam returns upstream only while invisible, with zero fade velocity. */
export function rapidMotion(time: number, index = 0) {
	const age = (((time / 3 + index / 3) % 1) + 1) % 1;
	return { x: age * 5, foam: Math.sin(age * Math.PI) ** 2 };
}
