import { defineConfig } from "@playwright/test";

const port = 4322;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
	testDir: "./src/components/__tests__",
	// Keep these tests separate from Bun's unit-test discovery.
	testMatch: "*.pw.ts",
	workers: 1,
	use: { baseURL, reducedMotion: "reduce" },
	webServer: {
		command: "bun scripts/serve-build.ts",
		env: { PORT: String(port), MODEL_ID: "" },
		url: baseURL,
	},
});
