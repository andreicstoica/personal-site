/** One file of the guide's knowledge library (`src/content/knowledge`),
 *  which follows the Open Knowledge Format: YAML frontmatter, then markdown.
 *  The library keeps each value plain text, a JSON-quoted string, or a JSON
 *  list of strings, all valid YAML, so this small reader covers it without a
 *  YAML dependency. */
export type KnowledgeFile = {
	fields: Record<string, string | string[]>;
	body: string;
};

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function fieldValue(raw: string): string | string[] {
	const text = raw.trim();
	if (text.startsWith('"') || text.startsWith("[")) {
		try {
			const parsed: unknown = JSON.parse(text);
			if (typeof parsed === "string") return parsed;
			if (Array.isArray(parsed))
				return parsed.filter(
					(item): item is string => typeof item === "string",
				);
		} catch {
			// Not JSON after all: keep the text as written.
		}
	}
	return text.replace(/^'(.*)'$/, "$1");
}

export function parseKnowledgeFile(raw: string): KnowledgeFile {
	const match = FRONTMATTER.exec(raw);
	const fields: Record<string, string | string[]> = {};
	for (const line of (match?.[1] ?? "").split(/\r?\n/)) {
		const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
		const key = pair?.[1];
		const value = pair?.[2];
		if (key && value !== undefined) fields[key] = fieldValue(value);
	}
	// The blank line after the frontmatter is layout, not body.
	const body = match ? raw.slice(match[0].length).replace(/^\r?\n/, "") : raw;
	return { fields, body };
}

export function textField(
	file: KnowledgeFile,
	key: string,
): string | undefined {
	const value = file.fields[key];
	return typeof value === "string" && value ? value : undefined;
}

export function listField(file: KnowledgeFile, key: string): string[] {
	const value = file.fields[key];
	return Array.isArray(value) ? value : [];
}

/** A file's identity is its name: `notes/canon.md` is `canon`. */
export function fileStem(path: string): string {
	return path.replace(/^.*\//, "").replace(/\.md$/, "");
}
