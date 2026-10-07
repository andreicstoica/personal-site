import { describe, expect, test } from "bun:test";
import { type GuideUIMessage, parseStoredMessages } from "./chatTypes";
import { explorePrompts } from "./guidePrompts";
import {
	groupTurns,
	pageCard,
	postCard,
	replyView,
	traceSummary,
} from "./guideTurn";

const canon = {
	href: "/canon",
	label: "Canon",
	section: { id: "movies", label: "Movies" },
};

function reply(parts: GuideUIMessage["parts"]): GuideUIMessage {
	return { id: "a1", role: "assistant", parts };
}

describe("reply view", () => {
	test("the trace runs in order: context, reasoning, tools, then the reply", () => {
		const message: GuideUIMessage = {
			...reply([
				{
					type: "data-context",
					data: { notes: 28, posts: 25, sections: 32, page: "Home" },
				},
				{ type: "step-start" },
				{ type: "reasoning", text: "Movies are on the canon.", state: "done" },
				{
					type: "tool-open_page",
					toolCallId: "p1",
					state: "output-available",
					input: { path: "/canon", section: "movies" },
					output: canon,
				},
				{
					type: "tool-read_post",
					toolCallId: "r1",
					state: "output-available",
					input: { slug: "dyson" },
					output: { title: "Dyson", url: "https://blog.andrei.bio/p/dyson" },
				},
				{ type: "text", text: "Three films.", state: "done" },
				{ type: "data-notice", data: { text: "From notes." } },
			]),
			metadata: {
				model: "gpt-oss-120b",
				ms: 1800,
				inputTokens: 10486,
				cachedTokens: 10368,
				outputTokens: 204,
			},
		};
		const view = replyView(message);
		expect(view.trace.map((step) => [step.label, step.tool ?? null])).toEqual([
			["Loaded 28 notes, 25 posts, and the site map", null],
			["Thought", null],
			["Chose Canon at Movies", "open_page"],
			["Read Dyson", "read_post"],
			["Wrote the reply", null],
		]);
		expect(view.trace[1]?.detail).toBe("Movies are on the canon.");
		expect(view.trace[2]?.href).toBe("/canon#movies");
		expect(view.trace[3]?.href).toBe("https://blog.andrei.bio/p/dyson");
		expect(view.trace.at(-1)?.data).toBe(
			"gpt-oss-120b · 10.5K tokens in (10.4K cached) · 204 out",
		);
		expect(view.text).toBe("Three films.");
		expect(view.notices).toEqual(["From notes."]);
		expect(view.page?.toolCallId).toBe("p1");
		expect(view.posts.map((post) => post.title)).toEqual(["Dyson"]);
		expect(traceSummary(message, view.trace, false)).toBe("Worked for 1.8s");
	});

	test("while live, the header names the step in progress", () => {
		const message = reply([
			{ type: "reasoning", text: "", state: "streaming" },
		]);
		const view = replyView(message);
		expect(view.trace).toEqual([
			{ icon: "lightbulb", label: "Thinking", status: "active" },
		]);
		const reading = replyView(
			reply([
				{
					type: "tool-read_post",
					toolCallId: "r1",
					state: "input-available",
					input: { slug: "dyson" },
				},
			]),
		);
		expect(traceSummary(null, reading.trace, true)).toBe("Reading a post");
	});

	test("a post search is a trace step, not a source card", () => {
		const searched = replyView(
			reply([
				{
					type: "tool-search_posts",
					toolCallId: "s1",
					state: "output-available",
					input: { query: "LoRA adapters" },
					output: {
						hits: [
							{
								slug: "bot-drei",
								title: "The Making of bot-drei",
								url: "https://blog.andrei.bio/p/the-making-of-bot-drei",
								excerpt: "LoRA freezes most weights.",
							},
						],
					},
				},
			]),
		);
		expect(searched.trace).toEqual([
			{
				icon: "search",
				label: "Searched posts for “LoRA adapters”",
				status: "complete",
				tool: "search_posts",
				detail: "The Making of bot-drei",
			},
		]);
		expect(searched.posts).toEqual([]);
		const searching = replyView(
			reply([
				{
					type: "tool-search_posts",
					toolCallId: "s1",
					state: "input-available",
					input: { query: "LoRA" },
				},
			]),
		);
		expect(traceSummary(null, searching.trace, true)).toBe("Searching posts");
	});

	test("a notes answer has no trace", () => {
		const view = replyView(
			reply([{ type: "text", text: "From my notes.", state: "done" }]),
		);
		expect(view.trace.map((step) => step.label)).toEqual(["Wrote the reply"]);
	});
});

describe("continue exploring", () => {
	test("follows the topic, tops up, and skips what was asked", () => {
		const picked = explorePrompts("/canon", ["Which architects do you like?"]);
		expect(picked.map((prompt) => prompt.text)).toEqual([
			"What books shaped you?",
			"Which photographers do you follow?",
			"Who do you look up to?",
		]);
		expect(
			explorePrompts("/projects/refract", []).map((prompt) => prompt.text),
		).toContain("What other projects have you built?");
	});
});

describe("source cards", () => {
	const at = (pagePath: string) => ({ moved: undefined, pagePath });

	test("a page card shows the move, then where it landed", () => {
		expect(pageCard(canon, { ...at("/"), pending: true })).toMatchObject({
			title: "Canon",
			meta: "Opening at Movies",
			active: true,
			external: false,
		});
		expect(
			pageCard(canon, { pending: false, moved: "opened", pagePath: "/canon" }),
		).toMatchObject({ meta: "Opened at Movies", href: "/canon#movies" });
	});

	test("on the same page it scrolls instead of opening", () => {
		expect(pageCard(canon, { ...at("/canon"), pending: true })?.meta).toBe(
			"Scrolling to Movies",
		);
		expect(
			pageCard(canon, { pending: false, moved: "scrolled", pagePath: "/canon" })
				?.meta,
		).toBe("Scrolled to Movies");
	});

	test("a cancelled move says where it goes, and nothing points at here", () => {
		expect(pageCard(canon, { ...at("/"), pending: false })?.meta).toBe(
			"Movies · andrei.bio/canon",
		);
		const page = { href: "/canon", label: "Canon" };
		expect(pageCard(page, { ...at("/canon"), pending: false })).toBeNull();
	});

	test("a post card opens the blog in a new tab with its date", () => {
		expect(
			postCard({
				title: "2025 Favorites",
				url: "https://blog.andrei.bio/p/2025-favorites",
				date: "2025-12-21",
			}),
		).toEqual({
			href: "https://blog.andrei.bio/p/2025-favorites",
			title: "2025 Favorites",
			meta: "blog.andrei.bio · Dec 21, 2025",
			active: false,
			external: true,
		});
	});
});

test("turns pair each question with the reply under it", () => {
	const user = (id: string): GuideUIMessage => ({
		id,
		role: "user",
		parts: [{ type: "text", text: id }],
	});
	const turns = groupTurns([user("q1"), reply([]), user("q2")]);
	expect(turns.map((turn) => [turn.question?.id, turn.reply?.id])).toEqual([
		["q1", "a1"],
		["q2", undefined],
	]);
});

describe("stored thread", () => {
	test("keeps finished parts and reasoning, drops cut-off calls, post bodies, and excerpts", () => {
		const restored = parseStoredMessages([
			{
				id: "a1",
				role: "assistant",
				parts: [
					{ type: "reasoning", text: "Canon first.", state: "streaming" },
					{
						type: "tool-read_post",
						toolCallId: "r1",
						state: "output-available",
						input: { slug: "dyson" },
						output: { title: "Dyson", url: "https://x.test", text: "long" },
					},
					{
						type: "tool-search_posts",
						toolCallId: "s1",
						state: "output-available",
						input: { query: "lora" },
						output: {
							hits: [
								{
									slug: "bot-drei",
									title: "bot-drei",
									url: "https://x.test/b",
									excerpt: "long",
								},
							],
						},
					},
					{
						type: "tool-open_page",
						toolCallId: "p2",
						state: "input-available",
						input: { path: "/canon" },
					},
					{ type: "text", text: "Hi.", state: "streaming" },
				],
			},
		]);
		expect(restored?.[0]?.parts).toEqual([
			{ type: "reasoning", text: "Canon first.", state: "done" },
			{
				type: "tool-read_post",
				toolCallId: "r1",
				state: "output-available",
				input: { slug: "dyson" },
				output: { title: "Dyson", url: "https://x.test" },
			},
			{
				type: "tool-search_posts",
				toolCallId: "s1",
				state: "output-available",
				input: { query: "lora" },
				output: {
					hits: [
						{ slug: "bot-drei", title: "bot-drei", url: "https://x.test/b" },
					],
				},
			},
			{ type: "text", text: "Hi.", state: "done" },
		]);
	});

	test("a malformed message drops the whole thread", () => {
		expect(
			parseStoredMessages([{ id: 1, role: "user", parts: [] }]),
		).toBeNull();
		expect(parseStoredMessages({ messages: [] })).toBeNull();
	});
});
