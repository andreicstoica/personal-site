<script lang="ts">
  import { onMount, tick } from "svelte";
  import { navigate } from "astro:transitions/client";
  import { renderChatMarkdown } from "../../lib/chatMarkdown";
  import {
    parseChatApiSuccess,
    parseChatEvent,
    type ChatAction,
    type ChatEvent,
    type ChatSource,
  } from "../../lib/chatTypes";
  import { starterPrompts } from "../../lib/guidePrompts";
  import { GUIDE_STORAGE_KEY } from "../../lib/guideState";
  import { routeByHref } from "../../lib/memorySelect";
  import Icon from "../ui/Icon.svelte";
  import GuideSteps, { type GuideStep } from "./GuideSteps.svelte";

  type GuideMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: ChatSource[];
    action?: ChatAction;
    notice?: string;
  };

  /** What the server has reported for the turn in flight. */
  type PendingTurn = { sources: ChatSource[] | null; writing: boolean };

  const storageKey = GUIDE_STORAGE_KEY;
  /** Steps that land together still reveal one at a time, so the chain reads
   *  in order. Only the pacing is client-side; every step comes from the server. */
  const STEP_MS = 300;

  let open = $state(false);
  let messages = $state<GuideMessage[]>([]);
  let input = $state("");
  let sending = $state(false);
  let pending = $state<PendingTurn | null>(null);
  let pagePath = $state("/");
  let hydrated = $state(false);
  let inputRef = $state<HTMLInputElement | null>(null);
  let threadRef = $state<HTMLDivElement | null>(null);
  let rootRef = $state<HTMLDivElement | null>(null);
  let panelRef = $state<HTMLDivElement | null>(null);
  let launchRef = $state<HTMLButtonElement | null>(null);
  let noSlide = $state(false);
  let followTimer: ReturnType<typeof setTimeout> | undefined;
  let stopIntentWatch: (() => void) | undefined;
  let abortRef: AbortController | null = null;

  const viewing = $derived(routeByHref(pagePath));

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
      notice: value.notice,
    });
    if (!wrapped) return null;
    return {
      id: value.id,
      role: value.role,
      content: value.content,
      sources: wrapped.sources,
      action: wrapped.action,
      notice: wrapped.notice,
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

  function isAbortError(value: unknown): boolean {
    return value instanceof DOMException && value.name === "AbortError";
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /** The steps a finished turn took: one search, then one line per note read. */
  function doneSteps(sources: ChatSource[]): GuideStep[] {
    return [
      { icon: "search", label: "Searched notes", status: "complete" },
      ...sources.map((source): GuideStep => ({
        icon: "file",
        label: `Read ${source.title}`,
        status: "complete",
      })),
    ];
  }

  function pendingSteps(turn: PendingTurn): GuideStep[] {
    if (turn.sources === null) {
      return [{ icon: "search", label: "Searching notes", status: "active" }];
    }
    const steps = doneSteps(turn.sources);
    if (turn.writing) steps.push({ icon: "chat", label: "Writing reply", status: "active" });
    return steps;
  }

  /** NDJSON: one event per line. A line can arrive split across chunks. */
  async function* readEvents(response: Response): AsyncGenerator<ChatEvent> {
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        const event = line ? parseChatEvent(JSON.parse(line)) : null;
        if (event) yield event;
        newline = buffer.indexOf("\n");
      }
      if (done) return;
    }
  }

  /** History is capped at 30 to match what sessionStorage keeps, so a
   *  restored thread is never shorter than the live one. */
  function appendMessage(message: GuideMessage) {
    messages = [...messages, message].slice(-30);
  }

  function appendReply(content: string, extra: Partial<GuideMessage> = {}) {
    appendMessage({ id: crypto.randomUUID(), role: "assistant", content, ...extra });
  }

  // Outside clicks move focus to the clicked element before this runs, so the
  // focus hand-back below only has to cover closes triggered from inside.
  function closeGuide() {
    const focusWasInside =
      rootRef !== null &&
      document.activeElement instanceof Node &&
      rootRef.contains(document.activeElement);
    abortRef?.abort();
    open = false;
    // The launcher is hidden while the guide is open; wait a tick
    // so it is visible and focusable again before handing focus back.
    if (focusWasInside) void tick().then(() => launchRef?.focus());
  }

  function errorText(value: unknown): string {
    if (isRecord(value) && typeof value.error === "string") return value.error;
    return "The guide couldn't answer.";
  }

  /** On touch, focusing the input would raise the keyboard, so focus the
   *  dialog instead and let assistive tech land inside the panel. */
  function focusComposer() {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (finePointer) inputRef?.focus();
    else panelRef?.focus();
  }

  /** Drops the thread and anything in flight, back to the starter prompts. */
  function newChat() {
    abortRef?.abort();
    cancelFollow();
    messages = [];
    pending = null;
    input = "";
    // The restart button unmounts with the thread; keep focus in the panel.
    focusComposer();
  }

  function sendPrompt(text: string) {
    // The clicked row unmounts with the empty state; keep focus in the panel.
    focusComposer();
    void send(text);
  }

  /** Any sign the visitor is doing something else cancels a pending follow:
   *  a pointer down, a wheel or touch scroll, a key press, or a text
   *  selection. Focus alone is not a signal; it stays in the input by design. */
  function watchIntent(onIntent: () => void): () => void {
    const events = ["pointerdown", "wheel", "touchmove", "keydown"] as const;
    const onSelection = () => {
      if (document.getSelection()?.isCollapsed === false) onIntent();
    };
    for (const type of events) {
      window.addEventListener(type, onIntent, { capture: true, passive: true });
    }
    document.addEventListener("selectionchange", onSelection);
    return () => {
      for (const type of events) window.removeEventListener(type, onIntent, { capture: true });
      document.removeEventListener("selectionchange", onSelection);
    };
  }

  function scheduleFollow(action: ChatAction) {
    if (action.kind !== "navigate" || !action.follow) return;
    if (window.location.pathname === action.href) return;
    cancelFollow();
    stopIntentWatch = watchIntent(cancelFollow);
    followTimer = setTimeout(() => {
      const draft = input.trim().length > 0;
      cancelFollow();
      // Never yank the page out from under a question the visitor is typing.
      if (draft) return;
      // ClientRouter, not a full load: a reload would tear the thread down and
      // rebuild it from storage, dropping scroll and focus for no reason.
      void navigate(action.href);
    }, 900);
  }


  const send = async (text: string) => {
    const userMessage = text.trim();
    if (!userMessage || sending) return;
    const history = messages.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    }));
    appendMessage({ id: crypto.randomUUID(), role: "user", content: userMessage });
    input = "";
    sending = true;
    pending = { sources: null, writing: false };
    const controller = new AbortController();
    abortRef = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, history, page: pagePath }),
        signal: controller.signal,
      });
      if (!response.ok) {
        appendReply(errorText(await response.json().catch(() => null)));
        return;
      }
      let shownAt = performance.now();
      let replied = false;
      for await (const event of readEvents(response)) {
        const wait = shownAt + STEP_MS - performance.now();
        if (wait > 0) await sleep(wait);
        if (controller.signal.aborted) return;
        shownAt = performance.now();
        if (event.type === "searched") {
          pending = { sources: event.sources, writing: false };
        } else if (event.type === "writing") {
          pending = { sources: pending?.sources ?? [], writing: true };
        } else {
          // The reply takes the steps' place in the same frame.
          pending = null;
          replied = true;
          appendReply(event.reply.response, {
            sources: event.reply.sources,
            action: event.reply.action,
            notice: event.reply.notice,
          });
          scheduleFollow(event.reply.action);
        }
      }
      if (!replied) appendReply("The guide couldn't answer.");
    } catch (error) {
      // A cancelled turn is the visitor's own doing — don't narrate it.
      if (!isAbortError(error)) appendReply("The guide couldn't answer.");
    } finally {
      if (abortRef === controller) abortRef = null;
      pending = null;
      sending = false;
    }
  };

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    void send(input);
  };

  const onWindowKeydown = (event: KeyboardEvent) => {
    if (!open || event.key !== "Escape") return;
    closeGuide();
  };

  function cancelFollow(): void {
    if (followTimer) clearTimeout(followTimer);
    followTimer = undefined;
    stopIntentWatch?.();
    stopIntentWatch = undefined;
  }

  /** `/chat` redirects here with `?chat=1`, so this can arrive on any
   *  navigation now that the island persists instead of remounting. */
  function onPageLoad(): void {
    pagePath = window.location.pathname;
    openFromUrl();
  }

  function openFromUrl(): void {
    const url = new URL(window.location.href);
    if (url.searchParams.get("chat") !== "1") return;
    open = true;
    url.searchParams.delete("chat");
    // Keep Astro's history metadata: it tracks the index it needs to tell a
    // push from a traverse, and replacing it with {} breaks that.
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  onMount(() => {
    let alive = true;
    // Only hydration restores onto an already-styled element (the drawer is
    // open in the markup), so the slide is suppressed just for that frame.
    // Persisting the island means later navigations keep the same element, and
    // this flag never has to come back.
    noSlide = true;
    const stored = readStored();
    if (stored) {
      messages = stored.messages;
      open = stored.open;
    }
    onPageLoad();
    // The island no longer remounts, so mount-time work that navigation can
    // invalidate has to re-arm: a follow can land on the next page, and a
    // manual navigation must cancel a pending one instead of racing it.
    document.addEventListener("astro:page-load", onPageLoad);
    document.addEventListener("astro:before-preparation", cancelFollow);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (alive) noSlide = false;
      });
    });
    hydrated = true;
    return () => {
      alive = false;
      cancelFollow();
      abortRef?.abort();
      document.removeEventListener("astro:page-load", onPageLoad);
      document.removeEventListener("astro:before-preparation", cancelFollow);
    };
  });

  $effect(() => {
    if (!hydrated) return;
    // Private-mode and storage-quota failures are not worth breaking an effect
    // over; the guide just stops surviving a reload.
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ open, messages: messages.slice(-30) }),
      );
    } catch {
      // Storage unavailable.
    }
  });

  // The page reserves room for the open drawer (global.css). SiteLayout mirrors
  // this attribute onto each incoming document before the swap paints.
  $effect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.dataset.guide = open ? "open" : "closed";
    if (noSlide) root.dataset.guideInstant = "";
    else delete root.dataset.guideInstant;
  });

  $effect(() => {
    if (!open) cancelFollow();
  });


  $effect(() => {
    if (!open || typeof window === "undefined") return;
    focusComposer();
  });

  $effect(() => {
    void open;
    void messages.length;
    void pending;
    if (!threadRef) return;
    const distanceFromBottom =
      threadRef.scrollHeight - threadRef.scrollTop - threadRef.clientHeight;
    if (distanceFromBottom < 60 || threadRef.scrollTop === 0) {
      threadRef.scrollTop = threadRef.scrollHeight;
    }
  });
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div
  bind:this={rootRef}
  class="guide-dock"
  data-open={open ? "true" : "false"}
  data-no-slide={noSlide ? "true" : "false"}
>
  <div
    id="guide-panel"
    role="dialog"
    aria-label="Ask Andrei"
    tabindex="-1"
    bind:this={panelRef}
    class="guide-panel"
  >
    <header class="guide-header flex items-center justify-between gap-3 px-4 py-2.5">
      <span class="text-sm font-medium text-[var(--color-text-primary)]">Ask Andrei</span>
      <div class="flex items-center gap-1">
        {#if messages.length > 0 || sending}
          <button
            type="button"
            class="guide-icon-button guide-restart"
            aria-label="New chat"
            title="New chat"
            onclick={newChat}
          >
            <Icon name="reload" class="w-4 h-4" />
          </button>
        {/if}
        <button
          type="button"
          class="guide-icon-button"
          aria-label="Close guide"
          onclick={closeGuide}
        >
          <Icon name="close" class="w-4 h-4" />
        </button>
      </div>
    </header>

    <div
      bind:this={threadRef}
      class="guide-thread flex-1 overflow-y-auto px-4 py-3 space-y-3"
      role="log"
      aria-live="polite"
      aria-busy={sending}
    >
      {#each messages as message (message.id)}
        {#if message.role === "user"}
          <div class="flex justify-end">
            <div class="max-w-[85%] px-3 py-2 text-sm break-words whitespace-pre-wrap bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
              {message.content}
            </div>
          </div>
        {:else}
          <div class="space-y-2 text-sm break-words text-[var(--color-text-primary)]">
            {#if message.sources && message.sources.length > 0}
              <GuideSteps steps={doneSteps(message.sources)} />
            {/if}
            <div class="guide-md">{@html renderChatMarkdown(message.content)}</div>
            {#if message.notice}
              <p class="text-xs text-[var(--color-text-secondary)]">{message.notice}</p>
            {/if}
            {#if message.action?.kind === "navigate"}
              <a href={message.action.href} class="inline-block text-xs text-[var(--color-text-secondary)]">
                {message.action.label} →
              </a>
            {/if}
          </div>
        {/if}
      {/each}

      {#if pending}
        <GuideSteps steps={pendingSteps(pending)} />
      {/if}
    </div>

    {#if messages.length === 0}
      <ul class="guide-prompts px-1" aria-label="Suggested questions">
        {#each starterPrompts as prompt (prompt.text)}
          <li>
            <button type="button" class="guide-prompt" onclick={() => sendPrompt(prompt.text)}>
              <Icon name={prompt.icon} class="w-4 h-4 shrink-0" />
              <span>{prompt.text}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <form onsubmit={onSubmit} class="guide-composer m-3">
      <label class="sr-only" for="guide-input">Message</label>
      <input
        aria-describedby={viewing ? "guide-context" : undefined}
        id="guide-input"
        bind:this={inputRef}
        bind:value={input}
        type="text"
        autocomplete="off"
        placeholder="Ask me anything…"
        class="guide-input w-full px-3 pt-2.5 pb-1 bg-transparent text-[var(--color-text-primary)] rounded-none"
      />
      <div class="flex items-center justify-between gap-2 pl-3 pr-1.5 pb-1.5">
        {#if viewing}
          <p id="guide-context" class="guide-context">
            <Icon name="file" class="w-3.5 h-3.5 shrink-0" />
            <span class="truncate">Viewing <span class="text-[var(--color-text-primary)]">{viewing.label}</span></span>
          </p>
        {:else}
          <span></span>
        {/if}
        <!-- aria-disabled, not disabled: a focused control that becomes disabled
             drops focus to <body>. send() ignores empty and in-flight submits. -->
        <button
          type="submit"
          aria-label="Send"
          aria-disabled={sending || input.trim().length === 0}
          class="guide-send"
        >
          <Icon name="arrow-up" class="w-4 h-4" />
        </button>
      </div>
    </form>
  </div>

  <button
    type="button"
    class="guide-launch"
    bind:this={launchRef}
    aria-expanded={open}
    aria-controls="guide-panel"
    inert={open}
    aria-label={open ? "Close guide" : "Ask Andrei"}
    onclick={(event) => {
      event.stopPropagation();
      open = !open;
    }}
    oncontextmenu={(event) => {
      if (!import.meta.env.DEV) return;
      event.preventDefault();
      window.dispatchEvent(new CustomEvent("weather-lab:toggle"));
    }}
  >
    <Icon name={open ? "close" : "chat"} class="w-4 h-4" />
  </button>
</div>

<style>
  .guide-dock {
    position: fixed;
    z-index: 70;
    right: max(var(--guide-launch-inset), env(safe-area-inset-right, 0px));
    bottom: max(var(--guide-launch-inset), env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    pointer-events: none;
  }

  .guide-panel,
  .guide-launch {
    pointer-events: auto;
  }

  /* One surface, two geometries: a bottom sheet on phones and a right drawer
     on desktop. Both slide in from --guide-hide on the same ease-in-out and
     duration in both directions, matching the page shift (global.css), and
     hide with visibility once the slide ends. */
  .guide-panel {
    position: fixed;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    border: none;
    transform: var(--guide-hide);
    visibility: hidden;
    transition:
      transform var(--duration-drawer) var(--ease-in-out),
      visibility 0s linear var(--duration-drawer);
  }

  .guide-dock[data-open="true"] .guide-panel {
    transform: none;
    visibility: visible;
    transition:
      transform var(--duration-drawer) var(--ease-in-out),
      visibility 0s;
  }

  .guide-dock[data-no-slide="true"] .guide-panel {
    transition: none;
  }

  .guide-dock[data-open="true"] .guide-launch {
    visibility: hidden;
  }

  .guide-thread {
    overscroll-behavior: contain;
  }

  .guide-input {
    font-size: 1rem;
  }

  .guide-panel button,
  .guide-panel a,
  .guide-panel input {
    touch-action: manipulation;
  }

  .guide-launch,
  .guide-icon-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .guide-launch {
    width: var(--guide-launch-size);
    height: var(--guide-launch-size);
    background: var(--color-primary);
    color: white;
    border: 1px solid var(--color-primary);
    box-shadow: 0 8px 24px rgb(0 0 0 / 16%);
    transition:
      background-color var(--duration-ui) var(--ease-out);
  }

  .guide-launch::before,
  .guide-icon-button::before {
    content: "";
    position: absolute;
    inset: -0.25rem;
  }

  /* Close is secondary: a quiet 32px glyph, with ::before keeping a 44px
     tap area (inset -0.375rem on each side). */
  /* The negative margin pulls the 16px glyph flush with the header's right
     padding, mirroring the title on the left. */
  .guide-icon-button {
    width: 2rem;
    height: 2rem;
    margin-inline-end: -0.5rem;
    background: transparent;
    color: var(--color-text-secondary);
    transition:
      background-color var(--duration-ui) var(--ease-out),
      color var(--duration-ui) var(--ease-out);
  }

  .guide-icon-button::before {
    inset: -0.375rem;
  }

  /* Only the last header button is pulled flush with the padding. */
  .guide-restart {
    margin-inline-end: 0;
  }

  /* One card holds the input and a footer row with the page context and
     the send button, so the context reads as part of the message. */
  .guide-composer {
    border: 1px solid var(--color-divider);
    background: var(--color-bg-primary);
  }

  .guide-context {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    line-height: 1rem;
  }

  /* Model replies render through renderChatMarkdown; Tailwind's reset strips
     list and heading styles, so restore the few that markdown needs. */
  .guide-md :global(:where(p, ul, ol, h1, h2, h3, h4, pre, blockquote) + *) {
    margin-top: 0.5rem;
  }

  .guide-md :global(ul) {
    list-style: disc;
    padding-inline-start: 1.25rem;
  }

  .guide-md :global(ol) {
    list-style: decimal;
    padding-inline-start: 1.25rem;
  }

  .guide-md :global(li + li) {
    margin-top: 0.125rem;
  }

  .guide-md :global(strong) {
    font-weight: 600;
  }

  .guide-md :global(:where(h1, h2, h3, h4)) {
    font-size: var(--text-base);
    font-weight: 600;
    line-height: 1.375;
  }

  .guide-md :global(em) {
    font-style: italic;
  }

  .guide-md :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  .guide-prompt {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 44px;
    padding-inline: 0.75rem;
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    text-align: start;
    transition: color var(--duration-ui) var(--ease-out);
  }

  .guide-send {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: var(--color-primary);
    color: white;
  }

  .guide-send[aria-disabled="true"] {
    opacity: 0.5;
  }

  /* A text field always matches :focus-visible, so a full ring would sit on
     the composer for as long as the panel is open. The caret and a darker
     card edge mark focus instead. */
  .guide-input:focus-visible {
    outline: none;
  }

  .guide-composer:has(.guide-input:focus-visible) {
    border-color: var(--color-text-secondary);
  }

  @media (hover: hover) and (pointer: fine) {
    .guide-launch:hover {
      background: var(--color-primary-hover);
    }

    .guide-icon-button:hover {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }

    .guide-input {
      font-size: 0.875rem;
    }

    .guide-send {
      width: 2rem;
      height: 2rem;
    }

    .guide-prompt {
      min-height: 2.25rem;
    }

    .guide-prompt:hover {
      color: var(--color-text-primary);
    }
  }

  /* Phones: a bottom sheet over the lower two thirds. The sheet's own close
     button replaces the launcher while open. */
  @media (max-width: 767.98px) {
    .guide-panel {
      --guide-hide: translateY(100%);
      left: 0;
      height: 66dvh;
      background: var(--color-bg-primary);
      box-shadow: var(--elevation-sheet);
    }
  }

  /* Desktop: a full-height drawer as wide as the page's two gutters
     (--guide-width). The page makes room for it (global.css), so no content
     sits under it. The sunken surface and inward shadow read as a recess. */
  @media (min-width: 768px) {
    .guide-panel {
      --guide-hide: translateX(100%);
      top: 0;
      z-index: 2;
      width: var(--guide-width);
      background: var(--color-bg-sunken);
      box-shadow: var(--elevation-drawer);
    }

    /* Eased stops, not a plain two-color ramp, so the shade does not band. It
       sits under the content (z-index -1 inside the panel's stacking context). */
    .guide-panel::before {
      content: "";
      position: absolute;
      inset-block: 0;
      inset-inline-start: 0;
      z-index: -1;
      width: 2rem;
      pointer-events: none;
      background: linear-gradient(
        to right,
        var(--drawer-shade),
        color-mix(in srgb, var(--drawer-shade) 75%, transparent) 12%,
        color-mix(in srgb, var(--drawer-shade) 45%, transparent) 30%,
        color-mix(in srgb, var(--drawer-shade) 20%, transparent) 55%,
        color-mix(in srgb, var(--drawer-shade) 6%, transparent) 80%,
        transparent
      );
    }

    /* The drawer header takes the launcher's inset and size, so where the
       launcher sits in the top corner (below) the close button lands exactly
       on it: open and close stay in one spot. */
    .guide-header {
      padding-block-start: max(
        var(--guide-launch-inset),
        env(safe-area-inset-top, 0px)
      );
      padding-block-end: var(--guide-launch-inset);
      padding-inline-end: max(
        var(--guide-launch-inset),
        env(safe-area-inset-right, 0px)
      );
    }

    .guide-icon-button {
      width: var(--guide-launch-size);
      height: var(--guide-launch-size);
      margin-inline-end: 0;
    }

    .guide-icon-button::before {
      inset: -0.25rem;
    }

    /* The launcher sits under the drawer's footprint; hide it only once
       the drawer has arrived so no bare corner shows mid-slide. */
    .guide-dock[data-open="true"] .guide-launch {
      transition:
        visibility 0s linear var(--duration-drawer),
        background-color var(--duration-ui) var(--ease-out);
    }
  }

  /* Top corner only once each gutter beside the 64rem column holds the
     launcher (inset + size + clearance, 4rem); narrower, it would cover the
     banner's top corner, so it stays in the bottom corner. */
  @media (min-width: 72rem) {
    .guide-dock {
      top: max(var(--guide-launch-inset), env(safe-area-inset-top, 0px));
      bottom: auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .guide-panel,
    .guide-dock[data-open="true"] .guide-panel {
      transition: none;
    }

    .guide-launch,
    .guide-dock[data-open="true"] .guide-launch,
    .guide-prompt {
      transition: none;
    }
  }
</style>
