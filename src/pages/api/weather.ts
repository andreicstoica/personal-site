import type { APIRoute } from "astro";
import { z } from "zod";
import { DEFAULT_COORDS, resolveCoordinates } from "../../lib/weather/location";
import { classifyWeather, type WeatherApi } from "../../lib/weather/scene";

export const prerender = false;

const openMeteoSchema = z.object({
	current: z.object({
		weather_code: z.number(),
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

export const GET: APIRoute = async ({ request }) => {
	const coords =
		resolveCoordinates(request) ??
		// Dev has no Vercel IP headers; fall back so the banner shows real weather.
		(import.meta.env.DEV ? DEFAULT_COORDS : null);
	if (coords === null) return unavailable();
	const { latitude, longitude } = coords;

	const url = new URL("https://api.open-meteo.com/v1/forecast");
	url.searchParams.set("latitude", String(latitude));
	url.searchParams.set("longitude", String(longitude));
	url.searchParams.set("current", "weather_code");
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
		const body: WeatherApi = {
			ok: true,
			weather: classifyWeather(parsed.data.current.weather_code),
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
