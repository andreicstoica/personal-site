<script lang="ts">
  import { onMount, tick } from "svelte";
  import { navigate } from "astro:transitions/client";
  import { renderChatMarkdown } from "../../lib/chatMarkdown";
  import type { GuideChat } from "../../lib/guideChat";
  import {
    parseStoredMessages,
    turnText,
    type ChatTurn,
    type GuideUIMessage,
  } from "../../lib/chatTypes";
  import { revealSection, watchIntent } from "../../lib/guidePage";
  import { explorePrompts, starterPrompts } from "../../lib/guidePrompts";
  import { GUIDE_STORAGE_KEY } from "../../lib/guideState";
  import {
    groupTurns,
    pageCard,
    postCard,
    replyView,
    traceSummary,
    type GuideStep,
    type PageCall,
    type PageMove,
    type ReplyView,
  } from "../../lib/guideTurn";
  import { routeByHref } from "../../lib/memorySelect";
  import Icon from "../ui/Icon.svelte";
  import GuidePrompts from "./GuidePrompts.svelte";
  import GuideCard from "./GuideCard.svelte";
  import GuideTrace from "./GuideTrace.svelte";

  const storageKey = GUIDE_STORAGE_KEY;
  /** sessionStorage keeps the last 30 messages; the route gets the last 9,
   *  four exchanges and the new question. */
  const KEEP = 30;
  const SEND = 9;
  /** How much of the previous turn stays visible above a new question. */
  const PEEK = 40;
  const THINKING: GuideStep = { icon: "lightbulb", label: "Thinking", status: "active" };
  const EMPTY_VIEW: ReplyView = { trace: [], text: "", notices: [], page: null, posts: [] };
  /** "Continue exploring" waits until the visitor has had a moment with the
   *  reply, so it reads as an offer, not part of the answer. */
  const EXPLORE_DELAY = 2000;

  let open = $state(false);
  let input = $state("");
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
  /** The page call whose follow is pending, so its step can show it. */
  let followingId = $state<string | null>(null);
  /** The page call whose navigation is in flight. "Opened" waits for the
   *  new page to load, so a navigation that never lands never claims it did. */
  let openingId = $state<string | null>(null);
  /** Page calls the guide carried out, by tool call id. */
  let moved = $state<Record<string, PageMove>>({});

  function toTurns(messages: GuideUIMessage[]): ChatTurn[] {
    const turns: ChatTurn[] = [];
    for (const message of messages.slice(-SEND)) {
      if (message.role !== "user" && message.role !== "assistant") continue;
      const text = turnText(message);
      if (text) turns.push({ role: message.role, text });
    }
    return turns;
  }

  /** The AI SDK is about 34 KB gzipped, and most visitors never open the
   *  guide, so it loads when the panel opens or a message is sent. Until
   *  then a restored thread renders from `stored`. */
  let chat = $state.raw<GuideChat | null>(null);
  let chatLoad: Promise<GuideChat> | undefined;
  /** Replaced whole, never mutated, so it stays a plain array. */
  let stored = $state.raw<GuideUIMessage[]>([]);
  /** True from a send until the SDK has loaded and taken the message. */
  let starting = $state(false);

  function loadChat(): Promise<GuideChat> {
    chatLoad ??= import("../../lib/guideChat").then(({ createGuideChat }) => {
      const instance = createGuideChat({
        messages: stored,
        body: (messages) => ({ messages: toTurns(messages), page: pagePath }),
        onFinish: (message, completed) => {
          if (instance.messages.length > KEEP) {
            instance.messages = instance.messages.slice(-KEEP);
          }
          if (!completed) return;
          scheduleExplore();
          const page = replyView(message).page;
          if (page) scheduleFollow(page);
        },
      });
      chat = instance;
      return instance;
    });
    // A failed load (offline, or a stale deploy) can be retried by the next send.
    chatLoad.catch(() => {
      chatLoad = undefined;
    });
    return chatLoad;
  }

  const messages = $derived(chat ? chat.messages : stored);
  const status = $derived(chat?.status ?? "ready");
  const sending = $derived(starting || status === "submitted" || status === "streaming");
  const turns = $derived(groupTurns(messages));
  const viewing = $derived(routeByHref(pagePath));
  /** The turn whose reply shows "Continue exploring", once its delay ends. */
  let exploreTurn = $state<string | null>(null);
  let exploreTimer: ReturnType<typeof setTimeout> | undefined;
  /** Follow-ups for the last reply: about the post it read, the page it
   *  opened, or the page the visitor is on, minus what was already asked. */
  const explore = $derived.by(() => {
    const last = turns.at(-1);
    const view = last?.reply ? replyView(last.reply) : null;
    const readPost = last?.reply?.parts.some((part) => part.type === "tool-read_post");
    const topic = readPost ? "writing" : (view?.page?.output.href ?? pagePath);
    const asked = turns.flatMap((turn) => (turn.question ? [turnText(turn.question)] : []));
    return explorePrompts(topic, asked);
  });

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function parseMoved(value: unknown): Record<string, PageMove> {
    if (!isRecord(value)) return {};
    const out: Record<string, PageMove> = {};
    for (const [id, how] of Object.entries(value)) {
      if (how === "opened" || how === "scrolled") out[id] = how;
    }
    return out;
  }

  function readStored(): {
    open: boolean;
    messages: GuideUIMessage[];
    moved: Record<string, PageMove>;
  } | null {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || typeof parsed.open !== "boolean") return null;
      const messages = parseStoredMessages(parsed.messages);
      if (!messages) return null;
      return { open: parsed.open, messages, moved: parseMoved(parsed.moved) };
    } catch {
      return null;
    }
  }

  /** Puts the last question near the top of the thread, with a little of
   *  the turn before it still in view. */
  function anchorLastTurn(behavior: ScrollBehavior): void {
    const last = threadRef?.querySelector<HTMLElement>("[data-turn]:last-of-type");
    if (!threadRef || !last) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    threadRef.scrollTo({
      top: Math.max(0, last.offsetTop - PEEK),
      behavior: reduce ? "auto" : behavior,
    });
  }

  // Outside clicks move focus to the clicked element before this runs, so the
  // focus hand-back below only has to cover closes triggered from inside.
  function closeGuide() {
    const focusWasInside =
      rootRef !== null &&
      document.activeElement instanceof Node &&
      rootRef.contains(document.activeElement);
    open = false;
    // The launcher is hidden while the guide is open; wait a tick
    // so it is visible and focusable again before handing focus back.
    if (focusWasInside) void tick().then(() => launchRef?.focus());
  }

  /** On touch, focusing the input would raise the keyboard, so focus the
   *  dialog instead and let assistive tech land inside the panel. */
  function focusComposer() {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (finePointer) inputRef?.focus();
    else panelRef?.focus();
  }

  function scheduleExplore() {
    clearExplore();
    exploreTimer = setTimeout(() => {
      exploreTurn = turns.at(-1)?.id ?? null;
    }, EXPLORE_DELAY);
  }

  function clearExplore() {
    if (exploreTimer) clearTimeout(exploreTimer);
    exploreTimer = undefined;
    exploreTurn = null;
  }

  /** Drops the thread and anything in flight, back to the starter prompts. */
  function newChat() {
    void chat?.stop();
    cancelFollow();
    clearExplore();
    stored = [];
    if (chat) {
      chat.messages = [];
      chat.clearError();
    }
    moved = {};
    input = "";
    // The restart button unmounts with the thread; keep focus in the panel.
    focusComposer();
  }

  function sendPrompt(text: string) {
    // The clicked row unmounts with the empty state; keep focus in the panel.
    focusComposer();
    send(text);
  }

  function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    cancelFollow();
    clearExplore();
    input = "";
    starting = true;
    void loadChat()
      .then((instance) => {
        void instance.sendMessage({ text: message });
        return tick();
      })
      .then(() => anchorLastTurn("smooth"))
      .catch(() => {
        // The SDK chunk failed to load (offline, or a stale deploy).
        input = message;
      })
      .finally(() => {
        starting = false;
      });
  }

  /** Waits a beat after the reply, then opens the page or scrolls this one.
   *  Any sign of the visitor doing something else cancels it. */
  function scheduleFollow({ toolCallId, output }: PageCall) {
    const samePage = window.location.pathname === output.href;
    if (!open || (samePage && !output.section)) return;
    cancelFollow();
    followingId = toolCallId;
    // Reading or scrolling the thread is not a reason to stay: the panel does
    // not move when the page does. Only the page and the keyboard count.
    stopIntentWatch = watchIntent(cancelFollow, rootRef);
    followTimer = setTimeout(() => {
      const draft = input.trim().length > 0;
      cancelFollow();
      // Never yank the page out from under a question the visitor is typing.
      if (!draft) followNow({ toolCallId, output });
    }, 900);
  }

  /** Opens the page, or scrolls this one to the section. On another page the
   *  call reads "Opened" only once the new page has loaded. */
  function followNow({ toolCallId, output }: PageCall) {
    const section = output.section;
    if (window.location.pathname === output.href) {
      if (section && revealSection(section.id)) {
        moved = { ...moved, [toolCallId]: "scrolled" };
      }
      return;
    }
    openingId = toolCallId;
    const onLoad = () => {
      openingId = null;
      // Another navigation won the race; this call stays a link.
      if (window.location.pathname !== output.href) return;
      moved = { ...moved, [toolCallId]: "opened" };
      // SiteLayout resets the page scroll on page-load; reveal after it.
      if (section) requestAnimationFrame(() => revealSection(section.id));
    };
    document.addEventListener("astro:page-load", onLoad, { once: true });
    // ClientRouter, not a full load: a reload would tear the thread down and
    // rebuild it from storage, dropping scroll and focus for no reason.
    navigate(output.href).catch(() => {
      document.removeEventListener("astro:page-load", onLoad);
      openingId = null;
    });
  }

  /** A plain click on a page card does what the guide does: open the page
   *  and mark the section. A modified click keeps the browser's behavior. */
  function openCard(event: MouseEvent, call: PageCall) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    cancelFollow();
    followNow(call);
  }

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    send(input);
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
    followingId = null;
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
    const saved = readStored();
    if (saved) {
      stored = saved.messages;
      moved = saved.moved;
      open = saved.open;
      // A restored reply is not new; its follow-ups show without the wait.
      const last = groupTurns(saved.messages).at(-1);
      if (last?.reply) exploreTurn = last.id;
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
      void chat?.stop();
      document.removeEventListener("astro:page-load", onPageLoad);
      document.removeEventListener("astro:before-preparation", cancelFollow);
    };
  });

  // Written when a turn settles, not on every streamed token. Private-mode and
  // storage-quota failures are not worth breaking an effect over; the guide
  // just stops surviving a reload.
  $effect(() => {
    if (!hydrated || sending) return;
    const snapshot = $state.snapshot(messages).slice(-KEEP);
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ open, messages: snapshot, moved }),
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

  // Opening the panel, or restoring it open, lands on the last question rather
  // than the bottom of its reply.
  $effect(() => {
    if (!open || !hydrated) return;
    // Warm the SDK while the visitor reads or types.
    void loadChat().catch(() => {});
    focusComposer();
    void tick().then(() => anchorLastTurn("auto"));
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
            <Icon name="pen-square" class="w-4 h-4" />
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
      class="guide-thread relative flex-1 overflow-y-auto px-4 py-3 space-y-6"
      style:--guide-peek="{PEEK}px"
      role="log"
      aria-busy={sending}
    >
      {#each turns as turn, index (turn.id)}
        {@const isLast = index === turns.length - 1}
        {@const live = isLast && sending}
        <div class="guide-turn space-y-4" data-turn data-last={isLast}>
          {#if turn.question}
            <div class="flex justify-end">
              <div class="max-w-[85%] px-3 py-2 text-sm break-words whitespace-pre-wrap bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
                {turnText(turn.question)}
              </div>
            </div>
          {/if}
          {#if turn.reply || live}
            {@const view = turn.reply ? replyView(turn.reply) : EMPTY_VIEW}
            {@const trace = view.trace.length > 0 ? view.trace : [THINKING]}
            <div class="space-y-3 text-sm break-words text-[var(--color-text-primary)]">
              {#if view.trace.length > 0 || live}
                <GuideTrace
                  steps={trace}
                  {live}
                  folded={view.text.length > 0}
                  summary={traceSummary(turn.reply, trace, live)}
                />
              {/if}
              {#if view.text}
                <div class="guide-md">{@html renderChatMarkdown(view.text)}</div>
              {/if}
              {#if view.page || view.posts.length > 0}
                {@const page = view.page
                  ? pageCard(view.page.output, {
                      pending:
                        live ||
                        followingId === view.page.toolCallId ||
                        openingId === view.page.toolCallId,
                      moved: moved[view.page.toolCallId],
                      pagePath,
                    })
                  : null}
                <ul class="guide-cards" aria-label="Sources">
                  {#if page && view.page}
                    {@const call = view.page}
                    <li><GuideCard card={page} onclick={(event) => openCard(event, call)} /></li>
                  {/if}
                  {#each view.posts as post (post.url)}
                    <li><GuideCard card={postCard(post)} /></li>
                  {/each}
                </ul>
              {/if}
              {#each view.notices as notice, noticeIndex (noticeIndex)}
                <p class="text-xs text-[var(--color-text-secondary)]">{notice}</p>
              {/each}
            </div>
          {/if}
          {#if isLast && status === "error"}
            <p class="text-xs text-[var(--color-text-secondary)]">The guide couldn't answer. Try again.</p>
          {/if}
          {#if isLast && exploreTurn === turn.id && !sending && explore.length > 0}
            <GuidePrompts
              prompts={explore}
              title="Continue exploring"
              variant="follow-up"
              animate
              class="pt-1"
              onselect={sendPrompt}
            />
          {/if}
        </div>
      {/each}
    </div>

    {#if messages.length === 0}
      <GuidePrompts
        prompts={starterPrompts}
        label="Suggested questions"
        class="px-1"
        onselect={sendPrompt}
      />
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
            <Icon name="eye" class="w-3.5 h-3.5 shrink-0" />
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
    <Icon name={open ? "close" : "message"} class="w-4 h-4" />
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

  .guide-cards {
    display: grid;
    gap: 0.375rem;
    padding-block-start: 0.25rem;
  }

  /* The last turn is at least one thread tall, less the peek above it, so
     even a short reply can sit with its question at the top. 100% is the
     thread's content box, so the 0.75rem top padding comes back. Pure CSS,
     so the room exists on the first frame of a restore. */
  .guide-turn[data-last="true"] {
    min-height: calc(100% + 0.75rem - var(--guide-peek));
  }

  .guide-input {
    font-size: 1rem;
  }

  .guide-panel button,
  .guide-panel :global(a),
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
     list and heading styles, so restore the few that markdown needs. Body
     text runs at 1.6 so a reply reads as prose, not a log line; blocks sit
     about one line apart. */
  .guide-md {
    line-height: 1.6;
  }

  .guide-md :global(:where(p, ul, ol, h1, h2, h3, h4, pre, blockquote) + *) {
    margin-top: 0.75rem;
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
    margin-top: 0.25rem;
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
