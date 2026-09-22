import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseChatApiSuccess } from "./chatTypes";
import { resolveGuideTurn } from "./guideReply";
import { authHeaders, resolveInference } from "./inferenceConfig";
import {
	extractNavigateHref,
	isNavigationIntent,
	matchRoute,
	parseMemoryMarkdown,
	routeByHref,
	selectMemory,
} from "./memorySelect";

const memoryDir = path.resolve("src/content/memory");

function corpus() {
	return readdirSync(memoryDir)
		.filter((name) => name.endsWith(".md"))
		.flatMap((name) =>
			parseMemoryMarkdown(readFileSync(path.join(memoryDir, name), "utf8")),
		);
}

describe("memory files", () => {
	test("every section parses and only links to real routes", () => {
		const sections = corpus();
		expect(sections.length).toBeGreaterThan(10);
		for (const section of sections) {
			expect(section.title.length).toBeGreaterThan(0);
			expect(section.body.length).toBeGreaterThan(0);
			if (section.route)
				expect(routeByHref(section.route)?.href).toBe(section.route);
		}
	});

	test("project questions hit that project first", () => {
		const sections = corpus();
		expect(selectMemory(sections, "what is refract")[0]?.title).toBe("Refract");
		expect(selectMemory(sections, "tell me about courtly")[0]?.title).toBe(
			"Courtly",
		);
		expect(selectMemory(sections, "fact checking at NBC")[0]?.title).toBe(
			"NBCUniversal",
		);
		expect(selectMemory(sections, "hi")).toEqual([]);
	});
});

describe("routes", () => {
	test("matches a single page and refuses ties", () => {
		expect(matchRoute("show me courtly")?.href).toBe("/projects/courtly");
		expect(matchRoute("open the canon")?.href).toBe("/canon");
		expect(matchRoute("hello there")).toBeNull();
		expect(isNavigationIntent("please show me Refract")).toBe(true);
		expect(isNavigationIntent("what is refract")).toBe(false);
	});

	test("strips a navigate token only when the path is on the site", () => {
		const allowed = extractNavigateHref(
			"Opening it.\n[[navigate:/projects/refract]]",
		);
		expect(allowed.href).toBe("/projects/refract");
		expect(allowed.text).toBe("Opening it.");
		const rejected = extractNavigateHref("No.\n[[navigate:https://evil.test]]");
		expect(rejected.href).toBeNull();
		expect(rejected.text).toContain("No.");
	});
});

describe("guide turn", () => {
	test("follows when the visitor asks to open a page, even without the model", () => {
		const turn = resolveGuideTurn({
			message: "show me courtly",
			sections: selectMemory(corpus(), "show me courtly"),
			modelText: null,
			notesReason: "unconfigured",
		});
		expect(turn.mode).toBe("notes");
		expect(turn.action).toEqual({
			kind: "navigate",
			href: "/projects/courtly",
			label: "Courtly",
			follow: true,
		});
	});

	test("names a project without leaving the page", () => {
		const turn = resolveGuideTurn({
			message: "what is refract",
			sections: [],
			modelText: "Refract is a journal. [[navigate:/projects/refract]]",
			notesReason: null,
		});
		expect(turn.mode).toBe("model");
		expect(turn.response).toBe("Refract is a journal.");
		expect(turn.action).toEqual({
			kind: "navigate",
			href: "/projects/refract",
			label: "Refract",
			follow: false,
		});
	});

	test("prefers the page the visitor named over a conflicting model path", () => {
		const turn = resolveGuideTurn({
			message: "show me blob game",
			sections: [],
			modelText: "Sure.\n[[navigate:/about]]",
			notesReason: null,
		});
		expect(turn.action).toMatchObject({
			href: "/projects/blob-game",
			follow: true,
		});
	});
});

describe("inference config", () => {
	test("hugging face sends a bearer token", () => {
		const resolved = resolveInference({
			MODEL_PROVIDER: "hf",
			HF_API_URL: "https://hf.example/",
			HF_API_KEY: "hf_test",
		});
		expect(resolved.kind).toBe("ready");
		if (resolved.kind !== "ready") return;
		expect(resolved.provider).toBe("hf");
		expect(authHeaders(resolved.auth)).toEqual({
			Authorization: "Bearer hf_test",
		});
	});

	test("modal is only a comment, not a provider", () => {
		expect(resolveInference({ MODEL_PROVIDER: "modal" }).kind).toBe(
			"unconfigured",
		);
	});

	test("hugging face without a key stays unconfigured", () => {
		const resolved = resolveInference({
			MODEL_PROVIDER: "hf",
			HF_API_URL: "https://hf.example",
		});
		expect(resolved).toMatchObject({ kind: "unconfigured", provider: "hf" });
	});

	test("unknown providers do not fall through to local", () => {
		expect(resolveInference({ MODEL_PROVIDER: "together" }).kind).toBe(
			"unconfigured",
		);
	});
});

describe("chat payload", () => {
	test("rejects a navigate action missing follow", () => {
		expect(
			parseChatApiSuccess({
				response: "hi",
				mode: "notes",
				sources: [],
				action: { kind: "navigate", href: "/", label: "Home" },
			}),
		).toBeNull();
	});
});

test("markdown sections keep a heading route", () => {
	const sections = parseMemoryMarkdown(`---
id: projects
title: Projects
route: /
---

Overview of the work.

## Refract
route: /projects/refract

A journal.
`);
	expect(sections.map((section) => section.title)).toEqual([
		"Projects",
		"Refract",
	]);
	expect(sections[1]?.route).toBe("/projects/refract");
	expect(sections[1]?.body).toBe("A journal.");
});
