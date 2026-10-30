import { afterEach, expect, mock, test } from "bun:test";
import { historyDateRange, querySiteHistory } from "./guideHistory";

const originalFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = originalFetch;
});

function pr(number: number, merged: string, title: string) {
	return {
		number,
		title,
		body: "A public description.",
		html_url: `https://github.com/andreicstoica/personal-site/pull/${number}`,
		pull_request: { merged_at: merged },
	};
}

test("history follows pagination, uses merge dates, and filters the requested period", async () => {
	const calls: string[] = [];
	globalThis.fetch = Object.assign(
		mock(async (input: RequestInfo | URL) => {
			calls.push(String(input));
			return Response.json({
				total_count: 101,
				incomplete_results: false,
				items:
					calls.length === 1
						? Array.from({ length: 100 }, (_, i) =>
								pr(i + 1, "2026-10-01T12:00:00Z", "Weather scene"),
							)
						: [pr(101, "2026-05-02T12:00:00Z", "Font subsets")],
			});
		}),
		{ preconnect: originalFetch.preconnect },
	);
	const result = await querySiteHistory(
		{ months: 6, query: "font" },
		new Date("2026-10-30T12:00:00Z"),
	);
	expect(calls).toHaveLength(2);
	expect(result.from).toBe("2026-04-30");
	expect(result.changes.map((item) => item.number)).toEqual([101]);
	expect(result.changes[0]?.date).toBe("2026-05-02");
	expect(result.totalMerged).toBe(101);
});

test("GitHub failure stays unavailable rather than becoming an empty history", async () => {
	globalThis.fetch = Object.assign(
		mock(async () => new Response("rate limited", { status: 403 })),
		{ preconnect: originalFetch.preconnect },
	);
	await expect(
		querySiteHistory({ months: 6 }, new Date("2026-10-31T12:00:00Z")),
	).rejects.toThrow("GitHub history unavailable (403)");
});

test("history dates use the current day and natural ranges", () => {
	const today = new Date("2026-10-30T20:00:00Z");
	expect(historyDateRange("2026-04-30", "2026-10-30", today)).toBe(
		"From April to today.",
	);
	expect(historyDateRange("2026-10-24", "2026-10-30", today)).toBe(
		"Over the past week.",
	);
	expect(historyDateRange("2026-10-30", "2026-10-30", today)).toBe("Today.");
	expect(historyDateRange("2025-12-01", "2026-10-30", today)).toBe(
		"From December 2025 to today.",
	);
	expect(historyDateRange("2026-04-30", "2026-10-29", today)).toBe(
		"From April to October 29.",
	);
});
