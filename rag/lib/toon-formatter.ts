import { encode } from '@byjohann/toon';

interface DocumentMetadata {
    type?: string;
    title?: string;
    date?: string;
    tags?: string[];
    headingPath?: string;
    sourceUrl?: string;
}

interface QueryResult {
    id: string;
    text: string;
    source: string;
    score: number;
    metadata?: DocumentMetadata;
    confidence?: 'high' | 'medium' | 'low';
}

/**
 * Determines if a document would benefit from TOON encoding
 * Focuses on structured content that has repetitive patterns
 */
export function shouldUseToon(metadata?: DocumentMetadata): boolean {
    if (!metadata?.type) return false;

    // Structured content types that benefit most from TOON
    const structuredTypes = ['projects', 'experience', 'resume'];
    return structuredTypes.includes(metadata.type);
}

/**
 * Encodes text content using TOON format
 * Uses appropriate options based on content type
 */
export function encodeForLLM(text: string, metadata?: DocumentMetadata): string {
    const options = {
        indent: 2,
        delimiter: ',' as const,
        lengthMarker: '#' as const
    };

    try {
        // For structured content, try to parse as structured data first
        if (shouldUseToon(metadata)) {
            // Attempt to extract structured patterns from text
            const structuredData = extractStructuredData(text, metadata);
            if (structuredData) {
                return encode(structuredData, options);
            }
        }

        // Fallback: encode as simple text object
        return encode({ content: text }, options);
    } catch (error) {
        console.warn('TOON encoding failed, falling back to original text:', error);
        return text;
    }
}

/**
 * Extracts structured data patterns from text content
 * Handles common patterns in projects, experience, and resume content
 */
function extractStructuredData(text: string, metadata?: DocumentMetadata): any {
    const type = metadata?.type;

    switch (type) {
        case 'projects':
            return extractProjectsData(text);
        case 'experience':
            return extractExperienceData(text);
        case 'resume':
            return extractResumeData(text);
        default:
            return null;
    }
}

/**
 * Extracts project data into structured format
 */
function extractProjectsData(text: string): any {
    const lines = text.split('\n');
    const projects: any[] = [];
    let currentProject: any = null;

    for (const line of lines) {
        const trimmed = line.trim();

        // Project title (usually starts with a word, not indented)
        if (trimmed && !trimmed.startsWith(' ') && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
            if (currentProject) {
                projects.push(currentProject);
            }
            currentProject = {
                name: trimmed,
                description: '',
                features: [],
                technologies: []
            };
        }
        // Description line
        else if (trimmed.startsWith('A ') || trimmed.startsWith('An ') || trimmed.startsWith('The ')) {
            if (currentProject) {
                currentProject.description = trimmed;
            }
        }
        // Features/Key Features
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (currentProject) {
                currentProject.features.push(trimmed.substring(2));
            }
        }
        // Technologies line
        else if (trimmed.startsWith('Technologies: ')) {
            if (currentProject) {
                currentProject.technologies = trimmed.substring(14).split(',').map(t => t.trim());
            }
        }
    }

    if (currentProject) {
        projects.push(currentProject);
    }

    return projects.length > 0 ? { projects } : null;
}

/**
 * Extracts experience data into structured format
 */
function extractExperienceData(text: string): any {
    const lines = text.split('\n');
    const experiences: any[] = [];
    let currentExp: any = null;

    for (const line of lines) {
        const trimmed = line.trim();

        // Company/Position line (usually bold or prominent)
        if (trimmed && !trimmed.startsWith(' ') && !trimmed.startsWith('-') &&
            (trimmed.includes('(') || trimmed.includes('–') || trimmed.includes('-'))) {
            if (currentExp) {
                experiences.push(currentExp);
            }
            currentExp = {
                title: trimmed,
                description: '',
                achievements: []
            };
        }
        // Description
        else if (trimmed && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
            if (currentExp && !currentExp.description) {
                currentExp.description = trimmed;
            }
        }
        // Achievements
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (currentExp) {
                currentExp.achievements.push(trimmed.substring(2));
            }
        }
    }

    if (currentExp) {
        experiences.push(currentExp);
    }

    return experiences.length > 0 ? { experiences } : null;
}

/**
 * Extracts resume data into structured format
 */
function extractResumeData(text: string): any {
    const lines = text.split('\n');
    const sections: any = {};
    let currentSection = '';

    for (const line of lines) {
        const trimmed = line.trim();

        // Section headers
        if (trimmed && !trimmed.startsWith(' ') && !trimmed.startsWith('-') &&
            trimmed.length < 50 && !trimmed.includes(':')) {
            currentSection = trimmed.toLowerCase().replace(/\s+/g, '_');
            sections[currentSection] = [];
        }
        // Content under sections
        else if (trimmed && currentSection) {
            sections[currentSection].push(trimmed);
        }
    }

    return Object.keys(sections).length > 0 ? sections : null;
}

/**
 * Formats query results for LLM consumption using TOON where beneficial
 */
export function formatForPrompt(results: QueryResult[]): string {
    const contextEntries = results.map((doc, index) => {
        const confidenceLabel = doc.confidence ?? "unknown";
        const scorePercent = (doc.score * 100).toFixed(0);

        // Use TOON encoding for structured content
        if (shouldUseToon(doc.metadata)) {
            const encodedText = encodeForLLM(doc.text, doc.metadata);
            const originalLength = doc.text.length;
            const encodedLength = encodedText.length;
            const savings = ((originalLength - encodedLength) / originalLength * 100).toFixed(1);

            console.log(`TOON encoded ${doc.source}: ${originalLength} → ${encodedLength} chars (${savings}% reduction)`);

            return `[[${index + 1}]] (confidence: ${confidenceLabel}, score: ${scorePercent}%, TOON-encoded) ${doc.source}:\n\`\`\`toon\n${encodedText}\n\`\`\``;
        } else {
            return `[[${index + 1}]] (confidence: ${confidenceLabel}, score: ${scorePercent}%) ${doc.text}`;
        }
    });

    return contextEntries.join("\n\n");
}

/**
 * Estimates token count for a given text (rough approximation)
 */
export function estimateTokenCount(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
}
