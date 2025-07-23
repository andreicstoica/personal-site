import { getProject } from './projects';
import type { Project } from './types';

// Regular expression to match project references in the format {{project:id}}
const PROJECT_REFERENCE_REGEX = /\{\{project:([^}]+)\}\}/g;

// Interface for parsed project reference
interface ParsedProjectReference {
    originalText: string;
    projectId: string;
    project: Project | undefined;
    startIndex: number;
    endIndex: number;
}

/**
 * Extract project IDs from a description string
 */
export function extractProjectIds(description: string): string[] {
    const matches = description.match(PROJECT_REFERENCE_REGEX);
    if (!matches) return [];

    return matches.map(match => {
        const idMatch = match.match(/\{\{project:([^}]+)\}\}/);
        return idMatch ? idMatch[1] : '';
    }).filter(id => id.length > 0);
}

/**
 * Parse project references from description and return structured data
 */
export function parseProjectReferences(description: string): ParsedProjectReference[] {
    const references: ParsedProjectReference[] = [];
    let match;

    // Reset regex lastIndex to ensure we start from the beginning
    PROJECT_REFERENCE_REGEX.lastIndex = 0;

    while ((match = PROJECT_REFERENCE_REGEX.exec(description)) !== null) {
        const projectId = match[1];
        const project = getProject(projectId);

        references.push({
            originalText: match[0],
            projectId,
            project,
            startIndex: match.index,
            endIndex: match.index + match[0].length
        });
    }

    return references;
}

/**
 * Replace project references with HTML for project links
 * This function is used server-side in Astro components
 */
export function replaceProjectReferencesWithHTML(description: string): string {
    const references = parseProjectReferences(description);

    if (references.length === 0) {
        return description;
    }

    // Sort references by start index in descending order to replace from end to beginning
    // This prevents index shifting issues
    references.sort((a, b) => b.startIndex - a.startIndex);

    let result = description;

    for (const ref of references) {
        if (ref.project) {
            // Create HTML for project link
            const linkHTML = `<span class="project-link-placeholder" data-project-id="${ref.projectId}" data-display-text="${ref.project.title}">${ref.project.title}</span>`;

            result = result.substring(0, ref.startIndex) +
                linkHTML +
                result.substring(ref.endIndex);
        } else {
            // If project not found, replace with plain text and log warning
            if (typeof console !== 'undefined') {
                console.warn(`Project not found: ${ref.projectId}. Displaying as plain text.`);
            }

            // Create a fallback span that looks like regular text
            const fallbackHTML = `<span class="project-missing" title="Project data not available">${ref.projectId}</span>`;

            result = result.substring(0, ref.startIndex) +
                fallbackHTML +
                result.substring(ref.endIndex);
        }
    }

    return result;
}

/**
 * Validate that all project references in a description exist
 */
export function validateProjectReferences(description: string): {
    isValid: boolean;
    missingProjects: string[]
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
        missingProjects
    };
}

/**
 * Get all projects referenced in a description
 */
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

/**
 * Convert markdown-style links to project references
 * This is a utility function to help migrate existing content
 */
export function convertMarkdownLinksToProjectReferences(
    description: string,
    linkToProjectIdMap: Record<string, string>
): string {
    let result = description;

    // Match markdown links: [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = markdownLinkRegex.exec(description)) !== null) {
        const linkText = match[1];
        const linkUrl = match[2];
        const projectId = linkToProjectIdMap[linkUrl];

        if (projectId) {
            result = result.replace(match[0], `{{project:${projectId}}}`);
        }
    }

    return result;
}