// Post-build checks on the Vercel output, for two regressions a passing build
// does not catch.
//
// 1. Every <head> closes at its own </head>. A custom element, a <div>, or
//    bare text ends the head early when parsed, so the stylesheets Astro
//    appends after it land in <body>, and the ClientRouter drops and reloads
//    them on every navigation, painting unstyled frames.
// 2. No media file ships inside a serverless function. Function Storage bills
//    bundle size times every retained deployment, and the CDN serves media
//    from static output already.
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { headBreaker } from "./headBreaker";

const OUTPUT = join(import.meta.dir, "../.vercel/output");
const MEDIA = new Set([
	".avif",
	".gif",
	".jpeg",
	".jpg",
	".mov",
	".mp4",
	".png",
	".webm",
	".webp",
]);

async function* files(dir: string): AsyncGenerator<string> {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* files(path);
		else if (entry.isFile()) yield path;
	}
}

const failures: string[] = [];

for await (const path of files(join(OUTPUT, "static"))) {
	if (extname(path) !== ".html") continue;
	const breaker = headBreaker(await readFile(path, "utf8"));
	if (breaker) {
		failures.push(`${relative(OUTPUT, path)}: <head> ends early at ${breaker}`);
	}
}

for await (const path of files(join(OUTPUT, "functions"))) {
	if (!MEDIA.has(extname(path).toLowerCase())) continue;
	const { size } = await stat(path);
	failures.push(
		`${relative(OUTPUT, path)}: media in a function bundle (${(size / 1e6).toFixed(1)} MB)`,
	);
}

if (failures.length > 0) {
	console.error(`check-build: ${failures.length} problem(s)`);
	for (const failure of failures.slice(0, 20)) console.error(`  ${failure}`);
	if (failures.length > 20) console.error(`  ...and ${failures.length - 20} more`);
	process.exit(1);
}
console.log("check-build: head markup and function bundles OK");
