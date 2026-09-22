<script lang="ts">
  import { onMount } from "svelte";
  import { assertNever } from "../../lib/assertNever";
  import {
    isColdStart,
    parseChatApiSuccess,
    type ChatAction,
    type ChatMode,
    type ChatSource,
  } from "../../lib/chatTypes";
  import Icon from "../ui/Icon.svelte";

  type GuideMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: ChatSource[];
    action?: ChatAction;
  };

  const storageKey = "andrei-guide-v1";
  const prompts = ["What are you working on?", "Show me Refract", "What's in your canon?"];

  let open = $state(false);
  let messages = $state<GuideMessage[]>([]);
  let input = $state("");
  let sending = $state(false);
  let waking = $state(false);
  let mode = $state<ChatMode | null>(null);
  let hydrated = $state(false);
  let inputRef = $state<HTMLInputElement | null>(null);
  let threadRef = $state<HTMLDivElement | null>(null);
  let rootRef = $state<HTMLDivElement | null>(null);
  let followTimer: ReturnType<typeof setTimeout> | undefined;

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function parseStoredMessage(value: unknown): GuideMessage | null {
    if (!isRecord(value)) return null;
    if (typeof value.id !== "string" || typeof value.content !== "string") return null;
    if (value.role !== "user" && value.role !== "assistant") return null;
    const wrapped = parseChatApiSuccess({
      response: value.content,
      mode: "notes",
      sources: value.sources ?? [],
      action: value.action ?? { kind: "none" },
    });
    if (!wrapped) return null;
    return {
      id: value.id,
      role: value.role,
      content: value.content,
      sources: wrapped.sources,
      action: wrapped.action,
    };
  }

  function readStored(): { open: boolean; messages: GuideMessage[] } | null {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || typeof parsed.open !== "boolean" || !Array.isArray(parsed.messages)) {
        return null;
      }
      const restored: GuideMessage[] = [];
      for (const item of parsed.messages) {
        const message = parseStoredMessage(item);
        if (!message) return null;
        restored.push(message);
      }
      return { open: parsed.open, messages: restored };
    } catch {
      return null;
    }
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  function actionHref(action: ChatAction | undefined): string | undefined {
    if (!action || action.kind !== "navigate") return undefined;
    return action.href;
  }

  function errorText(value: unknown): string {
    if (isRecord(value) && typeof value.error === "string") return value.error;
    return "The guide couldn't answer.";
  }

  function scheduleFollow(action: ChatAction) {
    if (action.kind !== "navigate" || !action.follow) return;
    if (window.location.pathname === action.href) return;
    if (followTimer) clearTimeout(followTimer);
    followTimer = setTimeout(() => {
      window.location.assign(action.href);
    }, 900);
  }

  async function postChat(body: { message: string; history: Array<{ role: "user" | "assistant"; content: string }>; notesOnly?: boolean }) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload: unknown = await response.json().catch(() => null);
    return { response, payload };
  }

  const send = async (text: string) => {
    const userMessage = text.trim();
    if (!userMessage || sending) return;
    const history = messages.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    }));
    messages = [
      ...messages,
      { id: crypto.randomUUID(), role: "user", content: userMessage },
    ];
    input = "";
    sending = true;
    waking = false;
    const wakeHint = setTimeout(() => {
      waking = true;
    }, 1200);

    try {
      const request = { message: userMessage, history };
      const delays = [0, 2000, 4000, 8000];
      let response: Response | null = null;
      let payload: unknown = null;
      for (const delay of delays) {
        if (delay > 0) {
          waking = true;
          await sleep(delay);
        }
        const result = await postChat(request);
        response = result.response;
        payload = result.payload;
        if (response.status !== 503 || !isColdStart(payload)) break;
      }
      if (response?.status === 503 && isColdStart(payload)) {
        waking = true;
        const notes = await postChat({ ...request, notesOnly: true });
        response = notes.response;
        payload = notes.payload;
      }
      const parsed = parseChatApiSuccess(payload);
      if (!response?.ok || !parsed) {
        messages = [
          ...messages,
          { id: crypto.randomUUID(), role: "assistant", content: errorText(payload) },
        ];
        return;
      }
      mode = parsed.mode;
      messages = [
        ...messages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: parsed.response,
          sources: parsed.sources,
          action: parsed.action,
        },
      ];
      scheduleFollow(parsed.action);
    } catch {
      messages = [
        ...messages,
        { id: crypto.randomUUID(), role: "assistant", content: "The guide couldn't answer." },
      ];
    } finally {
      clearTimeout(wakeHint);
      sending = false;
      waking = false;
    }
  };

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    void send(input);
  };

  const onWindowKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") open = false;
  };

  const onWindowClick = (event: MouseEvent) => {
    if (!open || !rootRef) return;
    if (event.target instanceof Node && rootRef.contains(event.target)) return;
    open = false;
  };

  onMount(() => {
    const stored = readStored();
    if (stored) {
      messages = stored.messages;
      open = stored.open;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("chat") === "1") {
      open = true;
      const url = new URL(window.location.href);
      url.searchParams.delete("chat");
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", next);
    }
    hydrated = true;
    return () => {
      if (followTimer) clearTimeout(followTimer);
    };
  });

  $effect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ open, messages: messages.slice(-30) }),
    );
  });

  $effect(() => {
    if (!open && followTimer) {
      clearTimeout(followTimer);
      followTimer = undefined;
    }
  });

  $effect(() => {
    if (!open) return;
    inputRef?.focus();
  });

  $effect(() => {
    void messages.length;
    void sending;
    if (threadRef) threadRef.scrollTop = threadRef.scrollHeight;
  });
</script>

<svelte:window onkeydown={onWindowKeydown} onclick={onWindowClick} />

<div
  bind:this={rootRef}
  class="fixed z-[70] right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] flex flex-col items-end gap-3"
>
  {#if open}
    <div
      id="guide-panel"
      role="dialog"
      aria-label="Ask Andrei"
      class="flex flex-col w-[min(24rem,calc(100vw-2rem))] h-[min(32rem,calc(100dvh-6.5rem))] border border-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] shadow-lg rounded-none"
    >
      <header class="flex items-start justify-between gap-3 border-b border-[var(--color-bg-secondary)] px-4 py-3">
        <div>
          <div class="text-sm font-medium text-[var(--color-text-primary)]">Ask Andrei</div>
          <div class="text-xs text-[var(--color-text-secondary)]">
            {#if mode === null}
              Projects, work, and the site
            {:else if mode === "model"}
              From the model
            {:else if mode === "notes"}
              From site notes
            {:else}
              {assertNever(mode)}
            {/if}
          </div>
        </div>
        <button
          type="button"
          class="text-[var(--color-text-primary)] hover:text-[var(--color-primary)]"
          aria-label="Close guide"
          onclick={() => (open = false)}
        >
          <Icon name="close" class="w-5 h-5" />
        </button>
      </header>

      <div bind:this={threadRef} class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {#if messages.length === 0}
          <p class="text-sm text-[var(--color-text-secondary)]">
            Ask about a project or a job. Say “show me Refract” and I'll open the page.
          </p>
          <div class="flex flex-col gap-2">
            {#each prompts as prompt (prompt)}
              <button
                type="button"
                class="text-left text-sm px-3 py-2 border border-[var(--color-bg-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] rounded-none"
                onclick={() => void send(prompt)}
              >
                {prompt}
              </button>
            {/each}
          </div>
        {/if}

        {#each messages as message (message.id)}
          <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
            <div
              class="max-w-[85%] px-3 py-2 text-sm border rounded-none whitespace-pre-wrap {message.role === 'user'
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-white text-[var(--color-text-primary)] border-[var(--color-bg-secondary)]'}"
            >
              <div>{message.content}</div>
              {#if message.role === "assistant" && message.sources && message.sources.length > 0}
                <div class="mt-2 pt-2 border-t border-[var(--color-bg-secondary)] flex flex-wrap gap-x-2 gap-y-1">
                  {#each message.sources as source (`${source.title}:${source.href ?? ""}`)}
                    {#if source.href && source.href !== actionHref(message.action)}
                      <a href={source.href} class="text-[11px] text-[var(--color-primary)] underline">
                        {source.title}
                      </a>
                    {:else if !source.href}
                      <span class="text-[11px] text-[var(--color-text-muted)]">{source.title}</span>
                    {/if}
                  {/each}
                </div>
              {/if}
              {#if message.action?.kind === "navigate"}
                <a
                  href={message.action.href}
                  class="mt-2 inline-flex text-xs px-2 py-1 border border-current rounded-none"
                >
                  {message.action.follow ? "Opening" : "Open"}
                  {message.action.label}
                </a>
              {/if}
            </div>
          </div>
        {/each}

        {#if sending}
          <div class="text-sm text-[var(--color-text-secondary)]">
            {waking ? "Waking the model…" : "Thinking…"}
          </div>
        {/if}
      </div>

      <form onsubmit={onSubmit} class="flex gap-2 border-t border-[var(--color-bg-secondary)] p-3">
        <label class="sr-only" for="guide-input">Message</label>
        <input
          id="guide-input"
          bind:this={inputRef}
          bind:value={input}
          type="text"
          autocomplete="off"
          placeholder="Ask about a project…"
          disabled={sending}
          class="flex-1 min-w-0 px-3 py-2 text-sm border border-[var(--color-bg-secondary)] bg-white text-[var(--color-text-primary)] rounded-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={sending || input.trim().length === 0}
          class="px-3 py-2 text-sm border border-[var(--color-primary)] bg-[var(--color-primary)] text-white rounded-none disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  {/if}

  {#if !open}
    <button
      type="button"
      class="inline-flex items-center gap-2 h-12 px-4 bg-[var(--color-primary)] text-white border border-[var(--color-primary)] rounded-none shadow-lg"
      aria-expanded="false"
      aria-controls="guide-panel"
      onclick={() => (open = true)}
    >
      <Icon name="chat" class="w-5 h-5" />
      <span class="text-sm">Ask</span>
    </button>
  {/if}
</div>
