export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  links: {
    demo?: string;
    github?: string;
    website?: string;
  };
  images?: string[];
  video?: string; // Add this field for Vimeo embed URL
}

export interface ProjectReference {
  projectId: string;
  displayText: string;
}

export type Experience = {
  type: "personal" | "work" | "school" | "other";
  name: string;
  tags: string[];
  role: string;
  startDate: string;
  endDate?: string;
  description?: string;
  images?: string[];
  projects?: ProjectReference[];
};