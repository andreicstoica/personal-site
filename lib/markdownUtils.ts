// Parse markdown content to extract sections by headers
export function parseMarkdownContent(
    content: string
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
        .replace(
            /^## (.+)$/gm,
            '<h2 class="markdown-h2">$1</h2>'
        )
        .replace(
            /### (.+)/g,
            '<h3 class="markdown-h3">$1</h3>'
        )
        .replace(
            /^- (.+)$/gm,
            '<div class="markdown-list-item"><span class="markdown-bullet">*</span> $1</div>'
        )
        .replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" class="markdown-link" target="_blank" rel="noopener">$1</a>'
        )
        .replace(
            /^(?!<[hd])(.+)$/gm,
            '<p class="markdown-p">$1</p>'
        );
} 