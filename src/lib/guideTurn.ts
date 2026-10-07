import type { PixelarticonName } from "../icons/pixelarticons";
import type { GuidePart, GuideUIMessage, OpenPageOutput } from "./chatTypes";

export type GuideStep = {
	icon: PixelarticonName;
	label: string;
	status: "active" | "complete";
	/** Makes the label a link, for a step the visitor can repeat. */
	href?: string;
};

export type PageCall = { toolCallId: string; output: OpenPageOutput };

/** One assistant message, split into what the panel draws: the tool steps
 *  above the reply, the reply text, notices, and the page it opens. */
export type ReplyView = {
	steps: GuideStep[];
	text: string;
	notices: string[];
	page: PageCall | null;
};

export function toolSteps(part: GuidePart): GuideStep[] {
	if (part.type !== "tool-read_post") return [];
	if (part.state === "output-available") {
		return [
			{
				icon: "article",
				label: `Read ${part.output.title}`,
				status: "complete",
			},
		];
	}
	if (part.state === "output-error") {
		return [
			{ icon: "article", label: "Couldn't read that post", status: "complete" },
		];
	}
	return [{ icon: "article", label: "Reading a post", status: "active" }];
}

export function replyView(message: GuideUIMessage): ReplyView {
	const view: ReplyView = { steps: [], text: "", notices: [], page: null };
	for (const part of message.parts) {
		if (part.type === "text") view.text += part.text;
		else if (part.type === "data-notice") view.notices.push(part.data.text);
		else if (part.type === "tool-open_page") {
			if (part.state === "output-available") {
				view.page = { toolCallId: part.toolCallId, output: part.output };
			}
		} else view.steps.push(...toolSteps(part));
	}
	view.text = view.text.trim();
	return view;
}

/** How a page call ended: the page changed, or the current page scrolled. */
export type PageMove = "opened" | "scrolled";

/** The page call as a step: pending while the reply streams and while the
 *  follow waits, done once the page moved, and a link when the visitor's own
 *  action cancelled it. Nothing when it would point at where they are. */
export function pageStep(
	output: OpenPageOutput,
	state: { pending: boolean; moved: PageMove | undefined; pagePath: string },
): GuideStep | null {
	const { href, label, section } = output;
	const samePage = state.pagePath === href;
	if (state.pending) {
		const text =
			samePage && section
				? `Scrolling to ${section.label}`
				: `Opening ${label}`;
		return { icon: "map", label: text, status: "active" };
	}
	const link = section ? `${href}#${section.id}` : href;
	if (state.moved === "scrolled" && section) {
		return {
			icon: "map",
			label: `Scrolled to ${section.label}`,
			status: "complete",
			href: link,
		};
	}
	if (state.moved === "opened") {
		return {
			icon: "map",
			label: section
				? `Opened ${label} at ${section.label}`
				: `Opened ${label}`,
			status: "complete",
			href: link,
		};
	}
	if (samePage && !section) return null;
	return {
		icon: "map",
		label: section ? `Go to ${section.label} on ${label}` : `Open ${label}`,
		status: "complete",
		href: link,
	};
}

export type Turn = {
	id: string;
	question: GuideUIMessage | null;
	reply: GuideUIMessage | null;
};

/** A turn is one question and the reply under it, the unit the thread
 *  anchors to. A reply with no question before it gets its own turn. */
export function groupTurns(messages: readonly GuideUIMessage[]): Turn[] {
	const turns: Turn[] = [];
	for (const message of messages) {
		const current = turns.at(-1);
		if (message.role === "assistant" && current && !current.reply) {
			current.reply = message;
		} else if (message.role === "user") {
			turns.push({ id: message.id, question: message, reply: null });
		} else {
			turns.push({ id: message.id, question: null, reply: message });
		}
	}
	return turns;
}
