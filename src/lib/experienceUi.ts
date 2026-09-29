import { EXPERIENCE_TYPES, type ExperienceType } from "./types";

export function usesDisplayFont(name: string): boolean {
	return name === "Lumber Sans";
}

export function displayFontStyle(name: string): string {
	return usesDisplayFont(name) ? 'font-family: "LumberSans";' : "";
}

/**
 * LumberSans only ships all-caps, so at the shared 0.875rem its cap-height
 * dwarfs the mixed-case Plex rows. Step its role and tags down to 0.8rem so
 * the name chip stays primary, as on every other row.
 */
export function displayRowStyle(name: string): string {
	if (!usesDisplayFont(name)) return "";
	// line-height matches the chips' 1.6 so role text sits level with them.
	return `${displayFontStyle(name)} font-size: 0.8rem; line-height: 1.6;`;
}

/**
 * Split a name where a line may break without splitting a word mid-way:
 * after an acronym ("NBC|Universal") or at a camelCase step.
 */
export function nameBreakParts(name: string): string[] {
	return name.split(/(?<=[A-Z]{2,})(?=[A-Z][a-z])|(?<=[a-z])(?=[A-Z])/);
}

export function experienceTypeStyles(type: ExperienceType): string {
	const palette = experienceTypePalette(type);
	// line-height 1.6 parts wrapped fragments into separate stacked bars with
	// breathing room instead of one merged slab — but the wrapping cell needs
	// `leading-none` too, or the inherited 1.55 strut wins and shifts the stack
	// (docs/usage.md).
	return `background-color: var(${palette.bg}); color: ${palette.text}; box-decoration-break: clone; -webkit-box-decoration-break: clone; font-size: 0.875rem; font-weight: 400; line-height: 1.6; display: inline; padding: 0.2rem 0.1rem;`;
}

export function experienceNameStyle(
	name: string,
	type: ExperienceType,
): string {
	return `${experienceTypeStyles(type)}${displayRowStyle(name)}`;
}

export function formatDateRange(startDate: string, endDate?: string): string {
	if (endDate && endDate !== "...") {
		return `${startDate}-${endDate}`;
	}
	return endDate === "..." ? `${startDate}-now` : startDate;
}

export function experienceFilterCss(): string {
	return EXPERIENCE_TYPES.map(
		(type) =>
			`#experience-table[data-filter="${type}"] .experience-row:not([data-type="${type}"]) { display: none; }`,
	).join("\n");
}

function experienceTypePalette(type: ExperienceType): {
	bg: string;
	text: string;
} {
	switch (type) {
		case "personal":
			return { bg: "--tag-personal", text: "var(--tag-personal-text)" };
		case "work":
			return { bg: "--tag-work", text: "var(--tag-work-text)" };
		case "school":
			return { bg: "--tag-school", text: "var(--tag-school-text)" };
		case "other":
			return { bg: "--tag-other", text: "var(--tag-other-text)" };
		default: {
			const _exhaustive: never = type;
			return _exhaustive;
		}
	}
}
