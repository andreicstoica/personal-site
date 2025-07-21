export type Experience = {
  type: "personal" | "work" | "school" | "other";
  name: string;
  tags: string[];
  role: string;
  startDate: string;
  endDate?: string;
  description?: string;
  images?: string[];
};
