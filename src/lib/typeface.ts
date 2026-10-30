export const TYPEFACES = ["plex", "areal", "geist"] as const;
export type Typeface = (typeof TYPEFACES)[number];

export const TYPEFACE_KEY = "site-typeface-v1";

export function parseTypeface(value: string | null | undefined): Typeface {
	return TYPEFACES.find((item) => item === value) ?? "plex";
}
