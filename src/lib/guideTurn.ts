import type { PixelarticonName } from "../icons/pixelarticons";
import type {
	ContextSummary,
	GuideMetadata,
	GuidePart,
	GuideUIMessage,
	OpenPageOutput,
	ReadPostOutput,
} from "./chatTypes";

export type GuideStep = {
	icon: PixelarticonName;
	label: string;
	status: "active" | "complete";
	/** Makes the label a link, for a step the visitor can repeat. */
	href?: string;
	/** The tool behind the step, shown as code in the trace. */
	tool?: string;
	/** Secondary prose under the label, such as the model's reasoning. */
	detail?: string;
	/** A line of figures under the label, set in mono: model and tokens. */
	data?: string;
};

export type PageCall = { toolCallId: string; output: OpenPageOutput };

/** One assistant message, split into what the panel draws: the trace of how
 *  the answer was made, the reply text, notices, and its sources: the page
 *  it opens and the posts it read. */
export type ReplyView = {
	trace: GuideStep[];
	text: string;
	notices: string[];
	page: PageCall | null;
	/** Posts the reply read, once each, in the order it read them. */
	posts: ReadPostOutput[];
};

const count = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});

function usageDetail(metadata: GuideMetadata | undefined): string | undefined {
	if (!metadata?.model) return undefined;
	const parts = [metadata.model];
	if (metadata.inputTokens) {
		const cached = metadata.cachedTokens
			? ` (${count.format(metadata.cachedTokens)} cached)`
			: "";
		parts.push(`${count.format(metadata.inputTokens)} tokens in${cached}`);
	}
	if (metadata.outputTokens)
		parts.push(`${count.format(metadata.outputTokens)} out`);
	return parts.join(" · ");
}

function contextStep(data: ContextSummary): GuideStep {
	return {
		icon: "files",
		label: `Loaded ${data.notes} notes, ${data.posts} posts, and the site map`,
		status: "complete",
		detail: data.page
			? `${data.sections} page sections it can point at. Visitor is on ${data.page}.`
			: `${data.sections} page sections it can point at.`,
	};
}

function toolStep(part: GuidePart): GuideStep | null {
	if (part.type === "tool-read_post") {
		if (part.state === "output-available")
			return {
				icon: "book-open",
				label: `Read ${part.output.title}`,
				status: "complete",
				tool: "read_post",
				href: part.output.url,
			};
		if (part.state === "output-error")
			return {
				icon: "book-open",
				label: "Couldn't read that post",
				status: "complete",
				tool: "read_post",
			};
		return {
			icon: "book-open",
			label: "Reading a post",
			status: "active",
			tool: "read_post",
		};
	}
	if (part.type === "tool-open_page") {
		if (part.state !== "output-available")
			return {
				icon: "directions",
				label: "Choosing a page",
				status: "active",
				tool: "open_page",
			};
		const { href, label, section } = part.output;
		return {
			icon: "directions",
			label: section ? `Chose ${label} at ${section.label}` : `Chose ${label}`,
			status: "complete",
			tool: "open_page",
			href: section ? `${href}#${section.id}` : href,
		};
	}
	return null;
}

/** The trace, in the order the turn ran. Consecutive reasoning parts merge
 *  into one row; the reply is one row that carries the model and tokens. */
function traceSteps(message: GuideUIMessage): GuideStep[] {
	const steps: GuideStep[] = [];
	let reply: GuideStep | null = null;
	for (const part of message.parts) {
		if (part.type === "data-context") {
			steps.push(contextStep(part.data));
		} else if (part.type === "data-page") {
			const { href, label, section } = part.data;
			steps.push({
				icon: "directions",
				label: section
					? `Pointed to ${label} at ${section.label}`
					: `Pointed to ${label}`,
				status: "complete",
				href: section ? `${href}#${section.id}` : href,
			});
		} else if (part.type === "reasoning") {
			const text = part.text.trim();
			const thinking = part.state === "streaming";
			const last = steps.at(-1);
			let row = last?.icon === "lightbulb" ? last : undefined;
			if (!row && (text || thinking)) {
				row = { icon: "lightbulb", label: "Thinking", status: "active" };
				steps.push(row);
			}
			if (row) {
				if (text) row.detail = row.detail ? `${row.detail}\n\n${text}` : text;
				row.status = thinking ? "active" : "complete";
				row.label = thinking ? "Thinking" : "Thought";
			}
		} else if (part.type === "text") {
			if (!reply && part.text.trim()) {
				reply = {
					icon: "cpu",
					label: "Writing the reply",
					status: "active",
				};
				steps.push(reply);
			}
			if (reply && part.state !== "streaming") {
				reply.label = "Wrote the reply";
				reply.status = "complete";
			}
		} else {
			const step = toolStep(part);
			if (step) steps.push(step);
		}
	}
	const usage = usageDetail(message.metadata);
	if (reply && usage) reply.data = usage;
	return steps;
}

export function replyView(message: GuideUIMessage): ReplyView {
	const view: ReplyView = {
		trace: traceSteps(message),
		text: "",
		notices: [],
		page: null,
		posts: [],
	};
	for (const part of message.parts) {
		if (part.type === "text") view.text += part.text;
		else if (part.type === "data-notice") view.notices.push(part.data.text);
		else if (
			part.type === "tool-open_page" &&
			part.state === "output-available"
		) {
			view.page = { toolCallId: part.toolCallId, output: part.output };
		} else if (part.type === "data-page" && part.id && !view.page) {
			view.page = { toolCallId: part.id, output: part.data };
		} else if (
			part.type === "tool-read_post" &&
			part.state === "output-available" &&
			!view.posts.some((post) => post.url === part.output.url)
		) {
			view.posts.push(part.output);
		}
	}
	view.text = view.text.trim();
	return view;
}

/** The trace's one-line header: the step in progress while live, then how
 *  long the turn took. */
export function traceSummary(
	message: GuideUIMessage | null,
	trace: readonly GuideStep[],
	live: boolean,
): string {
	if (live) {
		const active = [...trace]
			.reverse()
			.find((step) => step.status === "active");
		return active?.label ?? "Thinking";
	}
	const ms = message?.metadata?.ms;
	return ms ? `Worked for ${(ms / 1000).toFixed(1)}s` : "How this was made";
}

/** How a page call ended: the page changed, or the current page scrolled. */
export type PageMove = "opened" | "scrolled";

/** A source the reply used, drawn as a card under it: a page of this site
 *  the guide opened, or a blog post it read. */
export type SourceCard = {
	href: string;
	title: string;
	meta: string;
	/** The page move is in progress. */
	active: boolean;
	/** Opens in a new tab: the blog lives off this site. */
	external: boolean;
};

const postDate = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	year: "numeric",
	timeZone: "UTC",
});

export function postCard(post: ReadPostOutput): SourceCard {
	const date = post.date
		? postDate.format(new Date(`${post.date}T00:00:00Z`))
		: undefined;
	return {
		href: post.url,
		title: post.title,
		meta: [new URL(post.url).host, date].filter(Boolean).join(" · "),
		active: false,
		external: true,
	};
}

/** The page call as a card: in progress while the reply streams and the
 *  follow waits, then what happened, or where it goes when the visitor's own
 *  action cancelled it. Nothing when it would point at where they are. */
export function pageCard(
	output: OpenPageOutput,
	state: { pending: boolean; moved: PageMove | undefined; pagePath: string },
): SourceCard | null {
	const { href, label, section } = output;
	const samePage = state.pagePath === href;
	if (samePage && !section && !state.moved) return null;
	const card = {
		href: section ? `${href}#${section.id}` : href,
		title: label,
		active: false,
		external: false,
	};
	if (state.pending) {
		const meta =
			samePage && section
				? `Scrolling to ${section.label}`
				: section
					? `Opening at ${section.label}`
					: "Opening";
		return { ...card, meta, active: true };
	}
	if (state.moved === "scrolled" && section)
		return { ...card, meta: `Scrolled to ${section.label}` };
	if (state.moved === "opened")
		return {
			...card,
			meta: section ? `Opened at ${section.label}` : "Opened",
		};
	const path = `andrei.bio${href}`;
	return { ...card, meta: section ? `${section.label} · ${path}` : path };
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
