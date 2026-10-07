import { afterEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { APICallError } from "ai";
import { guideModel, outageOf } from "./guideModel";
import { starterPrompts } from "./guidePrompts";
import {
	buildSystemPrompt,
	notesOpenPage,
	notesText,
	OUTAGE_NOTICE,
} from "./guideReply";
import {
	createGuideSearch,
	noteDocs,
	postDocs,
	postIndex,
} from "./guideSearch";
import { completeChat } from "./inference";
import {
	authHeaders,
	guideModelEnabled,
	resolveInference,
} from "./inferenceConfig";
import {
	isNavigationIntent,
	matchRoute,
	parseMemoryMarkdown,
	routeByHref,
} from "./memorySelect";
import {
	experienceSections,
	markdownSections,
	resolveOpenPage,
	sectionId,
} from "./siteSections";

const memoryDir = path.resolve("src/content/memory");
const ragDir = path.resolve("rag/data");

function corpus() {
	return readdirSync(memoryDir)
		.filter((name) => name.endsWith(".md"))
		.flatMap((name) =>
			parseMemoryMarkdown(readFileSync(path.join(memoryDir, name), "utf8")),
		);
}

function posts() {
	return postDocs(
		readdirSync(ragDir)
			.filter((name) => name.endsWith(".json"))
			.map((name) => {
				const textPath = path.join(ragDir, name.replace(/\.json$/, ".txt"));
				let text: string | undefined;
				try {
					text = readFileSync(textPath, "utf8");
				} catch {
					text = undefined;
				}
				return {
					slug: name.replace(/\.json$/, ""),
					meta: JSON.parse(readFileSync(path.join(ragDir, name), "utf8")),
					text,
				};
			}),
	);
}

const search = createGuideSearch([...noteDocs(corpus()), ...posts()]);

function pageBody(slug: string): string {
	return readFileSync(
		path.resolve(`src/content/pages/${slug}.md`),
		"utf8",
	).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
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
		const answering = ["Canon", "Writing", "Colophon"];
		starterPrompts.forEach((prompt, index) => {
			const titles = search.search(prompt.text).map((hit) => hit.title);
			expect(titles).toContain(answering[index] ?? "");
		});
	});

	test("project questions hit that project first", () => {
		expect(search.search("what is refract")[0]?.title).toBe("Refract");
		expect(search.search("tell me about courtly")[0]?.title).toBe("Courtly");
		expect(search.search("hi")).toEqual([]);
	});
});

describe("posts", () => {
	test("the post list is newest first, with blog URLs and slugs", () => {
		const list = postIndex(posts());
		expect(list.length).toBeGreaterThan(15);
		const dated = list.filter((post) => post.date).map((post) => post.date);
		expect([...dated].sort().reverse()).toEqual(dated);
		for (const post of list) {
			expect(post.url?.startsWith("https://blog.andrei.bio/")).toBe(true);
			expect(post.slug).toBeTruthy();
		}
	});

	test("the prompt carries every note and post, with the page last", () => {
		const notes = corpus();
		const list = postIndex(posts());
		const prompt = buildSystemPrompt({
			notes,
			posts: list,
			sectionsByPath: { "/canon": markdownSections(pageBody("canon")) },
			viewing: routeByHref("/canon"),
		});
		for (const note of notes) expect(prompt).toContain(`## ${note.title}`);
		expect(prompt).toContain(`- ${list[0]?.slug}: ${list[0]?.title}`);
		expect(prompt).toContain("/canon — Canon. Sections: writers, bloggers");
		expect(prompt.trimEnd().endsWith('"This page" means that page.')).toBe(
			true,
		);
	});

	test("a post body is searchable and cites its URL", () => {
		const hit = search
			.search("dyson engineers company")
			.find((result) => result.url);
		expect(hit?.url).toContain("dyson");
		expect(hit?.text?.length).toBeGreaterThan(0);
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
});

describe("notes answers", () => {
	test("notes stay to the first sentence", () => {
		const text = notesText("what is refract", search.search("what is refract"));
		expect(text).toBe("The journal that collaborates with you to go deeper.");
	});

	test("only an explicit request opens a page without the model", () => {
		expect(notesOpenPage("show me courtly")).toEqual({
			href: "/projects/courtly",
			label: "Courtly",
		});
		expect(notesOpenPage("what is refract")).toBeNull();
	});
});

describe("page sections", () => {
	test("canon sections match the rendered section ids", () => {
		const sections = markdownSections(pageBody("canon"));
		expect(sections.map((section) => section.id)).toContain("non-fiction");
		expect(sections.find((section) => section.id === "youtube")?.label).toBe(
			"YouTube",
		);
	});

	test("fitness headings use Astro's own heading ids", () => {
		const ids = [
			...markdownSections(pageBody("race")),
			...markdownSections(pageBody("outdoors")),
		].map((section) => section.id);
		expect(ids).toEqual(["running", "outdoors"]);
	});

	test("experience rows have unique ids", () => {
		const ids = experienceSections().map((section) => section.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids).toContain(`row-${sectionId("Liftoff")}`);
	});

	test("open_page takes a section by id or label and drops an unknown one", () => {
		const byPath = { "/canon": markdownSections(pageBody("canon")) };
		expect(resolveOpenPage("/canon", "Movies", byPath)?.section).toEqual({
			id: "movies",
			label: "Movies",
		});
		expect(resolveOpenPage("/canon", "podcasts", byPath)).toEqual({
			href: "/canon",
			label: "Canon",
		});
		expect(resolveOpenPage("/nope", undefined, byPath)).toBeNull();
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

	test("SDK errors map the same way as raw responses", () => {
		const error = (statusCode: number) =>
			new APICallError({
				message: "x",
				url: "https://api.example/v1/chat/completions",
				requestBodyValues: {},
				statusCode,
			});
		expect(outageOf(error(402))).toBe("budget");
		expect(outageOf(error(429))).toBe("busy");
		expect(outageOf(new Error("socket hang up"))).toBe("error");
		expect(OUTAGE_NOTICE.budget).toContain("out of credit");
	});

	test("the model client takes the resolved host", () => {
		const model = guideModel(resolved);
		expect(typeof model === "object" && model.modelId).toBe("m");
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
