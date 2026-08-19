<script lang="ts">
  import { onMount } from "svelte";
  import { assertNever } from "../../lib/assertNever";
  import type { ChatRole, ChatServerStatus } from "../../lib/types";
  import Icon from "../ui/Icon.svelte";

  interface SourceMetadata {
    sourceUrl?: string;
    title?: string;
    [key: string]: unknown;
  }

  interface Message {
    role: ChatRole;
    content: string;
    sources?: Array<{
      source: string;
      score: number;
      metadata?: SourceMetadata;
      confidence?: string;
    }>;
  }

  interface ChatRequest {
    message: string;
    history: Message[];
  }

  interface ChatResponse {
    response: string;
    sources: Array<{
      source: string;
      score: number;
      metadata?: SourceMetadata;
      confidence?: string;
    }>;
    error?: string;
  }

  let messages = $state<Message[]>([]);
  let input = $state("");
  let isLoading = $state(false);
  let serverStatus = $state<ChatServerStatus>("checking");
  let messagesEndRef: HTMLDivElement;
  let inputRef: HTMLInputElement;

  const checkServerHealth = async () => {
    try {
      const response = await fetch("/api/health");
      serverStatus = response.ok ? "online" : "offline";
    } catch {
      serverStatus = "offline";
    }
  };

  const focusInput = () => {
    if (inputRef) {
      inputRef.focus();
    }
  };

  const addMessage = (
    content: string,
    role: ChatRole,
    sources?: Array<{
      source: string;
      score: number;
      metadata?: SourceMetadata;
      confidence?: string;
    }>
  ) => {
    messages = [...messages, { role, content, sources }];
  };

  const _handleSubmit = async (event?: SubmitEvent) => {
    event?.preventDefault();
    if (!input.trim() || isLoading || serverStatus !== "online") return;

    const userMessage = input.trim();
    addMessage(userMessage, "user");
    input = "";
    isLoading = true;

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
      isLoading = false;
      // Small delay to ensure input is re-enabled before focusing
      setTimeout(focusInput, 10);
    }
  };

  onMount(() => {
    checkServerHealth();
    focusInput();
  });

  $effect(() => {
    if (messagesEndRef) {
      messagesEndRef.scrollIntoView({ behavior: "smooth" });
    }
  });
</script>

<div class="w-full max-w-3xl mx-auto flex flex-col h-[calc(100vh-80px)]">
  <!-- Messages Area -->
  <div class="flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-gutter-stable">
    <div class="space-y-4">
      {#if messages.length === 0}
        <div class="text-center text-[var(--color-text-secondary)] text-sm py-8">
          {#if serverStatus === "checking"}
            Checking server status...
          {:else if serverStatus === "online"}
            Ask me anything about my work, projects, or background!
          {:else if serverStatus === "offline"}
            <div class="text-gray-500">
              The inference server is currently down - it is expensive to
              run!
              <br />
              <br />
              Reach out directly and I'll spin it up for you:
              <br />
              <em>andrei c stoica (at) icloud (dot) com</em>
            </div>
          {:else}
            {assertNever(serverStatus)}
          {/if}
        </div>
      {/if}

      {#each messages as message, index}
        <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div
            class="max-w-[80%] sm:max-w-md px-4 py-3 text-sm border {message.role === 'user'
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-white text-gray-800 border-gray-300'}"
            style="border-radius: 0"
          >
            <div>{message.content}</div>
            {#if message.sources && message.sources.length > 0}
              <div class="mt-2 pt-2 border-t border-gray-200">
                <div class="text-[10px] text-gray-400 mb-1">
                  Sources:
                </div>
                <div class="space-y-0.5">
                  {#each message.sources as source, sourceIndex}
                    {@const confidenceColor = source.confidence === "high"
                      ? "text-green-600"
                      : source.confidence === "medium"
                        ? "text-yellow-600"
                        : "text-red-600"}
                    {@const sourceUrl = source.metadata?.sourceUrl}
                    {@const displayName = source.metadata?.title || source.source.replace(".txt", "")}

                    <div class="text-[10px] text-gray-500 flex items-center gap-1">
                      <span class="font-medium {confidenceColor}">
                        {source.confidence?.toUpperCase() || "LOW"}
                      </span>
                      <span>•</span>
                      {#if sourceUrl}
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          {displayName}
                          <Icon name="external-link" class="w-3 h-3 shrink-0" />
                        </a>
                      {:else}
                        <span>{displayName}</span>
                      {/if}
                      <span class="text-gray-400">
                        ({(source.score * 100).toFixed(1)}%)
                      </span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/each}

      {#if isLoading}
        <div class="flex justify-start">
          <div
            class="max-w-[80%] sm:max-w-md px-4 py-3 text-sm border bg-white text-gray-800 border-gray-300"
            style="border-radius: 0"
          >
            Thinking...
          </div>
        </div>
      {/if}
    </div>
    <div bind:this={messagesEndRef}></div>
  </div>

  <!-- Input Area -->
  <div class="p-4 sm:p-6">
    <form onsubmit={_handleSubmit} class="flex gap-3">
      <input
        bind:this={inputRef}
        bind:value={input}
        type="text"
        placeholder={serverStatus === "offline"
          ? "Server is offline..."
          : "Type your message..."}
        class="flex-1 px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 disabled:bg-gray-100 disabled:cursor-not-allowed"
        style="border-radius: 0"
        disabled={isLoading || serverStatus !== "online"}
        required
      />
      <button
        type="submit"
        disabled={isLoading || serverStatus !== "online"}
        class="px-6 py-3 text-sm border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-800"
        style="border-radius: 0"
      >
        Send
      </button>
    </form>
  </div>
</div>
