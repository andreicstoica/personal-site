// Runs specs/guide-eval.json against a running guide and prints a scorecard.
//
//   bun run guide:eval http://localhost:4321
//   bun run guide:eval https://personal-site-xyz.vercel.app --only banner,canon
//   bun run guide:eval <url> --out baseline.json
//
// Each case is one model turn, so a run costs model credit. Cases run one at a
// time to stay under the provider's rate limit. A protected preview is reached
// through `vercel curl`, which carries the bypass for the logged-in user.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type EvalCase, parseStream, scoreTurn, type Turn } from "./guideEval";

const [base, ...flags] = process.argv.slice(2);
if (!base) {
	console.error("Usage: bun run guide:eval <base-url> [--only id,kind] [--out file.json]");
	process.exit(1);
}
const flag = (name: string) => {
	const index = flags.indexOf(name);
	return index >= 0 ? flags[index + 1] : undefined;
};
const target = new URL(base);
const only = flag("--only")?.split(",");
const out = flag("--out");

const spec = JSON.parse(
	await readFile(join(import.meta.dir, "../specs/guide-eval.json"), "utf8"),
) as { cases: EvalCase[] };
const cases = spec.cases.filter(
	(test) => !only || only.includes(test.id) || only.includes(test.kind),
);

async function ask(test: EvalCase): Promise<string> {
	const body = JSON.stringify({
		messages: [...(test.turns ?? []), { role: "user", text: test.q }],
		page: "/",
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

// The free tier answers 429 after about twenty quick turns; a gap between
// cases and one slow retry keep a run from scoring the notes fallback.
const GAP_MS = 2500;
const RETRY_MS = 20_000;

for (const test of cases) {
	let started = performance.now();
	let turn = parseStream(await ask(test));
	if (turn.notice?.startsWith("Lots of questions")) {
		await Bun.sleep(RETRY_MS);
		started = performance.now();
		turn = parseStream(await ask(test));
	}
	const ms = Math.round(performance.now() - started);
	const { failures } = scoreTurn(test, turn);
	results.push({ id: test.id, kind: test.kind, ms, turn, failures });
	const mark = failures.length === 0 ? "pass" : "FAIL";
	const tools = turn.tools.join(", ") || "-";
	console.log(`${mark}  ${test.id.padEnd(16)} ${String(ms).padStart(6)}ms  ${tools}`);
	for (const failure of failures) console.log(`      ${failure}`);
	if (failures.length > 0) console.log(`      "${turn.text.slice(0, 160).replace(/\s+/g, " ")}"`);
	await Bun.sleep(GAP_MS);
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
search_posts fired on ${postBody.filter((r) => r.turn.tools.includes("search_posts")).length}/${postBody.length} post-body cases
first person ${count("first person")}, leaked reasoning ${count("leaked reasoning")}, notes fallback ${count("fell back")}
average ${average(results.map((r) => r.ms))}ms per turn, ${average(results.map((r) => r.turn.inputTokens ?? 0))} input tokens (${average(results.map((r) => r.turn.cachedTokens ?? 0))} cached), ${average(results.map((r) => r.turn.outputTokens ?? 0))} output, ${average(results.map((r) => r.turn.tools.length))} tool calls`);

if (out) {
	await writeFile(out, JSON.stringify({ base, at: new Date().toISOString(), results }, null, 2));
	console.log(`wrote ${out}`);
}
