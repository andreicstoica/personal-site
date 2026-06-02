import { defineCollection, z } from "astro:content";

const pages = defineCollection({
	type: "content",
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		lastUpdated: z.coerce.date().optional(),
	}),
});

export const collections = { pages };
