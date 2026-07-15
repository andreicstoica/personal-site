import { marked } from 'marked';

const renderer = new marked.Renderer();
renderer.link = ({ href, title, text }) =>
	`<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ""}>${text}</a>`;

marked.use({ renderer });

export function renderMarkdown(content: string): string {
	return marked.parse(content) as string;
}
