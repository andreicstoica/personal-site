import { marked } from "marked";
import { iconSvg } from "../icons/pixelarticons";

const renderer = new marked.Renderer();
renderer.link = ({ href, title, text }) => {
	const isExternal = href?.startsWith("http") ?? false;
	const externalAttrs = isExternal
		? ' target="_blank" rel="noopener noreferrer"'
		: "";
	const linkIcon = isExternal ? iconSvg("external-link", "inline-icon") : "";

	return `<a href="${href}" class="markdown-link"${externalAttrs}${title ? ` title="${title}"` : ""}>${text}${linkIcon}</a>`;
};

marked.use({ renderer });

export function renderMarkdown(content: string): string {
	return marked.parse(content) as string;
}
