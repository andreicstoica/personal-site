import { getProject } from "./projects";
import type { Project } from "./types";

const PROJECT_REFERENCE_REGEX = /\{\{project:([^}]+)\}\}/g;

interface ParsedProjectReference {
	originalText: string;
	projectId: string;
	project: Project | undefined;
	startIndex: number;
	endIndex: number;
}

export function extractProjectIds(description: string): string[] {
	const ids: string[] = [];
	for (const match of description.matchAll(PROJECT_REFERENCE_REGEX)) {
		const id = match[1];
		if (id) ids.push(id);
	}
	return ids;
}

export function parseProjectReferences(
	description: string,
): ParsedProjectReference[] {
	const references: ParsedProjectReference[] = [];

	for (const match of description.matchAll(PROJECT_REFERENCE_REGEX)) {
		const projectId = match[1];
		if (!projectId || match.index === undefined) continue;

		references.push({
			originalText: match[0],
			projectId,
			project: getProject(projectId),
			startIndex: match.index,
			endIndex: match.index + match[0].length,
		});
	}

	return references;
}

export function replaceProjectReferencesWithHTML(description: string): string {
	const references = parseProjectReferences(description);

	if (references.length === 0) {
		return description;
	}

	references.sort((a, b) => b.startIndex - a.startIndex);

	let result = description;

	for (const ref of references) {
		if (ref.project) {
			const linkHTML = `<a href="/projects/${ref.projectId}" class="project-link" style="color: #707fff; text-decoration: underline; text-decoration-style: dotted; text-decoration-color: #707fff; text-underline-offset: 2px; transition: all 0.2s ease;">${ref.project.title}</a>`;

			result =
				result.substring(0, ref.startIndex) +
				linkHTML +
				result.substring(ref.endIndex);
		} else {
			if (typeof console !== "undefined") {
				console.warn(
					`Project not found: ${ref.projectId}. Displaying as plain text.`,
				);
			}

			const fallbackHTML = `<span class="project-missing" title="Project data not available">${ref.projectId}</span>`;

			result =
				result.substring(0, ref.startIndex) +
				fallbackHTML +
				result.substring(ref.endIndex);
		}
	}

	return result;
}

export function validateProjectReferences(description: string): {
	isValid: boolean;
	missingProjects: string[];
} {
	const projectIds = extractProjectIds(description);
	const missingProjects: string[] = [];

	for (const projectId of projectIds) {
		const project = getProject(projectId);
		if (!project) {
			missingProjects.push(projectId);
		}
	}

	return {
		isValid: missingProjects.length === 0,
		missingProjects,
	};
}

export function getReferencedProjects(description: string): Project[] {
	const projectIds = extractProjectIds(description);
	const projects: Project[] = [];

	for (const projectId of projectIds) {
		const project = getProject(projectId);
		if (project) {
			projects.push(project);
		}
	}

	return projects;
}

export function convertMarkdownLinksToProjectReferences(
	description: string,
	linkToProjectIdMap: Record<string, string>,
): string {
	let result = description;
	const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

	for (const match of description.matchAll(markdownLinkRegex)) {
		const linkUrl = match[2];
		if (!linkUrl) continue;
		const projectId = linkToProjectIdMap[linkUrl];
		if (projectId) {
			result = result.replace(match[0], `{{project:${projectId}}}`);
		}
	}

	return result;
}
