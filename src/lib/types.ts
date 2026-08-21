export const EXPERIENCE_TYPES = [
	"personal",
	"work",
	"school",
	"other",
] as const;

export type ExperienceType = (typeof EXPERIENCE_TYPES)[number];

export function isExperienceType(value: string): value is ExperienceType {
	return (EXPERIENCE_TYPES as readonly string[]).includes(value);
}

export interface Project {
	id: string;
	title: string;
	description: string;
	technologies: string[];
	technicalDetails?: {
		keyFeatures: string[];
		challenges: string[];
		implementation: string[];
	};
	links: {
		demo?: string;
		github?: string;
		website?: string;
	};
	images?: string[];
	video?: string;
}

export interface ProjectReference {
	projectId: string;
	displayText: string;
}

export type Experience = {
	type: ExperienceType;
	name: string;
	tags: string[];
	role: string;
	startDate: string;
	endDate?: string;
	description?: string;
	images?: string[];
	projects?: ProjectReference[];
};

export type GalleryVariant = "desktop" | "mobile";

export type GalleryMedia =
	| {
			kind: "image";
			src: string;
			alt: string;
			width?: number;
			height?: number;
	  }
	| {
			kind: "video";
			src: string;
			alt: string;
	  };

export type ChatRole = "user" | "assistant";
export type ChatServerStatus = "checking" | "online" | "offline";
