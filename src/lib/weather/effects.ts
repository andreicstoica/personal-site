import { assertNever } from "../assertNever";
import { BANNER_HEIGHT } from "./buffer";
import { SKY_ROWS } from "./landscapes";
import { cloudColors, fogColor, type Rgb, rainColor } from "./palette";
import type { Place, Scene } from "./scene";

/**
 * Tune weather here. These numbers are uploaded as shader uniforms every frame.
 * Amounts are 0–1 unless noted. Speeds are cycles per second.
 */
export const WEATHER_KNOBS = {
	clearCloud: 0.22,
	cloudyCloud: 0.78,
	rainyCloud: 0.94,
	clearCloudSpeed: 0.025,
	cloudyCloudSpeed: 0.045,
	rainyCloudSpeed: 0.11,
	cloudyShade: 0.14,
	rainyShade: 0.32,
	rainOpacity: 0.85,
	rainSpeed: 0.9,
	rainColumns: 72,
	rainLength: 0.055,
	fogStrength: 0.8,
	shimmer: 0.62,
	lightningGap: 6.5,
	dust: 0.75,
	bubbles: 0.7,
} as const;

export type Vec3 = readonly [number, number, number];

export type WeatherEffect = {
	skyFrac: number;
	cloud: number;
	cloudSpeed: number;
	landShade: number;
	rain: number;
	rainSpeed: number;
	rainColumns: number;
	rainLength: number;
	fog: number;
	shimmer: number;
	lightning: number;
	lightningGap: number;
	dust: number;
	bubbles: number;
	cloudLit: Vec3;
	cloudShade: Vec3;
	rainColor: Vec3;
	fogColor: Vec3;
};

export function weatherEffect(scene: Scene): WeatherEffect {
	const clouds = cloudColors(scene);
	const shared = {
		skyFrac: SKY_ROWS[scene.place] / BANNER_HEIGHT,
		rainColumns: WEATHER_KNOBS.rainColumns,
		rainLength: WEATHER_KNOBS.rainLength,
		lightningGap: WEATHER_KNOBS.lightningGap,
		cloudLit: unit(clouds.lit),
		cloudShade: unit(clouds.shade),
		rainColor: unit(rainColor(scene)),
		fogColor: unit(fogColor(scene)),
	};
	const dust = placeCarriesDust(scene.place) ? WEATHER_KNOBS.dust : 0;
	const bubbles = scene.place === "oregon-coast" ? WEATHER_KNOBS.bubbles : 0;
	return { ...shared, ...atmosphere(scene, dust, bubbles) };
}

type Atmosphere = Pick<
	WeatherEffect,
	| "cloud"
	| "cloudSpeed"
	| "landShade"
	| "rain"
	| "rainSpeed"
	| "fog"
	| "shimmer"
	| "lightning"
	| "dust"
	| "bubbles"
>;

function atmosphere(scene: Scene, dust: number, bubbles: number): Atmosphere {
	switch (scene.weather) {
		case "clear":
			return {
				cloud: WEATHER_KNOBS.clearCloud,
				cloudSpeed: WEATHER_KNOBS.clearCloudSpeed,
				landShade: 0,
				rain: 0,
				rainSpeed: 0,
				fog: 0,
				shimmer: 0,
				lightning: 0,
				dust,
				bubbles,
			};
		case "cloudy":
			return {
				cloud: WEATHER_KNOBS.cloudyCloud,
				cloudSpeed: WEATHER_KNOBS.cloudyCloudSpeed,
				landShade: WEATHER_KNOBS.cloudyShade,
				rain: 0,
				rainSpeed: 0,
				fog: 0,
				shimmer: 0,
				lightning: 0,
				dust: dust * 0.45,
				bubbles,
			};
		case "rainy":
			return {
				cloud: WEATHER_KNOBS.rainyCloud,
				cloudSpeed: WEATHER_KNOBS.rainyCloudSpeed,
				landShade: WEATHER_KNOBS.rainyShade,
				rain: WEATHER_KNOBS.rainOpacity,
				rainSpeed: WEATHER_KNOBS.rainSpeed,
				fog: 0,
				shimmer: 0,
				lightning: scene.time === "night" ? 0.55 : 1,
				dust: 0,
				bubbles: bubbles * 0.35,
			};
		case "sunny":
			return {
				cloud: 0,
				cloudSpeed: 0,
				landShade: 0,
				rain: 0,
				rainSpeed: 0,
				fog: 0,
				shimmer: scene.time === "night" ? 0 : WEATHER_KNOBS.shimmer,
				lightning: 0,
				dust,
				bubbles,
			};
		case "fog":
			return {
				cloud: 0,
				cloudSpeed: 0,
				landShade: 0,
				rain: 0,
				rainSpeed: 0,
				fog: WEATHER_KNOBS.fogStrength,
				shimmer: 0,
				lightning: 0,
				dust: 0,
				bubbles: 0,
			};
		default:
			return assertNever(scene.weather);
	}
}

function placeCarriesDust(place: Place): boolean {
	switch (place) {
		case "painted-hills":
		case "bend-plateau":
			return true;
		case "cascade-forest":
		case "columbia-gorge":
		case "oregon-coast":
			return false;
		default:
			return assertNever(place);
	}
}

function unit(color: Rgb): Vec3 {
	return [color[0] / 255, color[1] / 255, color[2] / 255];
}
