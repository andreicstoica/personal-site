/** Analytic motion uses elapsed time only, including backward seeks. */
export function placeMotion(time: number, x = 0) {
	const cycle = Math.floor(time / 12);
	const gustAge =
		time - cycle * 12 - 2 - Math.sin(cycle * 2.4) * 1.4 - x * 0.025;
	const gust =
		gustAge > 0 && gustAge < 4 ? Math.sin((gustAge * Math.PI) / 4) ** 2 : 0;
	const travel = time * 0.55 - Math.sin(time * 0.55);
	return {
		sway: gust * Math.sin(gustAge * 2) * 0.85,
		shimmer: gust * 0.13,
		surf: Math.sin(time * 0.73) * 1.15 + Math.sin(time * 0.31) * 0.45,
		baleX: -8 + (travel % 180),
		baleAngle: travel / 1.25,
		crabX: 43 + 6 * Math.sin((time * 0.24 - Math.sin(time * 0.24)) * 0.35),
		anemone: 0.85 + 0.15 * Math.sin(time * 0.43),
		climb: 7 * (1 - Math.exp(-time / 120)),
	};
}
