/** Stand-in location where no IP geo headers exist (dev, local preview). */
export const DEFAULT_COORDS = { latitude: 40.7128, longitude: -74.006 };

function parseCoordinate(
	raw: string | null,
	min: number,
	max: number,
): number | null {
	if (raw === null || raw.trim() === "") return null;
	const value = Number(raw);
	return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function queryCoordinate(
	url: URL,
	names: string[],
	min: number,
	max: number,
): number | null {
	for (const name of names) {
		const value = parseCoordinate(url.searchParams.get(name), min, max);
		if (value !== null) return value;
	}
	return null;
}

/**
 * Resolve coordinates for /api/weather.
 * Query `?latitude=&longitude=` (aliases lat/lon/lng) wins, for testing a
 * specific place. Otherwise use Vercel's
 * IP-geolocation headers (city-level; sufficient for a 4-class weather
 * bucket + sunrise/sunset, both stable within that error radius).
 */
export function resolveCoordinates(request: Request): {
	latitude: number;
	longitude: number;
} | null {
	const url = new URL(request.url);
	const latitude =
		queryCoordinate(url, ["latitude", "lat"], -90, 90) ??
		parseCoordinate(request.headers.get("x-vercel-ip-latitude"), -90, 90);
	const longitude =
		queryCoordinate(url, ["longitude", "lon", "lng"], -180, 180) ??
		parseCoordinate(request.headers.get("x-vercel-ip-longitude"), -180, 180);
	if (latitude === null || longitude === null) return null;
	if (Math.abs(latitude) < 0.01 && Math.abs(longitude) < 0.01) return null;
	return { latitude, longitude };
}
