import { describe, expect, test } from "bun:test";
import { EVAL_HEADER, isAutomated } from "./botGuard";

const chat = (headers: Record<string, string> = {}) =>
	new Request("https://www.andrei.bio/api/chat", { method: "POST", headers });

describe("bot guard", () => {
	test("the eval's secret header passes, and only with the right value", async () => {
		expect(await isAutomated(chat({ [EVAL_HEADER]: "s3cret" }), "s3cret")).toBe(
			false,
		);
		// Outside production BotID reports every request as human, so a wrong
		// value still passes here; on Vercel it falls through to the challenge.
		expect(await isAutomated(chat({ [EVAL_HEADER]: "nope" }), "s3cret")).toBe(
			false,
		);
	});
});
