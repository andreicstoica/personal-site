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
		flash: number;
		seed: number;
		origin: number;
		cool: number;
		delay: number;
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
		const pulse = (age: number) => {
			if (age < 0 || age > 0.12) return 0;
			return Math.sin((age / 0.12) * Math.PI) ** 2;
		};
		const age = time - start;
		const double = random(index + 3000, seed) < 0.3;
		const delay = 0.13 + random(index + 4000, seed) * 0.07;
		const secondary = double && age >= delay;
		return {
			flash:
				index === 0
					? 0
					: secondary
						? pulse(age - delay) * (0.4 + random(index + 5000, seed) * 0.15)
						: pulse(age),
			seed: random(index + 6000, seed) * 1000,
			origin:
				25 +
				random(index + 7000, seed) * 110 +
				(secondary ? 4 + random(index + 8000, seed) * 5 : 0),
			cool: secondary ? 1 : 0,
			delay,
		};
	};
}
