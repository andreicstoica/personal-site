import { Chat } from "@ai-sdk/svelte";
import { DefaultChatTransport } from "ai";
import type { ChatTurn, GuideUIMessage } from "./chatTypes";

export type GuideChat = Chat<GuideUIMessage>;

/** The panel imports this module on demand. Its static imports let the
 *  bundler keep only the parts of the SDK the chat uses; a dynamic import of
 *  "ai" itself would pull in the whole package. */
export function createGuideChat(options: {
	messages: GuideUIMessage[];
	body: (messages: GuideUIMessage[]) => { messages: ChatTurn[]; page: string };
	onFinish: (message: GuideUIMessage, completed: boolean) => void;
}): GuideChat {
	return new Chat<GuideUIMessage>({
		messages: options.messages,
		transport: new DefaultChatTransport<GuideUIMessage>({
			api: "/api/chat",
			prepareSendMessagesRequest: ({ messages }) => ({
				body: options.body(messages),
			}),
		}),
		onFinish: ({ message, isAbort, isDisconnect, isError }) => {
			options.onFinish(message, !(isAbort || isDisconnect || isError));
		},
	});
}
