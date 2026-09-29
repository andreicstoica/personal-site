export const TYPEFACES = ["plex", "areal", "geist"] as const;
export type Typeface = (typeof TYPEFACES)[number];

export const TYPEFACE_KEY = "site-typeface-v1";

/** Geist is loaded only when chosen, so Plex visitors do not pay for it. */
export const GEIST_STYLESHEET =
	"https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap";

export function parseTypeface(value: string | null | undefined): Typeface {
	return TYPEFACES.find((item) => item === value) ?? "plex";
}
