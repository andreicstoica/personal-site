<script lang="ts">
  import { onMount, tick } from "svelte";
  import { navigate } from "astro:transitions/client";
  import { GUIDE_STORAGE_KEY } from "../../lib/guideState";
  import {
    parseChatApiSuccess,
    type ChatAction,
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

  const storageKey = GUIDE_STORAGE_KEY;

  let open = $state(false);
  let messages = $state<GuideMessage[]>([]);
  let input = $state("");
  let sending = $state(false);
  let hydrated = $state(false);
  let inputRef = $state<HTMLInputElement | null>(null);
  let threadRef = $state<HTMLDivElement | null>(null);
  let rootRef = $state<HTMLDivElement | null>(null);
  let panelRef = $state<HTMLDivElement | null>(null);
  let launchRef = $state<HTMLButtonElement | null>(null);
  let noSlide = $state(false);
  let followTimer: ReturnType<typeof setTimeout> | undefined;
  let abortRef: AbortController | null = null;

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

  function isAbortError(value: unknown): boolean {
    return value instanceof DOMException && value.name === "AbortError";
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
      followTimer = undefined;
      // Never yank the page out from under a question the visitor is typing.
      if (input.trim().length > 0 || document.activeElement === inputRef) return;
      // ClientRouter, not a full load: a reload would tear the thread down and
      // rebuild it from storage, dropping scroll and focus for no reason.
      void navigate(action.href);
    }, 900);
  }

  async function postChat(
    body: { message: string; history: Array<{ role: "user" | "assistant"; content: string }> },
    signal?: AbortSignal,
  ) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
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
    appendMessage({ id: crypto.randomUUID(), role: "user", content: userMessage });
    input = "";
    sending = true;
    const controller = new AbortController();
    abortRef = controller;

    try {
      const { response, payload } = await postChat(
        { message: userMessage, history },
        controller.signal,
      );
      const parsed = parseChatApiSuccess(payload);
      if (!response.ok || !parsed) {
        appendReply(errorText(payload));
        return;
      }
      appendReply(parsed.response, { sources: parsed.sources, action: parsed.action });
      scheduleFollow(parsed.action);
    } catch (error) {
      // A cancelled turn is the visitor's own doing — don't narrate it.
      if (!isAbortError(error)) appendReply("The guide couldn't answer.");
    } finally {
      if (abortRef === controller) abortRef = null;
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
  }

  /** `/chat` redirects here with `?chat=1`, so this can arrive on any
   *  navigation now that the island persists instead of remounting. */
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
    openFromUrl();
    // The island no longer remounts, so mount-time work that navigation can
    // invalidate has to re-arm: a follow can land on the next page, and a
    // manual navigation must cancel a pending one instead of racing it.
    document.addEventListener("astro:page-load", openFromUrl);
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
      document.removeEventListener("astro:page-load", openFromUrl);
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
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    // On touch, focusing the input would raise the keyboard — focus the
    // dialog instead so assistive tech lands inside the panel.
    if (finePointer) inputRef?.focus();
    else panelRef?.focus();
  });

  $effect(() => {
    void open;
    void messages.length;
    void sending;
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
      <button
        type="button"
        class="guide-icon-button"
        aria-label="Close guide"
        onclick={closeGuide}
      >
        <Icon name="close" class="w-4 h-4" />
      </button>
    </header>

    <div
      bind:this={threadRef}
      class="guide-thread flex-1 overflow-y-auto px-4 py-3 space-y-3"
      aria-live="polite"
    >
      {#if messages.length === 0}
        <div class="guide-empty">
          <p>Ask about a project or a job. Say “show me Refract” and I'll open the page.</p>
        </div>
      {/if}

      {#each messages as message (message.id)}
        <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div
            class="max-w-[85%] border rounded-none {message.role === 'user'
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border-(--color-divider)'}"
          >
            <div class="px-3 py-2 text-sm break-words">
              <div class="whitespace-pre-wrap">{message.content}</div>
              {#if message.role === "assistant" && (message.action?.kind === "navigate" || (message.sources && message.sources.length > 0))}
                <div class="mt-2 pt-2 border-t border-(--color-divider) space-y-1">
                  {#if message.action?.kind === "navigate"}
                    <div>
                      <a
                        href={message.action.href}
                        class="text-[11px] text-[var(--color-text-secondary)]"
                      >
                        → Navigating to {message.action.href}
                      </a>
                    </div>
                  {/if}
                  {#if message.sources && message.sources.length > 0}
                    <div class="flex flex-wrap gap-x-2 gap-y-2">
                      {#each message.sources as source (`${source.title}:${source.href ?? ""}`)}
                        {#if source.href && source.href !== actionHref(message.action)}
                          <a href={source.href} class="text-[11px]">
                            {source.title}
                          </a>
                        {:else if !source.href}
                          <span class="text-[11px] text-[var(--color-text-secondary)]">{source.title}</span>
                        {/if}
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}

      {#if sending}
        <div class="text-sm text-[var(--color-text-secondary)]" role="status">
          Thinking…
        </div>
      {/if}
    </div>

    <form onsubmit={onSubmit} class="flex gap-2 p-3">
      <label class="sr-only" for="guide-input">Message</label>
      <input
        id="guide-input"
        bind:this={inputRef}
        bind:value={input}
        type="text"
        autocomplete="off"
        placeholder="Ask about a project…"
        disabled={sending}
        class="guide-input flex-1 min-w-0 px-3 py-2 border border-(--color-divider) bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] rounded-none disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={sending || input.trim().length === 0}
        class="guide-send"
      >
        Send
      </button>
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

  .guide-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    min-height: 100%;
    max-width: 38ch;
    margin-inline: auto;
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    text-align: center;
  }

  .guide-send {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding-inline: 0.75rem;
    background: var(--color-primary);
    color: white;
    font-size: var(--text-sm);
  }

  .guide-send:disabled {
    opacity: 0.5;
  }

  /* The ring sits on the border, so focus reads as one edge, not two boxes. */
  .guide-input:focus-visible {
    outline-offset: -1px;
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
      min-height: 2.25rem;
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
    .guide-dock[data-open="true"] .guide-launch {
      transition: none;
    }
  }
</style>
