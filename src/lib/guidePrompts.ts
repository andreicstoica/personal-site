import type { PixelarticonName } from "../icons/pixelarticons";

export type StarterPrompt = { text: string; icon: PixelarticonName };

/** One per topic the guide's notes cover: inspirations, writing, the site. */
export const starterPrompts: readonly StarterPrompt[] = [
	{ text: "Who does Andrei look up to?", icon: "users" },
	{ text: "What has Andrei written most recently?", icon: "article" },
	{ text: "How was this site built?", icon: "tools" },
];

/** Follow-ups by topic: a page the reply opened, the page the visitor is on,
 *  or "writing" when the reply read a post. Each one is answerable from the
 *  notes, so a click never lands on "I don't have that". */
const exploreByTopic: Readonly<Record<string, readonly StarterPrompt[]>> = {
	"/": [
		{ text: "What does Andrei do at Liftoff?", icon: "tools" },
		{
			text: "What did Andrei build at the Fractal accelerator?",
			icon: "tools",
		},
		{ text: "Why did Andrei leave product management?", icon: "article" },
	],
	"/about": [
		{ text: "What camera does Andrei shoot with?", icon: "camera" },
		{ text: "How does Andrei make coffee?", icon: "coffee" },
		{ text: "What is Andrei building on the side?", icon: "tools" },
	],
	"/canon": [
		{ text: "Which architects does Andrei like?", icon: "users" },
		{ text: "What books shaped Andrei?", icon: "book-open" },
		{ text: "Which photographers does Andrei follow?", icon: "camera" },
	],
	"/colophon": [
		{ text: "How does this guide work?", icon: "robot" },
		{ text: "Which sites inspired this one?", icon: "link" },
		{ text: "What fonts does this site use?", icon: "text-cursor" },
	],
	"/fitness": [
		{ text: "Why does Andrei run?", icon: "human" },
		{ text: "Where does Andrei want to hike?", icon: "map" },
	],
	projects: [
		{ text: "What did Andrei build in 2025?", icon: "tools" },
		{ text: "What other projects has Andrei built?", icon: "tools" },
		{ text: "How was this site built?", icon: "tools" },
	],
	writing: [
		{ text: "What has Andrei written about AI?", icon: "article" },
		{ text: "Why did Andrei quit his job?", icon: "article" },
		{ text: "What media did Andrei love in 2025?", icon: "article" },
	],
};

const exploreFallback: readonly StarterPrompt[] = [
	...starterPrompts,
	{ text: "How does this guide work?", icon: "robot" },
];

function topicPrompts(topic: string): readonly StarterPrompt[] {
	if (topic.startsWith("/projects/")) return exploreByTopic.projects ?? [];
	return exploreByTopic[topic] ?? [];
}

/** Up to `limit` follow-ups for the topic, topped up from the fallback list,
 *  never repeating a question already asked in the thread. */
export function explorePrompts(
	topic: string,
	asked: readonly string[],
	limit = 3,
): StarterPrompt[] {
	const seen = new Set(asked.map((text) => text.trim().toLowerCase()));
	const picked: StarterPrompt[] = [];
	for (const prompt of [...topicPrompts(topic), ...exploreFallback]) {
		const key = prompt.text.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		picked.push(prompt);
		if (picked.length >= limit) break;
	}
	return picked;
}
