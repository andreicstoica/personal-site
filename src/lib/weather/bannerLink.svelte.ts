import type { BannerTarget } from "./interact";
import type { Scene } from "./scene";

/** The live banner, as the guide's scene controls see it. The banner and the
 *  guide are separate islands that load this one module, so they share it.
 *  Both fields are null until the client-only banner mounts. */
export const bannerLink = $state<{
	scene: Scene | null;
	advance: ((target: BannerTarget) => void) | null;
}>({ scene: null, advance: null });
