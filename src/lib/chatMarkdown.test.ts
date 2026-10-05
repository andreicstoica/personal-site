import { describe, expect, test } from "bun:test";
import { renderChatMarkdown } from "./chatMarkdown";

describe("chat markdown", () => {
	test("renders emphasis, lists, and line breaks", () => {
		const html = renderChatMarkdown("**Writers**: *Demian*\n\n- one\n- two");
		expect(html).toContain("<strong>Writers</strong>");
		expect(html).toContain("<em>Demian</em>");
		expect(html).toContain("<li>one</li>");
	});

	test("raw HTML from the model renders as text", () => {
		const html = renderChatMarkdown('<img src=x onerror="alert(1)"> hi');
		expect(html).not.toContain("<img");
		expect(html).toContain("&lt;img");
	});

	test("keeps site, https, and mailto links and drops the rest", () => {
		expect(renderChatMarkdown("[canon](/canon)")).toContain('href="/canon"');
		expect(renderChatMarkdown("[x](https://blog.andrei.bio)")).toContain(
			'target="_blank"',
		);
		const scripted = renderChatMarkdown("[x](javascript:alert(1))");
		expect(scripted).not.toContain("href");
		expect(scripted).toContain("x");
		expect(renderChatMarkdown("[x](//evil.test)")).not.toContain("href");
	});

	test("images render as their alt text", () => {
		const html = renderChatMarkdown("![a cat](https://evil.test/x.png)");
		expect(html).not.toContain("<img");
		expect(html).toContain("a cat");
	});
});
