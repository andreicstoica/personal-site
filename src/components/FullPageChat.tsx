import { useEffect, useRef, useState } from "react";

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

export default function FullPageChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addMessage = (content: string, role: "user" | "assistant") => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data: ChatResponse = await response.json();
      if (data.error) throw new Error(data.error);

      addMessage(data.response, "assistant");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      addMessage(`Error: ${msg}`, "assistant");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col h-[calc(100vh-80px)]">
      {/* Messages Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-[var(--color-text-secondary)] text-sm py-8">
              Ask me anything about my work, projects, or background!
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] sm:max-w-md px-4 py-3 text-sm border ${
                  message.role === "user"
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                    : "bg-white text-gray-800 border-gray-300"
                }`}
                style={{ borderRadius: 0 }}
              >
                {message.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div
                className="max-w-[80%] sm:max-w-md px-4 py-3 text-sm border bg-white text-gray-800 border-gray-300"
                style={{ borderRadius: 0 }}
              >
                Thinking...
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
            style={{ borderRadius: 0 }}
            disabled={isLoading}
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 text-sm border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors text-gray-800"
            style={{ borderRadius: 0 }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
