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

/** Analytic motion uses elapsed time only, including backward seeks. */
export function placeMotion(time: number, x = 0) {
	const gustAge = (((time - 2 - x * 0.025) % 12) + 12) % 12;
	const gust = gustAge < 4 ? Math.sin((gustAge * Math.PI) / 4) ** 2 : 0;
	const bale = baleMotion(time);
	return {
		sway: gust * Math.sin(gustAge * 2) * 0.85,
		shimmer: gust * 0.13,
		surf: Math.sin(time * 0.73) * 1.15 + Math.sin(time * 0.31) * 0.45,
		baleX: bale.x,
		baleAngle: bale.angle,
		crabX: 43 + 6 * Math.sin((time * 0.24 - Math.sin(time * 0.24)) * 0.35),
		anemone: 0.85 + 0.15 * Math.sin(time * 0.43),
		climb: 7 * (1 - Math.exp(-time / 120)),
	};
}
