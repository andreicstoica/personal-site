/** Scrolls a page section into view and marks it briefly, so the visitor
 *  sees what the reply pointed at. Returns false when the section is missing
 *  or hidden (a filtered experience row), and leaves the page alone. */
export function revealSection(id: string): boolean {
	const target = document.getElementById(id);
	if (!target || target.getClientRects().length === 0) return false;
	const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	target.scrollIntoView({
		block: "start",
		behavior: reduce ? "auto" : "smooth",
	});
	// Restart the mark when the same section is revealed twice in a row.
	delete target.dataset.guideHighlight;
	void target.offsetWidth;
	target.dataset.guideHighlight = "";
	target.addEventListener(
		"animationend",
		() => {
			delete target.dataset.guideHighlight;
		},
		{ once: true },
	);
	return true;
}

/** Any sign the visitor is doing something else: a pointer down, a wheel or
 *  touch scroll, a key press, or a text selection. Focus alone is not a
 *  signal; it stays in the composer by design. */
export function watchIntent(onIntent: () => void): () => void {
	const events = ["pointerdown", "wheel", "touchmove", "keydown"] as const;
	const onSelection = () => {
		if (document.getSelection()?.isCollapsed === false) onIntent();
	};
	for (const type of events) {
		window.addEventListener(type, onIntent, { capture: true, passive: true });
	}
	document.addEventListener("selectionchange", onSelection);
	return () => {
		for (const type of events) {
			window.removeEventListener(type, onIntent, { capture: true });
		}
		document.removeEventListener("selectionchange", onSelection);
	};
}
