import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: SourceDisplay[];
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

interface SourceDisplay {
  source: string;
  score: number;
}

export default function FullPageChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const checkServerHealth = async () => {
    try {
      const response = await fetch("/api/health");
      setServerStatus(response.ok ? "online" : "offline");
    } catch {
      setServerStatus("offline");
    }
  };

  const addMessage = (content: string, role: "user" | "assistant", sources?: SourceDisplay[]) => {
    setMessages((prev) => [...prev, { role, content, sources }]);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || serverStatus !== "online") return;

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

      addMessage(data.response, "assistant", data.sources);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      addMessage(`Error: ${msg}`, "assistant");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkServerHealth();
  }, []);

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
              {serverStatus === "checking" && "Checking server status..."}
              {serverStatus === "online" &&
                "Ask me anything about my work, projects, or background!"}
              {serverStatus === "offline" && (
                <div className="text-gray-500">
                  The inference server is currently down (it's expensive to
                  run!)
                  <br />
                  Check back later or reach out directly.
                </div>
              )}
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
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
              {message.sources && message.sources.length > 0 && (
                <div className="mt-2 text-xs text-gray-500 max-w-[80%] sm:max-w-md">
                  <div className="text-gray-400 mb-1">Sources:</div>
                  {message.sources.map((source, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="font-mono text-xs">{source.source.replace('.txt', '')}</span>
                      <span className="text-gray-300">({(source.score * 100).toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              )}
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
            placeholder={
              serverStatus === "offline"
                ? "Server is offline..."
                : "Type your message..."
            }
            className="flex-1 px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 disabled:bg-gray-100 disabled:cursor-not-allowed"
            style={{ borderRadius: 0 }}
            disabled={isLoading || serverStatus !== "online"}
            required
          />
          <button
            type="submit"
            disabled={isLoading || serverStatus !== "online"}
            className="px-6 py-3 text-sm border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-800"
            style={{ borderRadius: 0 }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
