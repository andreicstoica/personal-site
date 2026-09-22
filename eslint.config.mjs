// @ts-check
// @shadcn/lint is registered and not enforcing rules yet.
// Add rules here: https://github.com/shadcn-ui/lint/blob/main/README.md#rules
// Svelte templates are only read by ESLint (not Oxlint). Astro markup is out of scope.

import { plugin as shadcn } from "@shadcn/lint";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import svelteParser from "svelte-eslint-parser";

export default defineConfig([
	{
		ignores: ["dist/**", "node_modules/**", ".astro/**", "rag/**"],
	},
	{
		files: ["**/*.svelte"],
		languageOptions: {
			parser: svelteParser,
			parserOptions: { parser: tsParser },
		},
		plugins: { shadcn },
		rules: {},
	},
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parser: tsParser,
		},
		plugins: { shadcn },
		rules: {},
	},
]);
