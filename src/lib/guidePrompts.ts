import type { PixelarticonName } from "../icons/pixelarticons";

export type StarterPrompt = { text: string; icon: PixelarticonName };

/** One per topic the guide's notes cover: inspirations, writing, the site. */
export const starterPrompts: readonly StarterPrompt[] = [
	{ text: "Who do you look up to?", icon: "users" },
	{ text: "What have you written most recently?", icon: "article" },
	{ text: "How was this site built?", icon: "hammer" },
];
