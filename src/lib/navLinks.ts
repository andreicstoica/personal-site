export type NavItem = {
	href: string;
	label: string;
};

export const socialIconKinds = [
	"person",
	"mail",
	"terminal",
	"balloon",
] as const;

export type SocialIcon = (typeof socialIconKinds)[number];

export type SocialLink = NavItem & {
	icon: SocialIcon;
};

export const mainNavItems: NavItem[] = [
	{ href: "/", label: "Home" },
	{ href: "/about", label: "About" },
];

export const socialNavItems: SocialLink[] = [
	{
		href: "https://github.com/andreicstoica/",
		label: "GitHub",
		icon: "terminal",
	},
	{
		href: "https://www.linkedin.com/in/andrei-c-stoica/",
		label: "LinkedIn",
		icon: "person",
	},
	{
		href: "https://andreisthoughts.substack.com/",
		label: "Substack",
		icon: "mail",
	},
	{
		href: "https://x.com/andreistoica_",
		label: "Twitter (X)",
		icon: "balloon",
	},
];
