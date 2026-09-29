import { describe, expect, test } from "bun:test";
import { nameBreakParts } from "./experienceUi";

describe("nameBreakParts", () => {
	test("breaks after an acronym, never mid-word", () => {
		expect(nameBreakParts("NBCUniversal")).toEqual(["NBC", "Universal"]);
		expect(nameBreakParts("XXcelerate Women")).toEqual(["XXcelerate Women"]);
		expect(nameBreakParts("Warner Bros. Discovery")).toEqual([
			"Warner Bros. Discovery",
		]);
	});
});
