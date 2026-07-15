export type NavItem = {
	href: string;
	label: string;
};

export const mainNavItems: NavItem[] = [
	{ href: "/", label: "Home" },
	{ href: "/about", label: "About" },
	{ href: "/chat", label: "Chat" },
];

export const socialNavItems: NavItem[] = [
	{ href: "https://github.com/andreicstoica/", label: "GitHub" },
	{ href: "https://www.linkedin.com/in/andrei-c-stoica/", label: "LinkedIn" },
	{
		href: "https://andreisthoughts.substack.com/",
		label: "Substack",
	},
	{ href: "https://x.com/andreistoica_", label: "Twitter (X)" },
];
