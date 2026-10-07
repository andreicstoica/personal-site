import { checkBotId } from "botid/server";

/** The header `bun run guide:eval` sends, so the eval can reach a protected
 *  deployment without a browser. Its value is the GUIDE_EVAL_TOKEN secret. */
export const EVAL_HEADER = "x-guide-eval";

/** Whether a chat request comes from a script rather than a browser running
 *  the site. BotID's client challenge runs on the page; a script calling the
 *  API directly carries no answer to it. BotID reports every request as human
 *  in local development. If the check itself fails, the request goes through:
 *  the firewall's rate limit still caps it. */
export async function isAutomated(
	request: Request,
	evalToken: string | undefined,
): Promise<boolean> {
	if (evalToken && request.headers.get(EVAL_HEADER) === evalToken) return false;
	try {
		const verdict = await checkBotId({
			advancedOptions: { headers: Object.fromEntries(request.headers) },
		});
		return verdict.isBot;
	} catch (error) {
		console.error("BotID check failed:", error);
		return false;
	}
}
