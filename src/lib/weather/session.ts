import { z } from "zod";
import {
	PLACES,
	type Place,
	placeSchema,
	readingSchema,
	type StoredReading,
} from "./scene";

const PLACE_KEY = "oregon-banner-place-v1";
const READING_KEY = "oregon-banner-reading-v2";
/**
 * sessionStorage outlives a long-lived tab, so a reading saved on an earlier
 * day would place "now" after its sunset and paint night at noon. Weather
 * also moves within an hour. Past this age the cache is ignored and refetched.
 */
export const READING_MAX_AGE_MS = 30 * 60 * 1000;

const storedReadingSchema = readingSchema.extend({ savedAt: z.number() });

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

export function savePlace(storage: Storage, place: Place): void {
	try {
		storage.setItem(PLACE_KEY, place);
	} catch {
		// Best-effort session cache.
	}
}

export function loadReading(
	storage: Storage,
	nowMs: number = Date.now(),
): StoredReading | null {
	const raw = storage.getItem(READING_KEY);
	if (raw === null) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		const result = storedReadingSchema.safeParse(parsed);
		if (!result.success) return null;
		const { savedAt, ...reading } = result.data;
		if (nowMs - savedAt > READING_MAX_AGE_MS || savedAt > nowMs) return null;
		return reading;
	} catch {
		return null;
	}
}

export function saveReading(
	storage: Storage,
	reading: StoredReading,
	nowMs: number = Date.now(),
): void {
	try {
		storage.setItem(
			READING_KEY,
			JSON.stringify({ ...reading, savedAt: nowMs }),
		);
	} catch {
		// Best-effort session cache.
	}
}
