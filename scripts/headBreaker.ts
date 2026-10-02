import { type DefaultTreeAdapterMap, parse } from "parse5";

type Element = DefaultTreeAdapterMap["element"];
type ChildNode = DefaultTreeAdapterMap["childNode"];

function child(parent: { childNodes: ChildNode[] }, tag: string): Element | undefined {
	return parent.childNodes.find(
		(node): node is Element => "tagName" in node && node.tagName === tag,
	);
}

function describe(node: ChildNode | undefined): string {
	if (!node) return "unknown";
	if ("tagName" in node) return `<${node.tagName}>`;
	if ("value" in node) return `text ${JSON.stringify(node.value.trim().slice(0, 40))}`;
	return node.nodeName;
}

/** The node that ended <head> early, or null when the head closed at its own
 *  end tag or at an explicit <body> (the end tag is optional, and Astro's
 *  redirect pages omit it). When the parser closes the head early it opens the
 *  body for the offending node, so that node is the body's first child and
 *  starts before any <body> tag in the source. */
export function headBreaker(html: string): string | null {
	const doc = parse(html, { sourceCodeLocationInfo: true });
	const root = child(doc, "html");
	const head = root && child(root, "head");
	if (!root || !head) return "no <head>";
	if (head.sourceCodeLocation?.endTag) return null;
	const body = child(root, "body");
	const first = body?.childNodes.find(
		(node) => !("value" in node) || node.value.trim() !== "",
	);
	if (!first) return null;
	const bodyTag = body?.sourceCodeLocation?.startTag;
	const firstStart = first.sourceCodeLocation?.startOffset ?? 0;
	if (bodyTag && firstStart >= bodyTag.endOffset) return null;
	return describe(first);
}
