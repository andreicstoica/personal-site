import { afterEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { APICallError } from "ai";
import { guideCallOptions, guideModel, outageOf, servedBy } from "./guideModel";
import { starterPrompts } from "./guidePrompts";
import {
	buildSystemPrompt,
	notesOpenPage,
	notesText,
	OUTAGE_NOTICE,
} from "./guideReply";
import {
	createGuideSearch,
	createPassageFinder,
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
	isBannerQuestion,
	isNavigationIntent,
	matchRoute,
	parseMemoryMarkdown,
	routeByHref,
} from "./memorySelect";
import {
	experienceSections,
	linkedPage,
	markdownSections,
	namedPage,
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

	test("the scene and passages come last, after an unchanged prefix", () => {
		const base = {
			notes: corpus(),
			posts: postIndex(posts()),
			sectionsByPath: {},
		};
		const plain = buildSystemPrompt(base);
		const passage = {
			title: "3 Weeks In",
			slug: "3-weeks-in",
			url: "https://blog.andrei.bio/p/3-weeks-in",
			date: "2025-06-21",
			text: "Bevel quantified self, built on Apple Watch",
		};
		const full = buildSystemPrompt({
			...base,
			scene: { place: "cascade-forest", weather: "rainy", time: "night" },
			passages: [passage],
		});
		expect(full.startsWith(plain)).toBe(true);
		expect(full.slice(plain.length)).toContain(
			"The banner at the top of the page shows a rainy night at Mt. Hood, OR.",
		);
		expect(full.trimEnd().endsWith(`"${passage.text}"`)).toBe(true);
	});

	test("passages come only for a word that is rare in the posts", () => {
		const find = createPassageFinder(postIndex(posts()));
		const bevel = find("What is Bevel?");
		expect(bevel.map((hit) => hit.slug)).toEqual(["3-weeks-in"]);
		expect(bevel[0]?.text).toContain("Bevel");
		expect(find("Who did you visit in Boulder?")[0]?.slug).toBe(
			"small-town-america",
		);
		// The rare word sits a paragraph away from the answer.
		expect(
			find("Where did you try hosting your fine-tuned model?")[0]?.text,
		).toContain("RunPod");
		expect(find("Who do you look up to?")).toEqual([]);
		expect(find("can I make it rain up there?")).toEqual([]);
	});

	test("a post body is searchable and cites its URL", () => {
		const hit = search
			.search("dyson engineers company")
			.find((result) => result.url);
		expect(hit?.url).toContain("dyson");
		expect(hit?.text?.length).toBeGreaterThan(0);
	});

	test("keyword search finds a passage only a post body holds", () => {
		const postSearch = createGuideSearch(postIndex(posts()));
		const hits = postSearch.search("LoRA adapter matrices", 3);
		expect(hits[0]).toMatchObject({
			slug: "bot-drei",
			title: "The Making of bot-drei",
			url: "https://blog.andrei.bio/p/the-making-of-bot-drei",
		});
		expect(hits[0]?.text).toContain("LoRA");
		for (const hit of hits) expect(hit.slug).toBeTruthy();
		expect(
			postSearch.search("refract journal nudges").every((hit) => hit.url),
		).toBe(true);
	});
});

describe("routes", () => {
	test("matches a single page and refuses ties", () => {
		expect(matchRoute("show me courtly")?.href).toBe("/projects/courtly");
		expect(matchRoute("open the canon")?.href).toBe("/canon");
		expect(matchRoute("hello there")).toBeNull();
		expect(isNavigationIntent("please show me Refract")).toBe(true);
		expect(isNavigationIntent("what is refract")).toBe(false);
		expect(isBannerQuestion("woah this banner is cool!")).toBe(true);
		expect(isBannerQuestion("the weather at the top of home is cool")).toBe(
			true,
		);
		expect(isBannerQuestion("Do you do graphic design?")).toBe(false);
		expect(isBannerQuestion("What is the NYC tech scene like?")).toBe(false);
	});
});

describe("notes answers", () => {
	test("notes stay to the first sentence", () => {
		const text = notesText("what is refract", search.search("what is refract"));
		expect(text).toBe("The journal that collaborates with you to go deeper.");
	});

	test("a post is named, not quoted in Andrei's first person", () => {
		const text = notesText("dyson", [
			{
				title: "Dyson",
				url: "https://blog.andrei.bio/p/dyson",
				text: "I bought a vacuum.",
			},
		]);
		expect(text).toBe("Andrei wrote about this in his post Dyson.");
	});

	test("fixed replies speak about Andrei, never as him", () => {
		const firstPerson = /\b(I|I'm|me|my|we|our)\b/;
		const replies = [
			notesText("hi", []),
			notesText("what is a quasar", []),
			...Object.values(OUTAGE_NOTICE),
		];
		for (const reply of replies) expect(reply).not.toMatch(firstPerson);
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

	test("a reply's first site link becomes the page it points to", () => {
		const byPath = { "/canon": markdownSections(pageBody("canon")) };
		expect(
			linkedPage(
				"More in [2025 Favorites](https://blog.andrei.bio/p/x). More on [Canon](/canon#movies).",
				byPath,
			),
		).toEqual({
			href: "/canon",
			label: "Canon",
			section: { id: "movies", label: "Movies" },
		});
		expect(
			linkedPage("See [Canon](https://www.andrei.bio/canon/).", byPath)?.href,
		).toBe("/canon");
		expect(linkedPage("[nowhere](/not-a-page)", byPath)).toBeNull();
		expect(linkedPage("More on the canon page: [/canon]", byPath)).toBeNull();
	});

	test("a plain pointer line names the page it points to", () => {
		expect(namedPage("Books…\n\nMore on my Canon page.")).toEqual({
			href: "/canon",
			label: "Canon",
		});
		expect(namedPage("The rest is on my Colophon page.")?.href).toBe(
			"/colophon",
		);
		expect(namedPage("More in my Dyson post.")).toBeNull();
		expect(namedPage("The rest is on my Projects page.")).toBeNull();
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

	test("the gateway gets shared reasoning effort and an optional host order", () => {
		const gateway = {
			...resolved,
			baseUrl: "https://ai-gateway.vercel.sh/v1",
			model: "openai/gpt-oss-120b",
		};
		expect(guideCallOptions(gateway, {})).toEqual({ reasoning: "low" });
		expect(
			guideCallOptions(gateway, { MODEL_GATEWAY_ORDER: "groq, cerebras" }),
		).toEqual({
			reasoning: "low",
			providerOptions: { gateway: { order: ["groq", "cerebras"] } },
		});
		expect(guideCallOptions(resolved, {})).toEqual({
			providerOptions: { openaiCompatible: { reasoningEffort: "low" } },
		});
		expect(servedBy({ gateway: { routing: { finalProvider: "groq" } } })).toBe(
			"groq",
		);
		expect(servedBy(undefined)).toBeUndefined();
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
