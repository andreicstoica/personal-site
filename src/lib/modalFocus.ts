const locks = new WeakMap<HTMLElement, { count: number; inert: boolean }>();

/** Isolate a modal while preserving inert state owned by other overlays. */
export function modalFocus(node: HTMLElement, enabled = true) {
	let release = () => {};
	const update = (active: boolean) => {
		release();
		if (!active) return;
		const locked = new Set<HTMLElement>();
		const isolate = () => {
			let child: HTMLElement = node;
			while (child.parentElement) {
				for (const sibling of child.parentElement.children) {
					if (
						!(sibling instanceof HTMLElement) ||
						sibling === child ||
						locked.has(sibling)
					)
						continue;
					const lock = locks.get(sibling) ?? { count: 0, inert: sibling.inert };
					lock.count++;
					locks.set(sibling, lock);
					sibling.inert = true;
					locked.add(sibling);
				}
				if (child.parentElement === document.body) break;
				child = child.parentElement;
			}
		};
		const trap = (event: KeyboardEvent) => {
			if (event.key !== "Tab" || node.closest("[inert]")) return;
			const items = [
				...node.querySelectorAll<HTMLElement>(
					"a[href], button, input, textarea, select, video[controls], [tabindex]",
				),
			].filter(
				(item) =>
					item.tabIndex >= 0 &&
					!item.matches(":disabled") &&
					!item.closest("[inert]") &&
					item.getClientRects().length > 0,
			);
			const first = items[0] ?? node;
			const last = items.at(-1) ?? node;
			const current = document.activeElement;
			if (
				!node.contains(current) ||
				current === node ||
				(event.shiftKey ? current === first : current === last)
			) {
				event.preventDefault();
				(event.shiftKey ? last : first).focus();
			}
		};
		isolate();
		// Astro can replace the page while a persisted guide remains open.
		const observer = new MutationObserver(isolate);
		observer.observe(document.body, { childList: true });
		document.addEventListener("keydown", trap);
		release = () => {
			observer.disconnect();
			document.removeEventListener("keydown", trap);
			for (const element of locked) {
				const lock = locks.get(element);
				if (!lock || --lock.count > 0) continue;
				element.inert = lock.inert;
				locks.delete(element);
			}
			locked.clear();
		};
	};
	update(enabled);
	return { update, destroy: () => release() };
}
