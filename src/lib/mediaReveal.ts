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
