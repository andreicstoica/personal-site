import { z } from "zod";

export const placeSchema = z.enum([
	"painted-hills",
	"bend-plateau",
	"cascade-forest",
	"columbia-gorge",
	"oregon-coast",
]);

export const weatherSchema = z.enum(["clear", "cloudy", "rainy", "fog"]);

export const timeSchema = z.enum(["day", "golden-hour", "night"]);

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
	"painted-hills": "Painted Hills, OR",
	"bend-plateau": "Smith Rock, OR",
	"cascade-forest": "Mt. Hood, OR",
	"columbia-gorge": "The Gorge, OR",
	"oregon-coast": "Cannon Beach, OR",
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

export function fallbackReading(): StoredReading {
	return { weather: "clear", sunrise: null, sunset: null };
}

export function sceneLabel(scene: Scene): string {
	const place = PLACE_LABEL[scene.place];
	return `${place}, ${scene.time === "golden-hour" ? "golden hour" : scene.time}, ${scene.weather}`;
}

const WEATHER_ADJECTIVE: Record<Weather, string> = {
	clear: "clear",
	cloudy: "cloudy",
	rainy: "rainy",
	fog: "foggy",
};

/** The parts of a scene a visitor can change. */
export type SceneParts = Pick<Scene, "place" | "weather" | "time">;

/** The caption's words, as in "A rainy night at Smith Rock, OR." */
export function captionWords(scene: SceneParts): {
	weather: string;
	time: string;
	place: string;
} {
	return {
		weather: WEATHER_ADJECTIVE[scene.weather],
		time: scene.time === "golden-hour" ? "golden hour" : scene.time,
		place: PLACE_LABEL[scene.place],
	};
}

export function classifyWeather(code: number): Weather {
	if (code === 45 || code === 48) return "fog";
	if (isPrecipitation(code)) return "rainy";
	if (code === 2 || code === 3) return "cloudy";
	if (code === 0 || code === 1) return "clear";
	return "cloudy";
}

function isPrecipitation(code: number): boolean {
	if (code >= 51 && code <= 67) return true;
	if (code >= 71 && code <= 77) return true;
	if (code >= 80 && code <= 86) return true;
	return code >= 95 && code <= 99;
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
		return "golden-hour";
	}
	if (nowMs >= sunsetMs - DUSK_LEAD_MS && nowMs < sunsetMs + DUSK_TAIL_MS) {
		return "golden-hour";
	}
	if (nowMs >= sunriseMs + DAWN_TAIL_MS && nowMs < sunsetMs - DUSK_LEAD_MS) {
		return "day";
	}
	return "night";
}

export function timeFromClock(date: Date): TimeOfDay {
	const minutes = date.getHours() * 60 + date.getMinutes();
	if (minutes >= 5 * 60 && minutes < 7 * 60 + 30) return "golden-hour";
	if (minutes >= 7 * 60 + 30 && minutes < 17 * 60 + 30) return "day";
	if (minutes >= 17 * 60 + 30 && minutes < 20 * 60) return "golden-hour";
	return "night";
}
