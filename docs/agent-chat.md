# Agent chat

Rules for the "Ask Andrei" guide (`src/components/chat/FloatingChat.svelte`) and any later agent surface on the site.

One principle: never move the reader against their intent. The guide can move two things, the thread and the page, so every rule below covers both.

## Thread movement

1. Do not auto-scroll to follow a reply. The question anchors near the top (rule 2) and the reply grows below it. When the reader scrolls, leave them where they are.
2. When the visitor sends, scroll the new turn so the question sits near the top of the thread, with about two lines of the previous turn still visible above it. The reply renders below the question and is read from its first line. The last turn gets a `min-height` equal to the thread's height, so a short thread can still put the question at the top.
3. A reply that lands while the reader is away from the live edge renders off screen. A "New reply" pill at the bottom of the thread scrolls to the start of that reply.
4. Reopen a restored thread at the last question, not at the bottom.
5. While a turn is pending, show one status row. Replace it with the reply in place. Never insert content above the reader's position.
6. Reserve space for content that loads late. A card image gets a fixed `aspect-ratio` box before it loads.
7. Notices, errors, and retries render inside the turn that caused them. They never scroll the thread.

## Page movement

8. Navigate the page when the visitor asked to open something ("show me the colophon"), or when the reply points to a page for the rest ("the full list is on my canon page"). The reply says so before the page moves. A page named only in the question stays a link.
9. Every interaction is intent. A pending navigation cancels on a draft in the composer, a text selection in the thread or on the page, a pointer down, a wheel or touch scroll, a key press, or a link click. Focus alone is not a signal: focus stays in the composer after a send.
10. Navigate with the ClientRouter (`navigate`), never a full load, so the panel and its scroll position persist. Scroll to an in-page target, such as a table row, once on that navigation and not again.

## Accessibility

- The thread is `role="log"`, which implies `aria-live="polite"`. Do not nest another live region inside it.
- Announce at most two events per turn: that the guide is thinking, and the reply. Status lines and follow-ups are not announced one by one.
- Keep focus in the composer while a turn is pending. Block a second send with `aria-disabled` and a submit guard, not `disabled`. A focused input that becomes `disabled` loses focus to `<body>` (the focus fixup rule). A control that unmounts on click (a starter prompt, "New chat") moves focus to the composer first.
- Under `prefers-reduced-motion: reduce`, scroll jumps use `behavior: "auto"`.
- Starter prompts and follow-ups are buttons in a list. Each has a 44px hit area on touch, and its label is the exact text it sends.

## Components and owners

| Part | Owns | Notes |
| --- | --- | --- |
| Panel (`FloatingChat`) | Open state, thread messages, persistence, send | One source of truth for the thread |
| Thread | Scroll policy: follow state, turn anchoring, new-reply pill | Keep the scroll math in `src/lib` so it has a unit test |
| Turn | One question and its reply | The unit the thread anchors to |
| Reply parts | Text, status lines, card, notice, sources | Rendered from the `ChatApiSuccess` payload; no state of their own |
| Prompt list | Starter prompts (empty thread) and "Keep exploring" follow-ups | One component, two uses: a click sends the label |
| Composer | Input text, page-context chip ("Viewing Colophon") | Reports typing to the intent signal |
| Intent signal | The reader's last interaction, in the thread and on the page | One owner; cancels a pending navigation and pauses tail-follow |

The server returns data, and the client maps it to parts. `src/lib/chatTypes.ts` validates every payload, including a restored one. Use Svelte snippets for optional regions, not boolean props that encode layout.

## Current gaps

| Rule | Where | Gap |
| --- | --- | --- |
| 3 | none | No "New reply" pill. A reply renders under its question in the space the last turn reserves, so it starts in view unless the reader scrolled away. |

Fixed: a new question scrolls near the top of the thread with 40px of the previous turn above it, and the last turn reserves one thread of height in CSS, so a restore lands on the last question on its first frame. The thread no longer follows the tail or jumps to the bottom. A pending navigation cancels on every intent signal in rule 9; the thread is `role="log"` with `aria-busy` while a turn streams, and no live region is nested in it; the composer keeps focus on send.

## Not adopted

- Message links, search, and unread markers: the thread holds at most 30 messages per tab session.
