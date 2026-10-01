export const BANNER_WIDTH = 160;
export const BANNER_HEIGHT = 48;

export function hash(n: number): number {
	let x = n | 0;
	x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
	x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
	x ^= x >>> 16;
	return (x >>> 0) / 4294967296;
}
