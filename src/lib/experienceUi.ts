import type { Experience } from "./types";

export function usesDisplayFont(name: string): boolean {
	return name === "Lumber Sans";
}

export function displayFontStyle(name: string): string {
	return usesDisplayFont(name) ? 'font-family: "LumberSans";' : "";
}

export function experienceTypeStyles(type: Experience["type"]): string {
	const palette = experienceTypePalette(type);
	return `background-color: var(${palette.bg}); color: #${palette.text}; box-decoration-break: clone; -webkit-box-decoration-break: clone; font-size: 0.875rem; font-weight: 400; display: inline; padding: 0.2rem 0.1rem;`;
}

export function experienceNameStyle(
	name: string,
	type: Experience["type"],
): string {
	return `${experienceTypeStyles(type)}${displayFontStyle(name)}`;
}

export function formatDateRange(startDate: string, endDate?: string): string {
	if (endDate && endDate !== "...") {
		return `${startDate}-${endDate}`;
	}
	return endDate === "..." ? `${startDate}-...` : startDate;
}

function experienceTypePalette(type: Experience["type"]): {
	bg: string;
	text: string;
} {
	switch (type) {
		case "personal":
			return { bg: "--tag-personal", text: "272727" };
		case "work":
			return { bg: "--tag-work", text: "fefefe" };
		case "school":
			return { bg: "--tag-school", text: "272727" };
		case "other":
			return { bg: "--tag-other", text: "fefefe" };
		default: {
			const _exhaustive: never = type;
			return _exhaustive;
		}
	}
}
