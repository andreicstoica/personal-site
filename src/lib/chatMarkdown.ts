import { Marked } from "marked";

const ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

/** Site paths, https, and mailto only. `//host` is protocol-relative, so it
 *  counts as external and must not pass as a site path. */
function safeHref(href: string): string | null {
	if (href.startsWith("/") && !href.startsWith("//")) return href;
	if (/^(https:|mailto:)/i.test(href)) return href;
	return null;
}

// Model output is untrusted: raw HTML renders as text, images render as their
// alt text, and links keep only safe targets. A separate instance keeps these
// rules out of the site's own markdown renderer.
const chatMarked = new Marked({
	gfm: true,
	breaks: true,
	renderer: {
		html({ text }) {
			return escapeHtml(text);
		},
		image({ text }) {
			return escapeHtml(text);
		},
		link({ href, tokens }) {
			const label = this.parser.parseInline(tokens);
			const safe = safeHref(href);
			if (!safe) return label;
			const external = !safe.startsWith("/");
			const attrs = external
				? ' target="_blank" rel="noopener noreferrer"'
				: "";
			return `<a href="${escapeHtml(safe)}" class="markdown-link"${attrs}>${label}</a>`;
		},
	},
});

export function renderChatMarkdown(markdown: string): string {
	const html = chatMarked.parse(markdown, { async: false });
	if (typeof html !== "string")
		throw new Error("Expected synchronous markdown");
	return html;
}
