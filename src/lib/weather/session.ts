import {
	PLACES,
	type Place,
	placeSchema,
	readingSchema,
	type StoredReading,
} from "./scene";

const PLACE_KEY = "oregon-banner-place-v1";
const READING_KEY = "oregon-banner-reading-v1";

export function randomPlace(): Place {
	const index = Math.floor(Math.random() * PLACES.length);
	return PLACES[index] ?? "painted-hills";
}

export function loadOrCreatePlace(storage: Storage): Place {
	const parsed = placeSchema.safeParse(storage.getItem(PLACE_KEY));
	if (parsed.success) return parsed.data;
	const place = randomPlace();
	try {
		storage.setItem(PLACE_KEY, place);
	} catch {
		// Session storage can be blocked; the place still lasts for this page.
	}
	return place;
}

export function loadReading(storage: Storage): StoredReading | null {
	const raw = storage.getItem(READING_KEY);
	if (raw === null) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		const result = readingSchema.safeParse(parsed);
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}

export function saveReading(storage: Storage, reading: StoredReading): void {
	try {
		storage.setItem(READING_KEY, JSON.stringify(reading));
	} catch {
		// Best-effort session cache.
	}
}
