// @ts-check

import { plugin as shadcn } from "@shadcn/lint";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import svelteParser from "svelte-eslint-parser";

export default defineConfig([
	{
		ignores: ["dist/**", "node_modules/**", ".astro/**"],
	},
	{
		files: ["src/components/**/*.svelte"],
		languageOptions: {
			parser: svelteParser,
			parserOptions: { parser: tsParser },
		},
		plugins: { shadcn },
		rules: {
			"shadcn/no-raw-colors": "error",
			"shadcn/no-unknown-classes": "error",
		},
	},
]);
