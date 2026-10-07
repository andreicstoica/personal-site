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

	// A poster is a separate image. Waiting on the video file leaves the tile
	// blank whenever that file is slow, deferred, or never fetched.
	if (node.poster) return revealPoster(node, markLoaded);

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

/** Page-parse path: the island action may not have mounted yet. */
function watchPoster(video: HTMLVideoElement): void {
	if (video.classList.contains("is-loaded") || watchedPosters.has(video))
		return;
	watchedPosters.add(video);
	revealPoster(video, () => revealElement(video));
}

function revealPoster(
	video: HTMLVideoElement,
	markLoaded: () => void,
): { destroy: () => void } {
	const poster = new Image();
	poster.addEventListener("load", markLoaded);
	poster.addEventListener("error", markLoaded);
	poster.src = video.poster;
	if (poster.complete && poster.naturalWidth > 0)
		requestAnimationFrame(markLoaded);
	return {
		destroy() {
			poster.removeEventListener("load", markLoaded);
			poster.removeEventListener("error", markLoaded);
		},
	};
}

const REVEAL_SELECTOR = ".media-reveal";
const watchedPosters = new WeakSet<HTMLVideoElement>();

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
		if (element instanceof HTMLVideoElement) {
			if (element.poster) watchPoster(element);
			else if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
				revealElement(element);
			}
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
	if (!(target instanceof Element) || !target.matches(REVEAL_SELECTOR)) return;
	revealElement(target);
}
