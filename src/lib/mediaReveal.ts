export function mediaReveal(node: HTMLImageElement | HTMLVideoElement) {
	const markLoaded = () => {
		node.classList.add("is-loaded");
	};

	if (node instanceof HTMLImageElement) {
		if (node.complete && node.naturalWidth > 0) {
			markLoaded();
		}
		node.addEventListener("load", markLoaded);
		return {
			destroy() {
				node.removeEventListener("load", markLoaded);
			},
		};
	}

	if (node.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
		markLoaded();
	}
	node.addEventListener("loadeddata", markLoaded);
	return {
		destroy() {
			node.removeEventListener("loadeddata", markLoaded);
		},
	};
}
