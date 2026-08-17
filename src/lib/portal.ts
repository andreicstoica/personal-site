/** Move a node to `document.body` (or another target) so `position: fixed` uses the viewport. */
export function portal(
	node: HTMLElement,
	target: string | HTMLElement = "body",
) {
	const destination =
		typeof target === "string"
			? (document.querySelector(target) ?? document.body)
			: target;

	destination.appendChild(node);

	return {
		destroy() {
			node.remove();
		},
	};
}
