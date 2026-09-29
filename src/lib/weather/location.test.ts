import { describe, expect, test } from "bun:test";
import { resolveCoordinates } from "./location";

function req(url: string, headers: Record<string, string> = {}): Request {
	return new Request(url, { headers });
}

describe("resolveCoordinates", () => {
	test("query params win for local dev", () => {
		const r = req(
			"http://localhost:4321/api/weather?latitude=45.5&longitude=-122.6",
			{
				"x-vercel-ip-latitude": "40",
				"x-vercel-ip-longitude": "-74",
			},
		);
		expect(resolveCoordinates(r)).toEqual({
			latitude: 45.5,
			longitude: -122.6,
		});
	});

	test("falls back to Vercel headers", () => {
		const r = req("http://localhost:4321/api/weather", {
			"x-vercel-ip-latitude": "40.7",
			"x-vercel-ip-longitude": "-74",
		});
		expect(resolveCoordinates(r)).toEqual({ latitude: 40.7, longitude: -74 });
	});

	test("null when neither present", () => {
		expect(
			resolveCoordinates(req("http://localhost:4321/api/weather")),
		).toBeNull();
	});

	test("rejects out-of-range and near-zero", () => {
		expect(
			resolveCoordinates(
				req("http://localhost:4321/api/weather?latitude=99&longitude=0"),
			),
		).toBeNull();
		expect(
			resolveCoordinates(
				req("http://localhost:4321/api/weather?latitude=0&longitude=0"),
			),
		).toBeNull();
	});
});
