import type { Rgb } from "./palette";

export const BANNER_WIDTH = 160;
export const BANNER_HEIGHT = 48;
export const MAX_BANNER_SCALE = 5;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

export function bayer(x: number, y: number): number {
	const index = (y & 3) * 4 + (x & 3);
	return BAYER[index] ?? 0;
}

export function dither(x: number, y: number, a: Rgb, b: Rgb, t: number): Rgb {
	const threshold = (bayer(x, y) + 0.5) / 16;
	return t > threshold ? b : a;
}

export function displayScale(containerWidth: number): number {
	if (!Number.isFinite(containerWidth) || containerWidth < BANNER_WIDTH) {
		return 1;
	}
	const fit = Math.floor(containerWidth / BANNER_WIDTH);
	return Math.max(1, Math.min(MAX_BANNER_SCALE, fit));
}

export function hash(n: number): number {
	let x = n | 0;
	x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
	x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
	x ^= x >>> 16;
	return (x >>> 0) / 4294967296;
}

export class PixelBuffer {
	readonly width: number;
	readonly height: number;
	readonly data: Uint8ClampedArray;
	private readonly sky: Uint8Array;
	horizon = 24;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.data = new Uint8ClampedArray(width * height * 4);
		this.sky = new Uint8Array(width * height);
	}

	fill(color: Rgb, isSky: boolean): void {
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				this.set(x, y, color, isSky);
			}
		}
	}

	set(x: number, y: number, color: Rgb, isSky: boolean): void {
		const index = this.index(x, y);
		if (index === null) return;
		const offset = index * 4;
		this.data[offset] = color[0];
		this.data[offset + 1] = color[1];
		this.data[offset + 2] = color[2];
		this.data[offset + 3] = 255;
		this.sky[index] = isSky ? 1 : 0;
	}

	get(x: number, y: number): Rgb | null {
		const index = this.index(x, y);
		if (index === null) return null;
		const offset = index * 4;
		const r = this.data[offset];
		const g = this.data[offset + 1];
		const b = this.data[offset + 2];
		if (r === undefined || g === undefined || b === undefined) return null;
		return [r, g, b];
	}

	isSky(x: number, y: number): boolean {
		const index = this.index(x, y);
		if (index === null) return false;
		return this.sky[index] === 1;
	}

	ellipse(
		cx: number,
		cy: number,
		rx: number,
		ry: number,
		color: Rgb,
		isSky: boolean,
	): void {
		if (rx <= 0 || ry <= 0) return;
		const rx2 = rx * rx;
		const ry2 = ry * ry;
		for (let y = -ry; y <= ry; y++) {
			for (let x = -rx; x <= rx; x++) {
				if ((x * x) / rx2 + (y * y) / ry2 <= 1) {
					this.set(cx + x, cy + y, color, isSky);
				}
			}
		}
	}

	private index(x: number, y: number): number | null {
		const px = Math.round(x);
		const py = Math.round(y);
		if (px < 0 || py < 0 || px >= this.width || py >= this.height) return null;
		return py * this.width + px;
	}
}
