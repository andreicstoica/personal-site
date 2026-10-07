import { describe, expect, test } from "bun:test";
import { type GuideUIMessage, parseStoredMessages } from "./chatTypes";
import { groupTurns, pageStep, replyView } from "./guideTurn";

const canon = {
	href: "/canon",
	label: "Canon",
	section: { id: "movies", label: "Movies" },
};

function reply(parts: GuideUIMessage["parts"]): GuideUIMessage {
	return { id: "a1", role: "assistant", parts };
}

describe("reply view", () => {
	test("tool steps go above the text, the page call below", () => {
		const view = replyView(
			reply([
				{ type: "step-start" },
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
		);
		expect(view.steps.map((step) => step.label)).toEqual(["Read Dyson"]);
		expect(view.text).toBe("Three films.");
		expect(view.notices).toEqual(["From notes."]);
		expect(view.page?.toolCallId).toBe("p1");
	});

	test("a post being read shows as an active step", () => {
		const view = replyView(
			reply([
				{
					type: "tool-read_post",
					toolCallId: "r1",
					state: "input-available",
					input: { slug: "dyson" },
				},
			]),
		);
		expect(view.steps).toEqual([
			{ icon: "article", label: "Reading a post", status: "active" },
		]);
	});
});

describe("page step", () => {
	const at = (pagePath: string) => ({ moved: undefined, pagePath });

	test("pending, then opened, with the section in the link", () => {
		expect(pageStep(canon, { ...at("/"), pending: true })?.label).toBe(
			"Opening Canon",
		);
		expect(
			pageStep(canon, { pending: false, moved: "opened", pagePath: "/canon" }),
		).toMatchObject({
			label: "Opened Canon at Movies",
			href: "/canon#movies",
			status: "complete",
		});
	});

	test("on the same page it scrolls instead of opening", () => {
		expect(pageStep(canon, { ...at("/canon"), pending: true })?.label).toBe(
			"Scrolling to Movies",
		);
		expect(
			pageStep(canon, {
				pending: false,
				moved: "scrolled",
				pagePath: "/canon",
			})?.label,
		).toBe("Scrolled to Movies");
	});

	test("a cancelled follow leaves a link, and nothing points at here", () => {
		expect(pageStep(canon, { ...at("/"), pending: false })?.label).toBe(
			"Go to Movies on Canon",
		);
		const page = { href: "/canon", label: "Canon" };
		expect(pageStep(page, { ...at("/canon"), pending: false })).toBeNull();
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
	test("keeps finished parts, drops cut-off calls and post bodies", () => {
		const restored = parseStoredMessages([
			{
				id: "a1",
				role: "assistant",
				parts: [
					{ type: "reasoning", text: "hidden" },
					{
						type: "tool-read_post",
						toolCallId: "r1",
						state: "output-available",
						input: { slug: "dyson" },
						output: { title: "Dyson", url: "https://x.test", text: "long" },
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
			{
				type: "tool-read_post",
				toolCallId: "r1",
				state: "output-available",
				input: { slug: "dyson" },
				output: { title: "Dyson", url: "https://x.test" },
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
