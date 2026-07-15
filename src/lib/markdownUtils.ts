// Parse markdown content to extract sections by headers
import { iconSvg } from "../icons/pixelarticons";

function formatMarkdownLink(
	_match: string,
	text: string,
	href: string,
): string {
	const isExternal = href.startsWith("http");
	const externalAttrs = isExternal
		? ' target="_blank" rel="noopener noreferrer"'
		: "";
	const linkIcon = isExternal ? iconSvg("external-link", "inline-icon") : "";

	return `<a href="${href}" class="markdown-link"${externalAttrs}>${text}${linkIcon}</a>`;
}
export function parseMarkdownContent(
	content: string,
): { title: string; content: string }[] {
	// Split by # headers
	const sections = content.split(/^# /m).filter(Boolean);
	return sections.map((section) => {
		const lines = section.trim().split("\n");
		const sectionTitle = lines[0];
		const remainingLines = lines.slice(1).filter((line) => line.trim());

		return {
			title: sectionTitle,
			content: remainingLines.join("\n"),
		};
	});
}

// Apply custom styling to markdown content
export function styleMarkdownContent(content: string): string {
	return content
		.replace(/^## (.+)$/gm, '<h2 class="markdown-h2">$1</h2>')
		.replace(/^### (.+)$/gm, '<h3 class="markdown-h3">$1</h3>')
		.replace(
			/^- (.+)$/gm,
			'<div class="markdown-list-item"><span class="markdown-bullet">*</span> $1</div>',
		)
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, formatMarkdownLink)
		.replace(/^(?!<[hd])(.+)$/gm, '<p class="markdown-p">$1</p>');
}
