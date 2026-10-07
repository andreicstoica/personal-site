// Runs specs/guide-eval.json against a running guide and prints a scorecard.
//
//   bun run guide:eval http://localhost:4321
//   bun run guide:eval https://personal-site-xyz.vercel.app --only banner,canon
//   bun run guide:eval <url> --out baseline.json
//   bun run guide:eval --rescore baseline.json
//
// --rescore scores a saved run against the current cases and scorer, with
// no model calls.
//
// Each case is one model turn, so a run costs model credit. Cases run one at a
// time to stay under the provider's rate limit. A protected preview is reached
// through `vercel curl`, which carries the bypass for the logged-in user.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type EvalCase, parseStream, scoreTurn, type Turn } from "./guideEval";

const args = process.argv.slice(2);
const flag = (name: string) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};
const rescore = flag("--rescore");
const base = args[0]?.startsWith("--") ? undefined : args[0];
if (!base && !rescore) {
	console.error(
		"Usage: bun run guide:eval <base-url> [--only id,kind] [--out file.json]\n       bun run guide:eval --rescore file.json",
	);
	process.exit(1);
}
const only = flag("--only")?.split(",");
const out = flag("--out");

const spec = JSON.parse(
	await readFile(join(import.meta.dir, "../specs/guide-eval.json"), "utf8"),
) as { cases: EvalCase[] };
const cases = spec.cases.filter(
	(test) => !only || only.includes(test.id) || only.includes(test.kind),
);

async function ask(target: URL, test: EvalCase): Promise<string> {
	const body = JSON.stringify({
		messages: [...(test.turns ?? []), { role: "user", text: test.q }],
		page: "/",
		...(test.bannerScene ? { scene: test.bannerScene } : {}),
	});
	if (!target.hostname.endsWith(".vercel.app")) {
		const response = await fetch(new URL("/api/chat", target), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body,
		});
		return response.text();
	}
	const run = Bun.spawn(
		[
			"vercel",
			"curl",
			"/api/chat",
			"--deployment",
			target.origin,
			"--yes",
			"--",
			"-s",
			"-X",
			"POST",
			"-H",
			"Content-Type: application/json",
			"-d",
			body,
		],
		{ stdout: "pipe", stderr: "ignore" },
	);
	return new Response(run.stdout).text();
}

type Result = { id: string; kind: string; ms: number; turn: Turn; failures: string[] };
const results: Result[] = [];

function report(result: Result): void {
	const { id, ms, turn, failures } = result;
	const mark = failures.length === 0 ? "pass" : "FAIL";
	const tools = turn.tools.join(", ") || "-";
	console.log(`${mark}  ${id.padEnd(16)} ${String(ms).padStart(6)}ms  ${tools}`);
	for (const failure of failures) console.log(`      ${failure}`);
	if (failures.length > 0)
		console.log(`      "${turn.text.slice(0, 160).replace(/\s+/g, " ")}"`);
}

// The free tier answers 429 after about twenty quick turns, and calls fail
// now and then; a gap between cases and one slow retry keep a run from
// scoring the notes fallback.
const GAP_MS = 2500;
const RETRY_MS = 20_000;

if (rescore) {
	const saved = JSON.parse(await readFile(rescore, "utf8")) as { results: Result[] };
	for (const result of saved.results) {
		const test = cases.find((item) => item.id === result.id);
		if (!test) continue;
		const scored = { ...result, failures: scoreTurn(test, result.turn).failures };
		results.push(scored);
		report(scored);
	}
} else if (base) {
	const target = new URL(base);
	for (const test of cases) {
		let started = performance.now();
		let turn = parseStream(await ask(target, test));
		// Any notice means the model did not answer: a 429 or a failed call.
		if (turn.notice) {
			await Bun.sleep(RETRY_MS);
			started = performance.now();
			turn = parseStream(await ask(target, test));
		}
		const ms = Math.round(performance.now() - started);
		const result = { id: test.id, kind: test.kind, ms, turn, failures: scoreTurn(test, turn).failures };
		results.push(result);
		report(result);
		await Bun.sleep(GAP_MS);
	}
}

const passed = results.filter((result) => result.failures.length === 0).length;
const average = (values: number[]) =>
	values.length === 0
		? 0
		: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
const count = (failure: string) =>
	results.filter((result) => result.failures.some((f) => f.startsWith(failure))).length;
const postBody = results.filter((result) => result.kind === "post-body");

console.log(`
${passed}/${results.length} passed
by kind: ${[...new Set(results.map((r) => r.kind))]
	.map((kind) => {
		const ofKind = results.filter((r) => r.kind === kind);
		return `${kind} ${ofKind.filter((r) => r.failures.length === 0).length}/${ofKind.length}`;
	})
	.join(", ")}
post-body: search_posts fired on ${postBody.filter((r) => r.turn.tools.includes("search_posts")).length}/${postBody.length}, route passages on ${postBody.filter((r) => (r.turn.passages ?? []).length > 0).length}/${postBody.length}; passages on other kinds ${results.filter((r) => r.kind !== "post-body" && (r.turn.passages ?? []).length > 0).length}
first person ${count("first person")}, leaked reasoning ${count("leaked reasoning")}, notes fallback ${count("fell back")}
served by: ${
	[...new Set(results.map((r) => r.turn.provider ?? "unknown"))]
		.map((host) => {
			const ofHost = results.filter((r) => (r.turn.provider ?? "unknown") === host);
			const failed = ofHost.filter((r) => r.failures.length > 0).length;
			return `${host} ${ofHost.length}${failed ? ` (${failed} failed)` : ""}`;
		})
		.join(", ")
}
average ${average(results.map((r) => r.ms))}ms per turn, ${average(results.map((r) => r.turn.inputTokens ?? 0))} input tokens (${average(results.map((r) => r.turn.cachedTokens ?? 0))} cached), ${average(results.map((r) => r.turn.outputTokens ?? 0))} output, ${average(results.map((r) => r.turn.tools.length))} tool calls`);

if (out && !rescore) {
	await writeFile(out, JSON.stringify({ base, at: new Date().toISOString(), results }, null, 2));
	console.log(`wrote ${out}`);
}
