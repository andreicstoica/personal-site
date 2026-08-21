import { pipeline } from "@xenova/transformers";
import fs from "fs";
import path from "path";
import { CHUNK_SIZE, CHUNK_OVERLAP } from "./constants.js";

interface Document {
	id: string;
	text: string;
	metadata?: DocumentMetadata;
}

interface DocumentMetadata {
	type: string;
	title?: string;
	date?: string;
	tags?: string[];
	summary?: string;
	headingPath?: string;
	sourceUrl?: string;
}

let embeddingPipeline: any = null;

export async function buildEmbeddings(text: string): Promise<number[]> {
	if (!embeddingPipeline) {
		embeddingPipeline = await pipeline(
			"feature-extraction",
			"Xenova/all-MiniLM-L6-v2",
		);
	}

	const result = await embeddingPipeline(text, {
		pooling: "mean",
		normalize: true,
	});
	return Array.from(result.data);
}

// Parse YAML frontmatter from markdown content
function parseFrontmatter(content: string): {
	frontmatter: Record<string, string>;
	content: string;
} {
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
	const match = content.match(frontmatterRegex);

	if (!match || match[1] === undefined || match[2] === undefined) {
		return { frontmatter: {}, content };
	}

	try {
		// Simple YAML parsing for basic key-value pairs
		const frontmatter: Record<string, string> = {};
		const lines = match[1].split('\n');
		for (const line of lines) {
			const colonIndex = line.indexOf(':');
			if (colonIndex > 0) {
				const key = line.slice(0, colonIndex).trim();
				const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
				if (key && value) {
					frontmatter[key] = value;
				}
			}
		}
		return { frontmatter, content: match[2] };
	} catch {
		return { frontmatter: {}, content };
	}
}

// Extract heading hierarchy from markdown content
function extractHeadings(content: string): string[] {
	const headingRegex = /^(#{1,6})\s+(.+)$/gm;
	const headings: string[] = [];
	for (const headingMatch of content.matchAll(headingRegex)) {
		const marks = headingMatch[1];
		const text = headingMatch[2];
		if (!marks || !text) continue;
		headings.push(`${'  '.repeat(marks.length - 1)}${text.trim()}`);
	}

	return headings;
}

// Extract headings without chunking overhead
function extractHeadingsOnly(content: string): string[] {
	return extractHeadings(content);
}

// Infer document type from filename and content
function inferDocumentType(filename: string, content: string): string {
	const name = filename.toLowerCase();

	if (name.includes('resume')) return 'resume';
	if (name.includes('blog') || name.includes('post') || /\d{4}-\d{2}-\d{2}/.test(name)) return 'blog';
	if (name.includes('canon') || name.includes('essay') || name.includes('philosophy')) return 'essay';
	if (name.includes('project') || name.includes('work')) return 'project';

	// Check content for indicators
	if (content.includes('Professional Experience') || content.includes('Work Experience')) return 'resume';
	if (content.includes('##') && content.length > 1000) return 'blog';

	return 'document';
}

// Split text into chunks with heading-aware boundaries
function chunkTextWithHeadings(
	text: string,
	chunkSize: number = CHUNK_SIZE,
	overlap: number = CHUNK_OVERLAP,
): { chunks: string[]; headings: string[] } {
	const headings = extractHeadings(text);
	const chunks: string[] = [];
	let start = 0;

	// Convert token-based sizes to character-based estimates (roughly 4 chars per token)
	const charChunkSize = chunkSize * 4;
	const charOverlap = overlap * 4;

	while (start < text.length) {
		let end = start + charChunkSize;

		// Try to break at semantic boundaries (headings, paragraphs, sentences)
		if (end < text.length) {
			// Look for heading boundaries first
			const headingMatch = text.slice(start, end).match(/\n(#{1,6})\s+/g);
			if (headingMatch) {
				const lastHeading = headingMatch.at(-1);
				if (lastHeading) {
					const headingPos = text.lastIndexOf(lastHeading, end);
					if (headingPos > start + charChunkSize * 0.3) {
						end = headingPos;
					}
				}
			}

			// Fall back to paragraph boundaries
			if (end === start + charChunkSize) {
				const lastParagraph = text.lastIndexOf('\n\n', end);
				if (lastParagraph > start + charChunkSize * 0.5) {
					end = lastParagraph + 2;
				}
			}

			// Final fallback to sentence boundaries
			if (end === start + charChunkSize) {
				const lastPeriod = text.lastIndexOf('.', end);
				const lastNewline = text.lastIndexOf('\n', end);
				const breakPoint = Math.max(lastPeriod, lastNewline);

				if (breakPoint > start + charChunkSize * 0.5) {
					end = breakPoint + 1;
				}
			}
		}

		const chunk = text.slice(start, end).trim();
		if (chunk.length > 0) {
			chunks.push(chunk);
		}

		// Ensure we always advance to prevent infinite loops
		const nextStart = end - charOverlap;
		start = Math.max(nextStart, start + 1);

		// Safety check to prevent infinite loops
		if (start >= text.length) break;
	}

	return { chunks, headings };
}

// Load metadata from sidecar JSON file
function loadSidecarMetadata(filePath: string): any {
	const jsonPath = filePath.replace(/\.(txt|md)$/, '.json');
	try {
		if (fs.existsSync(jsonPath)) {
			return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
		}
	} catch {
		// Ignore JSON parse errors
	}
	return {};
}

// Recursively gather all .txt/.md files in data/ and chunk them with metadata
export function loadDocuments(dataDir: string): Document[] {
	const docs: Document[] = [];

	function recurse(dir: string) {
		for (const file of fs.readdirSync(dir)) {
			const full = path.join(dir, file);
			const stat = fs.statSync(full);
			if (stat.isDirectory()) recurse(full);
			else if (file.endsWith(".txt") || file.endsWith(".md")) {
				const content = fs.readFileSync(full, "utf8");
				const filename = path.basename(file, path.extname(file));
				const relativePath = full.replace(dataDir, "");

				// Parse frontmatter if present
				const { frontmatter, content: textContent } = parseFrontmatter(content);

				// Load sidecar metadata
				const sidecarMetadata = loadSidecarMetadata(full);

				// Combine metadata sources (sidecar overrides frontmatter)
				const metadata: DocumentMetadata = {
					type: sidecarMetadata.type || frontmatter.type || inferDocumentType(filename, textContent),
					title: sidecarMetadata.title || frontmatter.title || filename,
					date: sidecarMetadata.date || frontmatter.date,
					tags: sidecarMetadata.tags || frontmatter.tags || [],
					summary: sidecarMetadata.summary || frontmatter.summary,
					sourceUrl: sidecarMetadata.sourceUrl || frontmatter.sourceUrl
				};

				const headings = extractHeadingsOnly(textContent);
				metadata.headingPath = headings.join(' > ');

				// Don't chunk resume - keep as single document
				if (metadata.type === "resume") {
					docs.push({
						id: relativePath,
						text: textContent,
						metadata
					});
				} else {
					// Use larger chunks for projects/experience type
					const chunkSize = (metadata.type === "projects" || metadata.type === "experience")
						? 1000  // Larger chunks for structured portfolio data
						: CHUNK_SIZE;  // 500 for everything else
					const chunkOverlap = (metadata.type === "projects" || metadata.type === "experience")
						? 200  // Proportional overlap
						: CHUNK_OVERLAP;  // 100 for everything else

					// Chunk other content with heading awareness
					const { chunks } = chunkTextWithHeadings(textContent, chunkSize, chunkOverlap);
					chunks.forEach((chunk, index) => {
						const chunkId = chunks.length > 1
							? `${relativePath}#chunk-${index + 1}`
							: relativePath;

						// Create chunk-specific metadata
						const chunkMetadata = { ...metadata };
						if (chunks.length > 1) {
							chunkMetadata.headingPath = `${metadata.headingPath} > Chunk ${index + 1}`;
						}

						docs.push({
							id: chunkId,
							text: chunk,
							metadata: chunkMetadata
						});
					});
				}
			}
		}
	}

	recurse(dataDir);
	return docs;
}
