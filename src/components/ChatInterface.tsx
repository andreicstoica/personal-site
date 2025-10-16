import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history: Message[];
}

interface ChatResponse {
  response: string;
  sources: Array<{ source: string; score: number }>;
  error?: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (content: string, role: "user" | "assistant") => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    addMessage(userMessage, "user");
    setInput("");
    setIsLoading(true);

    try {
      const requestBody: ChatRequest = {
        message: userMessage,
        history: messages,
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data: ChatResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      addMessage(data.response, "assistant");
    } catch (error) {
      console.error("Chat error:", error);
      addMessage(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        "assistant"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Chat with Andrei</h1>

      <div className="bg-gray-50 rounded-lg p-4 mb-4 h-96 overflow-y-auto">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-gray-500 text-sm">
              Ask me anything about my work, projects, or background!
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-800 border"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 border px-4 py-2 rounded-lg">
                Thinking...
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
          required
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
