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
 *  signal; it stays in the composer by design. Pointer, scroll, and
 *  selection inside `ignore` (the guide panel) do not count; key presses
 *  always do. */
export function watchIntent(
	onIntent: () => void,
	ignore: Element | null = null,
): () => void {
	const inside = (node: Node | null) =>
		ignore !== null && node !== null && ignore.contains(node);
	const onPointer = (event: Event) => {
		if (!(event.target instanceof Node && inside(event.target))) onIntent();
	};
	const pointerEvents = ["pointerdown", "wheel", "touchmove"] as const;
	const onSelection = () => {
		const selection = document.getSelection();
		if (selection?.isCollapsed === false && !inside(selection.anchorNode))
			onIntent();
	};
	for (const type of pointerEvents) {
		window.addEventListener(type, onPointer, { capture: true, passive: true });
	}
	window.addEventListener("keydown", onIntent, { capture: true });
	document.addEventListener("selectionchange", onSelection);
	return () => {
		for (const type of pointerEvents) {
			window.removeEventListener(type, onPointer, { capture: true });
		}
		window.removeEventListener("keydown", onIntent, { capture: true });
		document.removeEventListener("selectionchange", onSelection);
	};
}
