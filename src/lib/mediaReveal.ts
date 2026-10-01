export function mediaReveal(node: HTMLImageElement | HTMLVideoElement) {
	const markLoaded = () => {
		node.classList.add("is-loaded");
	};

	if (node instanceof HTMLImageElement) {
		if (node.complete && node.naturalWidth > 0) {
			// Defer so the element renders at opacity: 0 first, then transitions in.
			requestAnimationFrame(() => markLoaded());
		}
		node.addEventListener("load", markLoaded);
		return {
			destroy() {
				node.removeEventListener("load", markLoaded);
			},
		};
	}

	if (node.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
		requestAnimationFrame(() => markLoaded());
	}
	node.addEventListener("loadeddata", markLoaded);
	return {
		destroy() {
			node.removeEventListener("loadeddata", markLoaded);
		},
	};
}

const REVEAL_SELECTOR = ".media-reveal";

function revealElement(element: Element): void {
	element.classList.add("is-loaded");
}

/** Mark anything that already finished loading — cached images never re-fire load. */
function scanRevealables(root: ParentNode = document): void {
	for (const element of root.querySelectorAll(REVEAL_SELECTOR)) {
		if (
			element instanceof HTMLImageElement &&
			element.complete &&
			element.naturalWidth > 0
		) {
			revealElement(element);
		}
		if (
			element instanceof HTMLVideoElement &&
			element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
		) {
			revealElement(element);
		}
	}
}

/**
 * Media starts at opacity: 0 and only paints once `is-loaded` lands. The
 * mediaReveal action does that when its island mounts — this does it from page
 * parse, so thumbnails are never stranded behind hydration (or a late island).
 * `load` and `loadeddata` don't bubble, so listen in the capture phase.
 */
export function installMediaReveal(): void {
	document.addEventListener("load", handleMediaEvent, true);
	document.addEventListener("loadeddata", handleMediaEvent, true);
	document.addEventListener("astro:page-load", () => scanRevealables());
	scanRevealables();
}

function handleMediaEvent(event: Event): void {
	const target = event.target;
	if (target instanceof Element && target.matches(REVEAL_SELECTOR)) {
		revealElement(target);
	}
}
