import type { PixelarticonName } from "../icons/pixelarticons";

export type NavItem = {
	href: string;
	label: string;
	icon: PixelarticonName;
};

export const mainNavItems: NavItem[] = [
	{ href: "/", label: "Home", icon: "home" },
	{ href: "/about", label: "About", icon: "human" },
	{ href: "/chat", label: "Chat", icon: "chat" },
];

export const socialNavItems: NavItem[] = [
	{
		href: "https://github.com/andreicstoica/",
		label: "GitHub",
		icon: "github",
	},
	{
		href: "https://www.linkedin.com/in/andrei-c-stoica/",
		label: "LinkedIn",
		icon: "user",
	},
	{
		href: "https://andreisthoughts.substack.com/",
		label: "Substack",
		icon: "article",
	},
	{
		href: "https://x.com/andreistoica_",
		label: "Twitter (X)",
		icon: "at",
	},
];
