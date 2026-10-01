// Serve the Vercel build output locally with production timing: static files
// first (as the CDN does), then the Astro function for `prerender = false`
// routes. `astro preview` does not support the Vercel adapter.
import { join, normalize } from "node:path";
import { DEFAULT_COORDS } from "../src/lib/weather/location";

const OUTPUT = join(import.meta.dir, "../.vercel/output");
const STATIC_DIR = join(OUTPUT, "static");
const port = Number(process.env.PORT ?? 4322);

const { default: handler } = await import(
	join(OUTPUT, "functions/_render.func/dist/server/entry.mjs")
);

// Vercel sets IP geo headers on every request. Stand in with the default so
// /api/weather resolves the same way it does in production.
const GEO_HEADERS = {
	"x-vercel-ip-latitude": process.env.GEO_LAT ?? String(DEFAULT_COORDS.latitude),
	"x-vercel-ip-longitude":
		process.env.GEO_LON ?? String(DEFAULT_COORDS.longitude),
};

async function staticFile(pathname: string): Promise<Response | null> {
	const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
	for (const candidate of [safe, join(safe, "index.html")]) {
		const file = Bun.file(join(STATIC_DIR, candidate));
		if ((await file.exists()) && file.size > 0) {
			const headers: Record<string, string> = {};
			if (pathname.startsWith("/_astro/")) {
				headers["cache-control"] = "public, max-age=31536000, immutable";
			}
			return new Response(file, { headers });
		}
	}
	return null;
}

Bun.serve({
	port,
	async fetch(request) {
		const { pathname } = new URL(request.url);
		const hit = await staticFile(pathname);
		if (hit) return hit;
		const headers = new Headers(request.headers);
		for (const [name, value] of Object.entries(GEO_HEADERS)) {
			if (!headers.has(name)) headers.set(name, value);
		}
		return handler.fetch(new Request(request, { headers }));
	},
});

console.log(`Serving build at http://localhost:${port}`);
