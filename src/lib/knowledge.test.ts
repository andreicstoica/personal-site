import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
	fileStem,
	listField,
	parseKnowledgeFile,
	textField,
} from "./knowledge";

const library = path.resolve("src/content/knowledge");

describe("knowledge files", () => {
	test("frontmatter reads plain text, JSON strings, and JSON lists", () => {
		const file = parseKnowledgeFile(`---
type: post
title: "Small Town America & 'Fear and Loathing': a trip"
resource: https://blog.andrei.bio/p/x
tags: ["travel", "books"]
---

Body text.
`);
		expect(textField(file, "type")).toBe("post");
		expect(textField(file, "title")).toBe(
			"Small Town America & 'Fear and Loathing': a trip",
		);
		expect(textField(file, "resource")).toBe("https://blog.andrei.bio/p/x");
		expect(listField(file, "tags")).toEqual(["travel", "books"]);
		expect(file.body).toBe("Body text.\n");
		expect(fileStem("../content/knowledge/notes/canon.md")).toBe("canon");
	});

	test("every file in the library names its type", () => {
		const files = readdirSync(library, { recursive: true })
			.map(String)
			.filter((name) => name.endsWith(".md"));
		expect(files.length).toBeGreaterThan(30);
		for (const name of files) {
			const file = parseKnowledgeFile(
				readFileSync(path.join(library, name), "utf8"),
			);
			expect([name, textField(file, "type")]).toEqual([
				name,
				expect.stringMatching(/^(index|note|post)$/),
			]);
			if (textField(file, "type") !== "index")
				expect([name, textField(file, "title")]).toEqual([
					name,
					expect.any(String),
				]);
		}
	});
});
