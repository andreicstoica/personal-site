import { describe, expect, test } from "bun:test";
import { headBreaker } from "./headBreaker";

const page = (head: string) =>
	`<!doctype html><html><head><meta charset="utf-8">${head}<link rel="stylesheet" href="/a.css"></head><body><main></main></body></html>`;

describe("headBreaker", () => {
	test("passes a head of head elements", () => {
		expect(headBreaker(page("<title>x</title><script>1</script><style>p{}</style>"))).toBeNull();
	});

	test("passes template content, which the parser keeps in the head", () => {
		expect(headBreaker(page("<template><div>ok</div></template>"))).toBeNull();
	});

	test("passes a head closed by <body> with no end tag", () => {
		expect(
			headBreaker('<!doctype html><title>x</title><meta http-equiv="refresh" content="2;url=/"><body><a href="/">Redirecting</a></body>'),
		).toBeNull();
	});

	test("flags a custom element", () => {
		expect(headBreaker(page("<vercel-analytics></vercel-analytics>"))).toBe("<vercel-analytics>");
	});

	test("flags a custom element after script text that mentions </head>", () => {
		expect(
			headBreaker(page('<script>document.write("</head>")</script><vercel-analytics></vercel-analytics>')),
		).toBe("<vercel-analytics>");
	});

	test("flags bare text", () => {
		expect(headBreaker(page("stray"))).toBe('text "stray"');
	});
});
