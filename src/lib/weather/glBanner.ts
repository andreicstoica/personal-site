import { BANNER_HEIGHT, BANNER_WIDTH } from "./buffer";
import type { BannerImage } from "./draw";
import { type WeatherEffect, weatherEffect } from "./effects";
import type { Scene } from "./scene";
import { BANNER_FRAG, BANNER_VERT } from "./weatherShader";

export type BannerGl = {
	upload: (image: BannerImage) => void;
	setScene: (scene: Scene) => void;
	resize: (cssWidth: number, cssHeight: number, dpr: number) => void;
	draw: (timeSeconds: number) => void;
	destroy: () => void;
};

const UNIFORMS = [
	"uPlate",
	"uPlateSize",
	"uTime",
	"uSkyFrac",
	"uCloud",
	"uCloudSpeed",
	"uLandShade",
	"uRain",
	"uRainSpeed",
	"uRainColumns",
	"uRainLength",
	"uFog",
	"uShimmer",
	"uLightning",
	"uLightningGap",
	"uDust",
	"uBubbles",
	"uCloudLit",
	"uCloudShade",
	"uRainColor",
	"uFogColor",
] as const;

type UniformName = (typeof UNIFORMS)[number];

export function createBannerGl(canvas: HTMLCanvasElement): BannerGl | null {
	const gl = canvas.getContext("webgl2", {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
		premultipliedAlpha: false,
	});
	if (!gl || gl.isContextLost()) {
		canvas.dataset.glError = gl ? "context-lost" : "webgl2-unavailable";
		return null;
	}

	const program = link(gl);
	if (!program) return null;

	const locations = new Map<UniformName, WebGLUniformLocation>();
	for (const name of UNIFORMS) {
		const location = gl.getUniformLocation(program, name);
		if (!location) {
			canvas.dataset.glError = `missing-uniform-${name}`;
			gl.deleteProgram(program);
			return null;
		}
		locations.set(name, location);
	}

	const buffer = gl.createBuffer();
	const texture = gl.createTexture();
	if (!buffer || !texture) {
		canvas.dataset.glError = "alloc-failed";
		gl.deleteProgram(program);
		return null;
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
		gl.STATIC_DRAW,
	);
	const pos = gl.getAttribLocation(program, "aPos");
	if (pos < 0) {
		canvas.dataset.glError = "missing-position";
		gl.deleteProgram(program);
		gl.deleteBuffer(buffer);
		gl.deleteTexture(texture);
		return null;
	}

	const uniform = (name: UniformName): WebGLUniformLocation => {
		const location = locations.get(name);
		if (!location) throw new Error(`missing uniform ${name}`);
		return location;
	};

	const bindPass = () => {
		gl.useProgram(program);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.enableVertexAttribArray(pos);
		gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(uniform("uPlate"), 0);
		gl.uniform2f(uniform("uPlateSize"), BANNER_WIDTH, BANNER_HEIGHT);
	};

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	let effect: WeatherEffect = weatherEffect({
		place: "painted-hills",
		weather: "clear",
		time: "day",
		colorMode: "light",
	});
	let plateWidth = 0;
	let plateHeight = 0;
	let alive = true;

	return {
		upload(image) {
			if (!alive) return;
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			if (plateWidth !== image.width || plateHeight !== image.height) {
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA,
					image.width,
					image.height,
					0,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					image.data,
				);
				plateWidth = image.width;
				plateHeight = image.height;
				return;
			}
			gl.texSubImage2D(
				gl.TEXTURE_2D,
				0,
				0,
				0,
				image.width,
				image.height,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				image.data,
			);
		},
		setScene(scene) {
			effect = weatherEffect(scene);
		},
		resize(cssWidth, cssHeight, dpr) {
			if (!alive) return;
			const width = Math.max(1, Math.round(cssWidth * dpr));
			const height = Math.max(1, Math.round(cssHeight * dpr));
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
			}
			gl.viewport(0, 0, canvas.width, canvas.height);
		},
		draw(timeSeconds) {
			if (!alive || plateWidth === 0) return;
			bindPass();
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.uniform1f(uniform("uTime"), timeSeconds);
			gl.uniform1f(uniform("uSkyFrac"), effect.skyFrac);
			gl.uniform1f(uniform("uCloud"), effect.cloud);
			gl.uniform1f(uniform("uCloudSpeed"), effect.cloudSpeed);
			gl.uniform1f(uniform("uLandShade"), effect.landShade);
			gl.uniform1f(uniform("uRain"), effect.rain);
			gl.uniform1f(uniform("uRainSpeed"), effect.rainSpeed);
			gl.uniform1f(uniform("uRainColumns"), effect.rainColumns);
			gl.uniform1f(uniform("uRainLength"), effect.rainLength);
			gl.uniform1f(uniform("uFog"), effect.fog);
			gl.uniform1f(uniform("uShimmer"), effect.shimmer);
			gl.uniform1f(uniform("uLightning"), effect.lightning);
			gl.uniform1f(uniform("uLightningGap"), effect.lightningGap);
			gl.uniform1f(uniform("uDust"), effect.dust);
			gl.uniform1f(uniform("uBubbles"), effect.bubbles);
			gl.uniform3f(
				uniform("uCloudLit"),
				effect.cloudLit[0],
				effect.cloudLit[1],
				effect.cloudLit[2],
			);
			gl.uniform3f(
				uniform("uCloudShade"),
				effect.cloudShade[0],
				effect.cloudShade[1],
				effect.cloudShade[2],
			);
			gl.uniform3f(
				uniform("uRainColor"),
				effect.rainColor[0],
				effect.rainColor[1],
				effect.rainColor[2],
			);
			gl.uniform3f(
				uniform("uFogColor"),
				effect.fogColor[0],
				effect.fogColor[1],
				effect.fogColor[2],
			);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		},
		destroy() {
			alive = false;
			gl.deleteTexture(texture);
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
			delete canvas.dataset.glError;
		},
	};
}

function link(gl: WebGL2RenderingContext): WebGLProgram | null {
	const vertex = compile(gl, gl.VERTEX_SHADER, BANNER_VERT);
	const fragment = compile(gl, gl.FRAGMENT_SHADER, BANNER_FRAG);
	if (!vertex || !fragment) return null;
	const program = gl.createProgram();
	if (!program) return null;
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);
	gl.deleteShader(vertex);
	gl.deleteShader(fragment);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const canvas = gl.canvas;
		if (canvas instanceof HTMLCanvasElement) {
			canvas.dataset.glError = gl.getProgramInfoLog(program) ?? "link-failed";
		}
		gl.deleteProgram(program);
		return null;
	}
	return program;
}

function compile(
	gl: WebGL2RenderingContext,
	type: number,
	source: string,
): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
	const canvas = gl.canvas;
	if (canvas instanceof HTMLCanvasElement) {
		canvas.dataset.glError = gl.getShaderInfoLog(shader) ?? "compile-failed";
	}
	gl.deleteShader(shader);
	return null;
}
