import { type MemorySection, parseMemoryMarkdown } from "./memorySelect";

const files = import.meta.glob("../content/memory/*.md", {
	eager: true,
	query: "?raw",
	import: "default",
});

export function loadMemorySections(): MemorySection[] {
	const sections: MemorySection[] = [];
	for (const raw of Object.values(files)) {
		if (typeof raw !== "string") continue;
		sections.push(...parseMemoryMarkdown(raw));
	}
	return sections;
}
