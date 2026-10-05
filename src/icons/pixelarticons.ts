/**
 * Icon paths from Pixelarticons (MIT)
 * https://github.com/halfmage/pixelarticons
 */
export const pixelarticons = {
	menu: "M4 6h16v2H4V6zm0 5h16v2H4v-2zm16 5H4v2h16v-2z",
	close:
		"M5 5h2v2H5V5zm4 4H7V7h2v2zm2 2H9V9h2v2zm2 0h-2v2H9v2H7v2H5v2h2v-2h2v-2h2v-2h2v2h2v2h2v2h2v-2h-2v-2h-2v-2h-2v-2zm2-2v2h-2V9h2zm2-2v2h-2V7h2zm0 0V5h2v2h-2z",
	"chevron-down":
		"M7 8H5v2h2v2h2v2h2v2h2v-2h2v-2h2v-2h2V8h-2v2h-2v2h-2v2h-2v-2H9v-2H7V8z",
	home: "M14 2h-4v2H8v2H6v2H4v2H2v2h2v10h7v-6h2v6h7V12h2v-2h-2V8h-2V6h-2V4h-2V2zm0 2v2h2v2h2v2h2v2h-2v8h-3v-6H9v6H6v-8H4v-2h2V8h2V6h2V4h4z",
	human: "M10 2h4v4h-4V2zM3 7h18v2h-6v13h-2v-6h-2v6H9V9H3V7z",
	chat: "M20 2H2v20h2V4h16v12H6v2H4v2h2v-2h16V2h-2z",
	users:
		"M11 0H5v2H3v6h2v2h6V8H5V2h6V0zm0 2h2v6h-2V2zM0 14h2v4h12v2H0v-6zm2 0h12v-2H2v2zm14 0h-2v6h2v-6zM15 0h4v2h-4V0zm4 8h-4v2h4V8zm0-6h2v6h-2V2zm5 12h-2v4h-4v2h6v-6zm-6-2h4v2h-4v-2z",
	github:
		"M5 2h4v2H7v2H5V2Zm0 10H3V6h2v6Zm2 2H5v-2h2v2Zm2 2v-2H7v2H3v-2H1v2h2v2h4v4h2v-4h2v-2H9Zm0 0v2H7v-2h2Zm6-12v2H9V4h6Zm4 2h-2V4h-2V2h4v4Zm0 6V6h2v6h-2Zm-2 2v-2h2v2h-2Zm-2 2v-2h2v2h-2Zm0 2h-2v-2h2v2Zm0 0h2v4h-2v-4Z",
	user: "M15 2H9v2H7v6h2V4h6V2zm0 8H9v2h6v-2zm0-6h2v6h-2V4zM4 16h2v-2h12v2H6v4h12v-4h2v6H4v-6z",
	article:
		"M5 3H3v18h18V3H5zm14 2v14H5V5h14zm-2 2H7v2h10V7zM7 11h10v2H7v-2zm7 4H7v2h7v-2z",
	at: "M4 4h16v12H8V8h8v6h2V6H6v12h14v2H4V4zm10 10v-4h-4v4h4z",
	"external-link":
		"M21 11V3h-8v2h4v2h-2v2h-2v2h-2v2H9v2h2v-2h2v-2h2V9h2V7h2v4h2zM11 5H3v16h16v-8h-2v6H5V7h6V5z",
	link: "M4 6h7v2H4v8h7v2H2V6h2zm16 0h-7v2h7v8h-7v2h9V6h-2zm-3 5H7v2h10v-2z",
	// Local 24px claw hammer for the guide action. The other paths are Pixelarticons.
	hammer: "M2 2h4v4H2zM10 2h10v4H10zM2 6h18v4H2zM10 10h6v10H10zM8 20h10v2H8z",
	search:
		"M22 22h-2v-2h2v2Zm-2-2h-2v-2h2v2Zm-6-2H6v-2h8v2Zm4 0h-2v-2h2v2ZM6 16H4v-2h2v2Zm10 0h-2v-2h2v2ZM4 14H2V6h2v8Zm14 0h-2V6h2v8ZM6 6H4V4h2v2Zm10 0h-2V4h2v2Zm-2-2H6V2h8v2Z",
	"arrow-up":
		"M11 20h2V4h-2zm2-12h2V6h-2zm2 2h2V8h-2zm2 2h2v-2h-2zm-6-4H9V6h2zM15 10H7V8h8zm2 2H5v-2h12z",
	file: "M6 4H4v16h2zm10-2H6v2h10zm4 4h-2v14h2zm-2 14H6v2h12zM16 4h2v2h-2zm-4 0h2v6h-2zM12 8h6v2h-6z",
	map: "M4 20h2v2H2V6h2v14Zm12 0h2v2h-4v-2h-2v-2h2V8h-2V6h4v14Zm-8 0H6v-2h2v2Zm12 0h-2v-2h2v2ZM10 4h2v2h-2v10h2v2H8V4H6V2h4v2Zm12 14h-2V4h-2V2h4v16ZM6 6H4V4h2v2Zm12 0h-2V4h2v2Z",
	reload:
		"M16 4h2v6h-2zm-2-2h2v2h-2zm0 2h2v8h-2zM4 8H2v5h2zM4 6h16v2H4zm4 14H6v-6h2zm2 2H8v-2h2zm0-2H8v-8h2zm10-4h2v-5h-2zM20 18H4v-2h16z",
} as const;

export type PixelarticonName = keyof typeof pixelarticons;

export function iconSvg(name: PixelarticonName, className = "w-6 h-6"): string {
	const path = pixelarticons[name];
	return `<svg class="${className}" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" fill="currentColor"/></svg>`;
}
