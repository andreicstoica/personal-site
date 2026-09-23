import { assertNever } from "../assertNever";
import { hash, type PixelBuffer } from "./buffer";
import { grade, type Rgb } from "./palette";
import type { Scene } from "./scene";

export const SKY_ROWS: Record<Scene["place"], number> = {
	"painted-hills": 16,
	"bend-plateau": 18,
	"cascade-forest": 22,
	"columbia-gorge": 14,
	"oregon-coast": 17,
};

export function drawPlace(buf: PixelBuffer, scene: Scene, frame: number): void {
	switch (scene.place) {
		case "painted-hills":
			drawPaintedHills(buf, scene);
			return;
		case "bend-plateau":
			drawSmithRock(buf, scene);
			return;
		case "cascade-forest":
			drawMountHood(buf, scene);
			return;
		case "columbia-gorge":
			drawGorge(buf, scene, frame);
			return;
		case "oregon-coast":
			drawCannonBeach(buf, scene, frame);
			return;
		default:
			assertNever(scene.place);
	}
}

function drawPaintedHills(buf: PixelBuffer, scene: Scene): void {
	const bands = stripes(scene, [
		[48, 36, 32],
		[168, 56, 36],
		[208, 156, 52],
		[228, 206, 156],
		[36, 30, 28],
		[186, 92, 48],
	]);
	const playa = grade([196, 170, 122], scene);
	const crack = grade([120, 96, 64], scene);
	fillHill(buf, 24, 4, 0.05, 0.2, bands, 3);
	fillHill(buf, 33, 6, 0.042, 1.4, bands, 3);
	fillHill(buf, 43, 4, 0.055, 2.4, bands, 3);
	for (let y = 44; y < buf.height; y++) {
		for (let x = 0; x < buf.width; x++) {
			const split = x % 9 === 0 || (y === 46 && x % 5 === 0);
			buf.set(x, y, split ? crack : playa, false);
		}
	}
	buf.horizon = 18;
}

function drawSmithRock(buf: PixelBuffer, scene: Scene): void {
	const tuff = grade([186, 92, 52], scene);
	const shade = grade([122, 58, 36], scene);
	const lit = grade([214, 132, 78], scene);
	const soil = grade([168, 140, 96], scene);
	const sage = grade([96, 108, 62], scene);
	const river = grade([36, 104, 132], scene);
	const deep = grade([20, 64, 96], scene);
	const leaf = grade([28, 72, 44], scene);
	const leafLit = grade([72, 108, 58], scene);
	const trunk = grade([92, 64, 36], scene);

	drawMonkeyFace(buf, 48, 14, tuff, shade, lit);
	drawCliffWall(buf, 86, 148, 16, tuff, shade, lit);
	for (let y = 36; y <= 40; y++) {
		for (let x = 0; x < buf.width; x++) {
			const ripple = Math.sin(x * 0.2 + y) > 0.4;
			buf.set(x, y, ripple || y === 36 ? river : deep, false);
		}
	}
	for (let y = 41; y < buf.height; y++) {
		for (let x = 0; x < buf.width; x++) {
			const scrub = y > 43 && hash(x * 13 + y * 5) > 0.86;
			buf.set(x, y, scrub ? sage : soil, false);
		}
	}
	drawJuniper(buf, 18, 46, leaf, leafLit, trunk);
	drawJuniper(buf, 132, 46, leaf, leafLit, trunk);
	buf.horizon = 34;
}

function drawMountHood(buf: PixelBuffer, scene: Scene): void {
	const snow = grade([236, 242, 246], scene);
	const ice = grade([186, 206, 220], scene);
	const rock = grade([112, 102, 96], scene);
	const shade = grade([72, 64, 60], scene);
	const fir = grade([22, 64, 40], scene);
	const firLit = grade([48, 96, 56], scene);
	const trunk = grade([64, 48, 32], scene);
	const peakX = 82;
	const peakY = 3;
	const baseY = 32;

	for (let y = peakY; y <= baseY; y++) {
		const t = (y - peakY) / (baseY - peakY);
		const left = Math.max(1, Math.round(t ** 1.55 * 54));
		const right = Math.max(1, Math.round(t ** 1.7 * 44));
		for (let x = peakX - left; x <= peakX + right; x++) {
			const snowLine = t < 0.4;
			const glacier =
				Math.abs(x - (peakX - Math.round(t * 8))) <= 1 ||
				Math.abs(x - (peakX + Math.round(t * 12))) <= 1;
			const edge = x <= peakX - left + 1 || x >= peakX + right - 1;
			let color = rock;
			if (snowLine) color = glacier ? ice : snow;
			else if (glacier && t < 0.72) color = ice;
			else if (edge) color = shade;
			buf.set(x, y, color, false);
		}
	}
	buf.set(peakX, peakY - 1, snow, false);
	buf.set(peakX, peakY, snow, false);

	for (let i = 0; i < 14; i++) {
		const x = 8 + i * 11;
		const height = 7 + Math.floor(hash(i * 17) * 6);
		drawFir(buf, x, 47, height, firLit, fir, trunk);
	}
	buf.horizon = 30;
}

function drawGorge(buf: PixelBuffer, scene: Scene, frame: number): void {
	const basalt = grade([58, 62, 70], scene);
	const basaltLit = grade([112, 116, 122], scene);
	const moss = grade([48, 92, 58], scene);
	const river = grade([24, 88, 140], scene);
	const deep = grade([12, 48, 96], scene);
	const foam = grade([220, 230, 234], scene);
	const far = grade([86, 108, 84], scene);

	for (let x = 36; x < 126; x++) {
		const crest = 22 + Math.round(2 * Math.sin(x * 0.09));
		for (let y = crest; y < 34; y++) buf.set(x, y, far, false);
	}
	drawCliff(buf, 0, 40, 11, basalt, basaltLit, moss, true);
	drawCliff(buf, 122, buf.width - 1, 9, basalt, basaltLit, moss, false);

	for (let y = 12; y < 36; y++) {
		const shift = Math.floor(frame * 0.5 + y) % 3;
		buf.set(136 + shift, y, foam, false);
		buf.set(138, y, river, false);
		buf.set(140, y, foam, false);
		if (y === 24 || y === 25) {
			buf.set(134, y, foam, false);
			buf.set(142, y, foam, false);
		}
	}

	for (let y = 36; y < buf.height; y++) {
		for (let x = 0; x < buf.width; x++) {
			const wave = Math.sin(x * 0.22 + y * 0.4 + frame * 0.22);
			buf.set(x, y, wave > 0.72 ? foam : y > 43 ? deep : river, false);
		}
	}
	buf.horizon = 36;
}

function drawCannonBeach(buf: PixelBuffer, scene: Scene, frame: number): void {
	const water = grade([32, 86, 112], scene);
	const deep = grade([18, 58, 84], scene);
	const foam = grade([214, 224, 220], scene);
	const wet = grade([132, 124, 108], scene);
	const sand = grade([186, 168, 132], scene);
	const rock = grade([62, 60, 58], scene);
	const lit = grade([118, 114, 104], scene);
	const pool = grade([20, 92, 112], scene);
	const poolDeep = grade([10, 52, 72], scene);
	const star = grade([214, 104, 48], scene);
	const anemone = grade([64, 130, 78], scene);
	const moss = grade([70, 110, 62], scene);
	const horizon = 18;

	for (let y = 12; y <= horizon; y++) {
		for (let x = 0; x < buf.width; x++) {
			const wave = Math.sin(x * 0.18 + frame * 0.22 + y);
			const breaking = wave > 0.62 && y >= horizon - 1;
			buf.set(x, y, breaking ? foam : y > horizon - 2 ? deep : water, false);
		}
	}

	drawSeaStack(buf, 116, horizon, 9, 3, rock, lit);
	buf.set(116, horizon - 10, moss, false);
	drawSeaStack(buf, 126, horizon, 6, 1, rock, lit);
	drawSeaStack(buf, 130, horizon, 5, 1, rock, lit);

	for (let y = horizon + 1; y < buf.height; y++) {
		for (let x = 0; x < buf.width; x++) {
			const near = y > 32;
			buf.set(x, y, near ? sand : wet, false);
		}
	}

	drawTidePool(buf, 42, 40, rock, pool, poolDeep, star, anemone, frame);
	buf.horizon = horizon;
}

function stripes(scene: Scene, colors: readonly Rgb[]): Rgb[] {
	return colors.map((color) => grade(color, scene));
}

function fillHill(
	buf: PixelBuffer,
	base: number,
	amp: number,
	freq: number,
	phase: number,
	colors: readonly Rgb[],
	stripeHeight: number,
): void {
	if (colors.length === 0) return;
	for (let x = 0; x < buf.width; x++) {
		const n =
			Math.sin(x * freq + phase) +
			0.35 * Math.sin(x * freq * 2.15 + phase * 1.7);
		const crest = Math.round(base - amp * n);
		for (let y = crest; y < buf.height; y++) {
			const band = Math.floor((y - crest) / stripeHeight) % colors.length;
			const color = colors[band];
			if (color) buf.set(x, y, color, false);
		}
	}
}

function drawMonkeyFace(
	buf: PixelBuffer,
	cx: number,
	top: number,
	tuff: Rgb,
	shade: Rgb,
	lit: Rgb,
): void {
	for (let y = top; y <= top + 7; y++) {
		const half = y < top + 5 ? 6 : 3;
		for (let x = cx - half; x <= cx + half; x++) {
			buf.set(x, y, x < cx - 1 ? lit : shade, false);
		}
	}
	for (let y = top + 8; y <= 35; y++) {
		const half = 4 + Math.floor((y - top) / 10);
		for (let x = cx - half; x <= cx + half; x++) {
			buf.set(x, y, x < cx ? lit : tuff, false);
		}
	}
}

function drawCliffWall(
	buf: PixelBuffer,
	x0: number,
	x1: number,
	top: number,
	tuff: Rgb,
	shade: Rgb,
	lit: Rgb,
): void {
	for (let x = x0; x <= x1; x++) {
		const tower = (x - x0) % 18 < 4 ? -3 : 0;
		const crest = top + tower + ((x + 3) % 11 === 0 ? -1 : 0);
		for (let y = crest; y <= 37; y++) {
			const crack = (x - x0) % 9 === 0;
			const color = crack ? shade : x < x0 + 16 ? lit : tuff;
			buf.set(x, y, color, false);
		}
	}
}

function drawSeaStack(
	buf: PixelBuffer,
	cx: number,
	base: number,
	height: number,
	width: number,
	rock: Rgb,
	lit: Rgb,
): void {
	const top = base - height;
	for (let y = top; y <= base; y++) {
		const t = (y - top) / Math.max(1, height);
		const belly = Math.sin(Math.min(1, t) * Math.PI);
		const half = Math.max(0, Math.round(width * (0.25 + 0.75 * belly)));
		for (let x = cx - half; x <= cx + half; x++) {
			buf.set(x, y, x <= cx ? lit : rock, false);
		}
	}
}

function drawTidePool(
	buf: PixelBuffer,
	cx: number,
	cy: number,
	rock: Rgb,
	pool: Rgb,
	deep: Rgb,
	star: Rgb,
	anemone: Rgb,
	frame: number,
): void {
	const stones: ReadonlyArray<readonly [number, number]> = [
		[-16, 1],
		[-12, -3],
		[-6, -5],
		[0, -5],
		[7, -4],
		[13, -2],
		[16, 2],
		[11, 5],
		[4, 6],
		[-3, 5],
		[-10, 4],
		[-15, 3],
	];
	for (const [dx, dy] of stones) {
		buf.ellipse(cx + dx, cy + dy, 2, 2, rock, false);
	}
	buf.ellipse(cx, cy, 12, 4, pool, false);
	buf.ellipse(cx + 1, cy + 1, 7, 2, deep, false);
	const spark = cx - 1 + Math.round(Math.sin(frame * 0.25) * 2);
	buf.set(spark, cy, pool, false);
	drawStarfish(buf, cx - 4, cy + 1, star);
	buf.ellipse(cx + 5, cy, 2, 2, anemone, false);
	buf.set(cx + 5, cy - 1, anemone, false);
}

function drawStarfish(
	buf: PixelBuffer,
	x: number,
	y: number,
	color: Rgb,
): void {
	buf.set(x, y, color, false);
	buf.set(x - 1, y, color, false);
	buf.set(x + 1, y, color, false);
	buf.set(x, y - 1, color, false);
	buf.set(x, y + 1, color, false);
	buf.set(x - 1, y - 1, color, false);
	buf.set(x + 1, y + 1, color, false);
}

function drawJuniper(
	buf: PixelBuffer,
	x: number,
	ground: number,
	leaf: Rgb,
	lit: Rgb,
	trunk: Rgb,
): void {
	buf.ellipse(x, ground - 6, 5, 3, leaf, false);
	buf.ellipse(x - 1, ground - 7, 2, 2, lit, false);
	buf.set(x, ground - 2, trunk, false);
	buf.set(x, ground - 1, trunk, false);
	buf.set(x, ground, trunk, false);
}

function drawFir(
	buf: PixelBuffer,
	x: number,
	ground: number,
	height: number,
	lit: Rgb,
	dark: Rgb,
	trunk: Rgb,
): void {
	const top = ground - height;
	for (let y = top; y <= ground - 2; y++) {
		const t = (y - top) / Math.max(1, height - 2);
		const half = Math.max(0, Math.round(t * height * 0.22));
		for (let dx = -half; dx <= half; dx++) {
			buf.set(x + dx, y, dx < 0 ? lit : dark, false);
		}
	}
	buf.set(x, ground - 1, trunk, false);
	buf.set(x, ground, trunk, false);
}

function drawCliff(
	buf: PixelBuffer,
	x0: number,
	x1: number,
	top: number,
	basalt: Rgb,
	lit: Rgb,
	moss: Rgb,
	lightFromLeft: boolean,
): void {
	for (let x = x0; x <= x1; x++) {
		const lip = (x + top) % 7 === 0 ? 1 : 0;
		const crest = top + lip;
		for (let y = crest; y < 36; y++) {
			const crack = (x - x0) % 8 === 0;
			const face = lightFromLeft ? x < x0 + 12 : x > x1 - 14;
			const color = crack || !face ? basalt : lit;
			buf.set(x, y, color, false);
		}
		if ((x - x0) % 3 === 0) buf.set(x, crest, moss, false);
	}
}
