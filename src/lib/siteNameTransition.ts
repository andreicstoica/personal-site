/** Geometry of the site name against the page scroller, in viewport pixels. */
export type SiteNameBox = {
	scrollTop: number;
	width: number;
	height: number;
	top: number;
	bottom: number;
	scrollerTop: number;
	scrollerBottom: number;
};

/**
 * The name may morph only while it sits fully inside the unscrolled scrollport.
 * The group animation interpolates viewport boxes. A scrolled page records the
 * name higher up, often above the screen, and the new page's scroller starts at
 * the top, so the glyphs slide in from that edge.
 */
export function siteNameShouldMorph(box: SiteNameBox): boolean {
	if (box.scrollTop !== 0) return false;
	if (box.width < 1 || box.height < 1) return false;
	return box.top >= box.scrollerTop - 1 && box.bottom <= box.scrollerBottom + 1;
}

/**
 * Height to stamp on the outgoing banner before the snapshot, or null to leave
 * the collapsed frame alone. After the reveal has started, the swap opens the
 * incoming frame to this height before the new snapshot. Stamping it on the
 * outgoing frame first keeps the name in that same header slot. Before the
 * reveal, both frames stay collapsed, so the name does not travel the banner's
 * height.
 */
export function settledBannerHeight(state: {
	slid: boolean;
	opened: boolean;
	bodyHeight: number;
}): number | null {
	if (!state.slid && !state.opened) return null;
	if (state.bodyHeight < 1) return null;
	return state.bodyHeight;
}
