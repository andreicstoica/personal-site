import { describe, expect, test } from "bun:test";
import { parseStream, scoreTurn } from "./guideEval";

const stream = (chunks: object[]) =>
	chunks.map((chunk) => `data: ${JSON.stringify(chunk)}`).join("\n\n");

describe("guide eval", () => {
	test("reads text, tools, pages, scene controls, and usage from a stream", () => {
		const turn = parseStream(
			stream([
				{ type: "tool-input-available", toolName: "open_page" },
				{ type: "tool-output-available", output: { href: "/canon", label: "Canon" } },
				{ type: "text-delta", delta: "He admires " },
				{ type: "text-delta", delta: "Le Guin." },
				{ type: "data-scene", data: { shown: true } },
				{ type: "message-metadata", messageMetadata: { model: "m", inputTokens: 9 } },
			]),
		);
		expect(turn).toMatchObject({
			text: "He admires Le Guin.",
			tools: ["open_page"],
			pages: ["/canon"],
			scene: true,
			inputTokens: 9,
		});
	});

	test("fails a reply that misses a fact, speaks as Andrei, or leaks reasoning", () => {
		const base = { tools: [], pages: [], scene: false };
		const test = { id: "t", kind: "notes", q: "?", facts: [["Contax"]] };
		expect(scoreTurn(test, { ...base, text: "He shoots a Contax G1." }).pass).toBe(true);
		expect(
			scoreTurn(test, { ...base, text: "I shoot a Contax. post.analysisWe have it" })
				.failures,
		).toEqual(["first person", "leaked reasoning"]);
		expect(scoreTurn(test, { ...base, text: "He shoots film." }).failures).toEqual([
			"missing Contax",
		]);
	});
});
