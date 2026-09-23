import { execSync } from "node:child_process";

/** Date of the latest commit, as "Last updated Mon D, YYYY", or null when unknown. */
export function lastUpdatedLabel(): string | null {
	let iso: string | null = null;

	try {
		iso = execSync("git log -1 --format=%cI", {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		iso = null;
	}

	if (!iso) {
		const vercel = process.env.VERCEL_GIT_COMMIT_LAST_AT;
		if (vercel) iso = new Date(Number(vercel)).toISOString();
	}

	if (!iso) return null;

	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return null;

	return `Last updated ${date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	})}`;
}
