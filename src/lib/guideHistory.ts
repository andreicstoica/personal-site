import { z } from "astro/zod";

const REPOSITORY = "andreicstoica/personal-site";
const issueSchema = z.object({
	number: z.number().int(),
	title: z.string(),
	body: z.string().nullable(),
	pull_request: z.object({ merged_at: z.iso.datetime() }),
});
const pageSchema = z.object({
	total_count: z.number().int(),
	incomplete_results: z.boolean(),
	items: z.array(issueSchema),
});
type PullRequest = z.infer<typeof issueSchema>;

let cache:
	| { key: string; expires: number; result: Promise<PullRequest[]> }
	| undefined;

function monthsAgo(now: Date, months: number): string {
	const date = new Date(now);
	const day = date.getUTCDate();
	date.setUTCDate(1);
	date.setUTCMonth(date.getUTCMonth() - months);
	const lastDay = new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
	).getUTCDate();
	date.setUTCDate(Math.min(day, lastDay));
	return date.toISOString().slice(0, 10);
}

async function loadHistory(
	from: string,
	through: string,
): Promise<PullRequest[]> {
	const items: PullRequest[] = [];
	const signal = AbortSignal.timeout(10_000);
	for (let page = 1; page <= 10; page++) {
		const url = new URL("https://api.github.com/search/issues");
		url.search = new URLSearchParams({
			q: `repo:${REPOSITORY} is:pr is:merged merged:${from}..${through}`,
			sort: "updated",
			order: "desc",
			per_page: "100",
			page: String(page),
		}).toString();
		const response = await fetch(url, {
			headers: {
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
			signal,
		});
		if (!response.ok)
			throw new Error(`GitHub history unavailable (${response.status})`);
		const data = pageSchema.parse(await response.json());
		if (data.incomplete_results || data.total_count > 1000)
			throw new Error("GitHub returned an incomplete site history");
		items.push(...data.items);
		if (items.length >= data.total_count) return items;
	}
	throw new Error("GitHub returned an incomplete site history");
}

export async function querySiteHistory(
	input: { months: number; query?: string },
	now = new Date(),
) {
	const through = now.toISOString().slice(0, 10);
	const oldest = monthsAgo(now, 6);
	const key = `${oldest}:${through}`;
	if (!cache || cache.key !== key || cache.expires <= Date.now()) {
		const result = loadHistory(oldest, through);
		cache = { key, expires: Date.now() + 60 * 60 * 1000, result };
		void result.catch(() => {
			if (cache?.result === result) cache = undefined;
		});
	}
	const items = await cache.result;
	const from = monthsAgo(now, input.months);
	const terms = input.query?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
	const matches = items
		.filter((item) => {
			const date = item.pull_request.merged_at.slice(0, 10);
			const text = `${item.title} ${item.body ?? ""}`.toLowerCase();
			return (
				date >= from &&
				date <= through &&
				terms.every((term) => text.includes(term))
			);
		})
		.sort((a, b) =>
			b.pull_request.merged_at.localeCompare(a.pull_request.merged_at),
		);
	return {
		repository: REPOSITORY,
		from,
		through,
		totalMerged: items.filter(
			(item) => item.pull_request.merged_at.slice(0, 10) >= from,
		).length,
		matching: matches.length,
		truncated: matches.length > 100,
		changes: matches.slice(0, 100).map((item) => ({
			number: item.number,
			title: item.title,
			url: `https://github.com/${REPOSITORY}/pull/${item.number}`,
			date: item.pull_request.merged_at.slice(0, 10),
			summary: (item.body ?? "").slice(0, input.query ? 500 : 160),
		})),
	};
}

export type SiteHistoryOutput = Awaited<ReturnType<typeof querySiteHistory>>;

export function historyDateRange(
	from: string,
	through: string,
	now = new Date(),
): string {
	const start = new Date(`${from}T00:00:00Z`);
	const end = new Date(`${through}T00:00:00Z`);
	const current = now.toISOString().slice(0, 10);
	const endsToday = through === current;
	const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
	if (endsToday && days === 0) return "Today.";
	if (endsToday && days <= 7) return "Over the past week.";
	const startLabel = new Intl.DateTimeFormat("en", {
		month: "long",
		timeZone: "UTC",
		...(start.getUTCFullYear() !== now.getUTCFullYear()
			? { year: "numeric" as const }
			: {}),
	}).format(start);
	const endLabel = endsToday
		? "today"
		: new Intl.DateTimeFormat("en", {
				month: "long",
				day: "numeric",
				timeZone: "UTC",
				...(end.getUTCFullYear() !== now.getUTCFullYear()
					? { year: "numeric" as const }
					: {}),
			}).format(end);
	return `From ${startLabel} to ${endLabel}.`;
}
