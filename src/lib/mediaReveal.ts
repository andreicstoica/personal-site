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

	const { ready, event } = videoReveal(node);
	if (node.readyState >= ready) {
		requestAnimationFrame(() => markLoaded());
	}
	node.addEventListener(event, markLoaded);
	return {
		destroy() {
			node.removeEventListener(event, markLoaded);
		},
	};
}

/** A video with a poster can show as soon as its size is known: the poster
 *  fills the frame. Without one it waits for a first frame, which a browser
 *  holding autoplay back may never load. */
function videoReveal(video: HTMLVideoElement): {
	ready: number;
	event: "loadedmetadata" | "loadeddata";
} {
	return video.poster
		? { ready: HTMLMediaElement.HAVE_METADATA, event: "loadedmetadata" }
		: { ready: HTMLMediaElement.HAVE_CURRENT_DATA, event: "loadeddata" };
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
			element.readyState >= videoReveal(element).ready
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
	document.addEventListener("loadedmetadata", handleMediaEvent, true);
	document.addEventListener("astro:page-load", () => scanRevealables());
	scanRevealables();
}

function handleMediaEvent(event: Event): void {
	const target = event.target;
	if (!(target instanceof Element) || !target.matches(REVEAL_SELECTOR)) return;
	// Metadata alone reveals only a video that has a poster to show.
	if (
		event.type === "loadedmetadata" &&
		!(target instanceof HTMLVideoElement && target.poster)
	)
		return;
	revealElement(target);
}
