import { afterEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseChatApiSuccess } from "./chatTypes";
import { starterPrompts } from "./guidePrompts";
import { resolveGuideTurn } from "./guideReply";
import { completeChat } from "./inference";
import {
	authHeaders,
	guideModelEnabled,
	resolveInference,
} from "./inferenceConfig";
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

	test("every starter prompt finds the note that answers it", () => {
		const sections = corpus();
		const answering = ["Canon", "Writing", "Colophon"];
		starterPrompts.forEach((prompt, index) => {
			const titles = selectMemory(sections, prompt.text).map((s) => s.title);
			expect(titles).toContain(answering[index] ?? "");
		});
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
	test("notes stay to the first sentence", () => {
		const turn = resolveGuideTurn({
			message: "what is refract",
			sections: selectMemory(corpus(), "what is refract"),
			modelText: null,
			notesReason: "unconfigured",
		});
		expect(turn.response).toBe(
			"The journal that collaborates with you to go deeper.",
		);
		expect(turn.response).not.toContain("He describes");
	});

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

	test("follows the page the model points to for the rest", () => {
		const turn = resolveGuideTurn({
			message: "who do you look up to",
			sections: [],
			modelText:
				"Le Guin and Caro. The rest is on my canon.\n[[navigate:/canon]]",
			notesReason: null,
		});
		expect(turn.mode).toBe("model");
		expect(turn.response).toBe("Le Guin and Caro. The rest is on my canon.");
		expect(turn.action).toEqual({
			kind: "navigate",
			href: "/canon",
			label: "Canon",
			follow: true,
		});
	});

	test("a page named only in the question stays a link", () => {
		const turn = resolveGuideTurn({
			message: "what is refract",
			sections: [],
			modelText: "Refract is a journal.",
			notesReason: null,
		});
		expect(turn.action).toMatchObject({
			href: "/projects/refract",
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
	test("hosted sends a bearer token to an OpenAI-compatible base", () => {
		const resolved = resolveInference({
			MODEL_PROVIDER: "hosted",
			MODEL_BASE_URL: "https://api.example/v1/",
			MODEL_API_KEY: "sk_test",
			MODEL_ID: "flash",
		});
		expect(resolved).toMatchObject({
			kind: "ready",
			provider: "hosted",
			baseUrl: "https://api.example/v1",
			model: "flash",
		});
		if (resolved.kind !== "ready") return;
		expect(authHeaders(resolved.auth)).toEqual({
			Authorization: "Bearer sk_test",
		});
	});

	test("model calls stay off unless GUIDE_MODEL=on", () => {
		expect(guideModelEnabled({})).toBe(false);
		expect(guideModelEnabled({ GUIDE_MODEL: "hosted" })).toBe(false);
		expect(guideModelEnabled({ MODEL_PROVIDER: "hosted" })).toBe(false);
		expect(guideModelEnabled({ GUIDE_MODEL: "on" })).toBe(true);
	});

	test("hosted without a key or model stays unconfigured", () => {
		const base = { MODEL_PROVIDER: "hosted", MODEL_BASE_URL: "https://x/v1" };
		expect(resolveInference({ ...base, MODEL_ID: "flash" })).toMatchObject({
			kind: "unconfigured",
			provider: "hosted",
		});
		expect(resolveInference({ ...base, MODEL_API_KEY: "k" })).toMatchObject({
			kind: "unconfigured",
			provider: "hosted",
		});
	});

	test("the retired hf provider is unknown, not a silent fallback", () => {
		expect(resolveInference({ MODEL_PROVIDER: "hf" })).toMatchObject({
			kind: "unconfigured",
			provider: "unknown",
		});
	});

	test("unknown providers do not fall through to local", () => {
		expect(resolveInference({ MODEL_PROVIDER: "together" }).kind).toBe(
			"unconfigured",
		);
	});
});

describe("model outages", () => {
	const realFetch = globalThis.fetch;
	afterEach(() => {
		globalThis.fetch = realFetch;
	});

	const resolved = {
		kind: "ready",
		provider: "hosted",
		baseUrl: "https://api.example/v1",
		model: "m",
		auth: { kind: "none" },
	} as const;

	async function outageFor(status: number) {
		globalThis.fetch = Object.assign(
			async () => new Response("{}", { status }),
			{ preconnect: realFetch.preconnect },
		);
		const completion = await completeChat({
			resolved,
			messages: [{ role: "user", content: "hi" }],
			temperature: 0,
			maxTokens: 8,
		});
		return completion.kind === "down" ? completion.outage : null;
	}

	test("402 is out of credit, 429 is busy, anything else is an error", async () => {
		expect(await outageFor(402)).toBe("budget");
		expect(await outageFor(429)).toBe("busy");
		expect(await outageFor(500)).toBe("error");
	});

	test("an out-of-credit turn still answers from notes and says why", () => {
		const turn = resolveGuideTurn({
			message: "what is refract",
			sections: selectMemory(corpus(), "what is refract"),
			modelText: null,
			notesReason: "budget",
		});
		expect(turn.mode).toBe("notes");
		expect(turn.response).toBe(
			"The journal that collaborates with you to go deeper.",
		);
		expect(turn.notice).toContain("out of credit");
	});

	test("a notes-only site shows no outage notice", () => {
		const turn = resolveGuideTurn({
			message: "what is refract",
			sections: [],
			modelText: null,
			notesReason: "unconfigured",
		});
		expect(turn.notice).toBeUndefined();
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

	test("keeps a notice and rejects a non-string one", () => {
		const base = { response: "hi", mode: "notes", sources: [] };
		const action = { kind: "none" };
		expect(
			parseChatApiSuccess({ ...base, action, notice: "out" })?.notice,
		).toBe("out");
		expect(parseChatApiSuccess({ ...base, action, notice: 1 })).toBeNull();
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
