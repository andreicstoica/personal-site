import { fileStem } from "./knowledge";
import { type MemorySection, parseMemoryMarkdown } from "./memorySelect";

const files = import.meta.glob("../content/knowledge/notes/*.md", {
	eager: true,
	query: "?raw",
	import: "default",
});

export function loadMemorySections(): MemorySection[] {
	const sections: MemorySection[] = [];
	for (const [path, raw] of Object.entries(files)) {
		if (typeof raw !== "string") continue;
		sections.push(...parseMemoryMarkdown(raw, fileStem(path)));
	}
	return sections;
}
