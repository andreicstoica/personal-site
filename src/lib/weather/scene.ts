import { z } from "zod";

export const placeSchema = z.enum([
	"painted-hills",
	"bend-plateau",
	"cascade-forest",
	"columbia-gorge",
	"oregon-coast",
]);

export const weatherSchema = z.enum([
	"clear",
	"cloudy",
	"rainy",
	"sunny",
	"fog",
]);

export const timeSchema = z.enum(["dawn", "day", "dusk", "night"]);

export const colorModeSchema = z.enum(["light", "dark"]);

export const PLACES = placeSchema.options;
export const WEATHERS = weatherSchema.options;
export const TIMES = timeSchema.options;
export const COLOR_MODES = colorModeSchema.options;

export type Place = z.infer<typeof placeSchema>;
export type Weather = z.infer<typeof weatherSchema>;
export type TimeOfDay = z.infer<typeof timeSchema>;
export type ColorMode = z.infer<typeof colorModeSchema>;

export type Scene = {
	place: Place;
	weather: Weather;
	time: TimeOfDay;
	colorMode: ColorMode;
};

export const PLACE_LABEL: Record<Place, string> = {
	"painted-hills": "Painted Hills",
	"bend-plateau": "Smith Rock",
	"cascade-forest": "Mount Hood",
	"columbia-gorge": "Columbia Gorge",
	"oregon-coast": "Cannon Beach",
};

export const readingSchema = z.object({
	weather: weatherSchema,
	sunrise: z.number().nullable(),
	sunset: z.number().nullable(),
});

export type StoredReading = z.infer<typeof readingSchema>;

export const weatherApiSchema = z.discriminatedUnion("ok", [
	readingSchema.extend({ ok: z.literal(true) }),
	z.object({ ok: z.literal(false) }),
]);

export type WeatherApi = z.infer<typeof weatherApiSchema>;

const DAWN_LEAD_MS = 45 * 60 * 1000;
const DAWN_TAIL_MS = 50 * 60 * 1000;
const DUSK_LEAD_MS = 50 * 60 * 1000;
const DUSK_TAIL_MS = 45 * 60 * 1000;
const HOT_CELSIUS = 27;
const HIGH_VISIBILITY_M = 16_000;

export function fallbackReading(): StoredReading {
	return { weather: "clear", sunrise: null, sunset: null };
}

export function sceneLabel(scene: Scene): string {
	const place = PLACE_LABEL[scene.place];
	return `${place}, ${scene.time}, ${scene.weather}`;
}

/** Sunny is hot, high-visibility sun — a clear sky alone stays clear. */
export function classifyWeather(
	code: number,
	tempC: number,
	visibilityM: number | null,
): Weather {
	if (code === 45 || code === 48) return "fog";
	if (isPrecipitation(code)) return "rainy";
	if (code === 2 || code === 3) return "cloudy";
	if (code === 0 || code === 1) {
		const hot = tempC >= HOT_CELSIUS;
		const highVis = visibilityM !== null && visibilityM >= HIGH_VISIBILITY_M;
		if (hot && highVis) return "sunny";
		return "clear";
	}
	return "cloudy";
}

function isPrecipitation(code: number): boolean {
	if (code >= 51 && code <= 67) return true;
	if (code >= 71 && code <= 77) return true;
	if (code >= 80 && code <= 86) return true;
	return code >= 95 && code <= 99;
}

/** A clear night stays clear even when the afternoon was hot and sunny. */
export function presentLiveWeather(weather: Weather, time: TimeOfDay): Weather {
	if (weather === "sunny" && time === "night") return "clear";
	return weather;
}

export function timeOfDay(
	nowMs: number,
	sunriseMs: number | null,
	sunsetMs: number | null,
): TimeOfDay {
	if (
		sunriseMs === null ||
		sunsetMs === null ||
		sunsetMs <= sunriseMs ||
		!Number.isFinite(sunriseMs) ||
		!Number.isFinite(sunsetMs)
	) {
		return timeFromClock(new Date(nowMs));
	}
	if (nowMs >= sunriseMs - DAWN_LEAD_MS && nowMs < sunriseMs + DAWN_TAIL_MS) {
		return "dawn";
	}
	if (nowMs >= sunsetMs - DUSK_LEAD_MS && nowMs < sunsetMs + DUSK_TAIL_MS) {
		return "dusk";
	}
	if (nowMs >= sunriseMs + DAWN_TAIL_MS && nowMs < sunsetMs - DUSK_LEAD_MS) {
		return "day";
	}
	return "night";
}

export function timeFromClock(date: Date): TimeOfDay {
	const minutes = date.getHours() * 60 + date.getMinutes();
	if (minutes >= 5 * 60 && minutes < 7 * 60 + 30) return "dawn";
	if (minutes >= 7 * 60 + 30 && minutes < 17 * 60 + 30) return "day";
	if (minutes >= 17 * 60 + 30 && minutes < 20 * 60) return "dusk";
	return "night";
}
