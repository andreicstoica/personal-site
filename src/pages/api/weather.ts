import type { APIRoute } from "astro";
import { z } from "zod";
import { classifyWeather, type WeatherApi } from "../../lib/weather/scene";

export const prerender = false;

const openMeteoSchema = z.object({
	current: z.object({
		temperature_2m: z.number(),
		weather_code: z.number(),
		visibility: z.number().nullable().optional(),
	}),
	daily: z.object({
		sunrise: z.array(z.number()),
		sunset: z.array(z.number()),
	}),
});

function unavailable(): Response {
	const body: WeatherApi = { ok: false };
	return Response.json(body, {
		status: 503,
		headers: { "Cache-Control": "no-store" },
	});
}

function coordinate(
	request: Request,
	name: string,
	min: number,
	max: number,
): number | null {
	const raw = request.headers.get(name);
	if (raw === null || raw.trim() === "") return null;
	const value = Number(raw);
	if (!Number.isFinite(value) || value < min || value > max) return null;
	return value;
}

export const GET: APIRoute = async ({ request }) => {
	const latitude = coordinate(request, "x-vercel-ip-latitude", -90, 90);
	const longitude = coordinate(request, "x-vercel-ip-longitude", -180, 180);
	if (latitude === null || longitude === null) return unavailable();
	if (Math.abs(latitude) < 0.01 && Math.abs(longitude) < 0.01) {
		return unavailable();
	}

	const url = new URL("https://api.open-meteo.com/v1/forecast");
	url.searchParams.set("latitude", String(latitude));
	url.searchParams.set("longitude", String(longitude));
	url.searchParams.set("current", "temperature_2m,weather_code,visibility");
	url.searchParams.set("daily", "sunrise,sunset");
	url.searchParams.set("forecast_days", "1");
	url.searchParams.set("timezone", "auto");
	url.searchParams.set("timeformat", "unixtime");

	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
		if (!response.ok) return unavailable();
		const payload: unknown = await response.json();
		const parsed = openMeteoSchema.safeParse(payload);
		if (!parsed.success) return unavailable();
		const sunriseSec = parsed.data.daily.sunrise[0];
		const sunsetSec = parsed.data.daily.sunset[0];
		if (sunriseSec === undefined || sunsetSec === undefined) {
			return unavailable();
		}
		const visibility = parsed.data.current.visibility ?? null;
		const body: WeatherApi = {
			ok: true,
			weather: classifyWeather(
				parsed.data.current.weather_code,
				parsed.data.current.temperature_2m,
				visibility,
			),
			sunrise: sunriseSec * 1000,
			sunset: sunsetSec * 1000,
		};
		return Response.json(body, {
			status: 200,
			headers: { "Cache-Control": "no-store" },
		});
	} catch {
		return unavailable();
	}
};
