# Plan: `/now` page for andrei.bio

**Branch:** `cursor/now-page-plan-3b0b`  
**Status:** Planning only (no implementation in this PR)  
**Reference:** [nownownow.com/about](https://nownownow.com/about) — Derek Sivers’s definition of a “now page”

---

## 1. Goal

Add a **`/now` page** that answers: *“What is Andrei focused on at this point in life?”* — the kind of update you’d give a friend you had not seen in a year — distinct from `/about` (background, personality, micropages) and from social posts (ephemeral, not big-picture).

### Success criteria

| Criterion | How we know it’s done |
| --- | --- |
| Public URL | `https://andrei.bio/now` returns 200 in dev and production |
| Discoverable | Linked from main nav and from About’s “Micropages” list |
| Content quality | Plain-language priorities; not a résumé duplicate or project marketing |
| Convention | Matches nownownow expectations (personal focus, `/now` path, “last updated” visible) |
| Maintainable | You can refresh copy in markdown without touching layout code |
| Build | `bun run build` passes; manual spot-check on mobile + desktop |

### Non-goals (this project)

- Listing on nownownow.com (manual email to Derek after launch — see §8)
- Auto-syncing from social feeds or calendar
- Business/marketing landing page content
- New design system or heavy custom UI

---

## 2. How this fits the existing site

### Current patterns

- **Content:** `src/content/pages/*.md` via Astro Content Collection (`pages` in `src/content/config.ts`)
- **Routes:** Thin `src/pages/*.astro` files load entries with `getEntry("pages", …)` and render through `PageLayout` + `MarkdownLayout`
- **Section parsing:** `parseMarkdownContent` splits on `# ` headers (see `about.md`, `canon.md`)
- **Micropages today:** Canon, Colophon, Fitness — linked from About, **not** in top nav
- **Top nav today:** Home, About, Chat (+ Social dropdown)

### About vs Now (keep the boundary clear)

| | `/about` | `/now` |
| --- | --- | --- |
| Time horizon | Timeless-ish background, interests, links | **Current** priorities (weeks–months) |
| Tone | Introducing yourself | “Here’s what I’m doing *right now*” |
| Updates | Occasional | **Intentionally** revised when focus shifts |
| Overlap risk | “Recently I’ve been thinking about…” in `about.md` | Move *current* focus bullets to `/now`; keep About as identity + stable links |

**Recommendation:** After `/now` ships, trim or shorten the “Recently, I’ve been thinking about…” block on About so it does not compete with Now (optional follow-up edit in same PR or a small second PR).

---

## 3. Content plan (you write this before or during implementation)

Use short `#` sections (same as other pages). Draft outline — replace placeholders with your real answers:

```markdown
---
title: "What I'm doing now"
description: "A short snapshot of what I'm focused on at this point in my life."
lastUpdated: 2026-06-02   # optional frontmatter — see §4
---

# Context

One paragraph: where you are (e.g. NYC), life phase, optional link to /about.

# Work

2–4 bullets: current job/build focus, side projects you’re actually spending time on, what you’re *not* taking on (pitches, consulting, etc. if relevant).

# Personal

2–4 bullets: hobbies, health, learning — big picture only.

# Not now

Optional but powerful for nownownow spirit: things you’re deliberately *not* doing (helps you and readers say no).

# Recently changed

Optional: 1–2 lines on what shifted since last update.
```

### Voice checklist (from nownownow)

- [ ] Readable in ~2 minutes
- [ ] No feed-style updates (“went on vacation last week”)
- [ ] No invented urgency for hiring/marketing unless that’s truly your focus
- [ ] Honest enough that *you* would use it to decide whether to say yes to a new commitment

### Inspiration (browse before writing)

- [Derek Sivers /now](https://sive.rs/now) — dated intro, themed `##` sections, tools link
- [nownownow.com](https://nownownow.com/) — skim 3–5 profiles in your field for length and structure

---

## 4. Technical approach

### 4.1 Minimal implementation (recommended v1)

| Step | File / change |
| --- | --- |
| 1 | `src/content/pages/now.md` — content + frontmatter |
| 2 | `src/pages/now.astro` — clone `canon.astro` (single-column text; **no** `MediaGallery`) |
| 3 | `src/components/Nav.astro` — add **Now** between About and Chat (desktop + mobile) |
| 4 | `src/content/pages/about.md` — add `- [Now](/now) - …` under Micropages |
| 5 | Optional: extend `pages` schema in `src/content/config.ts` with `lastUpdated: z.coerce.date().optional()` |
| 6 | `now.astro` — if `lastUpdated` present, render: “Last updated {formatted date}” under title (matches common `/now` convention) |

**Layout choice:** Prefer **canon-style** single column (`max-w-2xl`), not about’s gallery or colophon’s multi-column grid — now pages are text-first.

### 4.2 Optional v1.1 polish

| Idea | Effort | Notes |
| --- | --- | --- |
| Footer line linking [nownownow.com/about](https://nownownow.com/about) (“This is a now page.”) | Low | Helps visitors understand the format; optional |
| `<link rel="alternate">` or meta — skip unless you care about feeds | — | Not required |
| Index `/now` in RAG (`rag/data/`) | Medium | Lets chat answer “what is Andrei focused on now?” — only if you want that in the bot |
| JSON-LD / structured data | Low | Unlikely needed for a personal page |

### 4.3 What we should **not** do in v1

- Dynamic CMS or admin UI
- Commit hooks reminding you to update (nice later, not needed)
- Putting Now inside the Social dropdown (hurts discoverability vs nownownow norm)

---

## 5. Navigation & information architecture

**Recommended:** **Now in primary nav** (alongside About), because:

- nownownow assumes `/now` is a first-class sibling of `/about`
- Returning visitors often look for “what’s new with you” without digging into micropages

**Also:** list under About → Micropages for consistency with Canon / Colophon / Fitness.

```
Nav:  Home | About | Now | Chat | Social ▾
About micropages: Canon, Colophon, Fitness, Now
```

---

## 6. Implementation phases

### Phase A — Ship the page (1 PR)

1. Add content file + route + nav + about link  
2. You fill real copy (can be draft on first merge if needed)  
3. `bunx biome check` on touched files; `bun run build`  
4. Manual: `/now`, nav links, mobile menu, About micropages link  

### Phase B — Content hygiene (same PR or fast follow-up)

1. De-duplicate “recently thinking about” between About and Now  
2. Set `lastUpdated` and a calendar reminder (e.g. quarterly) to refresh  

### Phase C — Ecosystem (optional)

1. Email `https://andrei.bio/now` to Derek for [nownownow listing](https://nownownow.com/about)  
2. Add `now.md` (or export) to RAG corpus if chat should cite current focus  
3. Mention `/now` in colophon as part of site map  

---

## 7. Acceptance tests (manual)

- [ ] `GET /now` → 200, title and description in `<head>`
- [ ] All `#` sections render with existing markdown styles (links, lists)
- [ ] “Last updated” visible when `lastUpdated` set in frontmatter
- [ ] Desktop nav: Home → About → **Now** → Chat works
- [ ] Mobile hamburger includes Now
- [ ] About page links to `/now`
- [ ] Page reads well at ~375px width
- [ ] Production deploy on Vercel serves `/now` (after merge)

---

## 8. Getting listed on nownownow.com (post-launch, outside repo)

1. Publish `/now` on production with real content (not lorem ipsum).  
2. Email the full URL to Derek (see nownownow.com/about).  
3. Complete his login questionnaire when he replies.  
4. No code changes required for listing.

---

## 9. Open decisions (need your call before implementation PR)

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | Nav placement: primary vs micropages-only? | **Primary nav** |
| 2 | Show nownownow attribution footer? | **Yes**, one subtle line |
| 3 | Include `lastUpdated` in schema? | **Yes** |
| 4 | Trim About “Recently…” section when Now ships? | **Yes**, in Phase B |
| 5 | Index in RAG for chat? | **Defer** unless you want bot to answer “what are you up to?” |

---

## 10. Estimated scope (implementation PR, after plan approval)

- **Files touched:** ~5–6 (content, page, nav, about.md, optional config schema)
- **Risk:** Low — mirrors existing canon/about pipeline
- **Blocker:** Your written priorities for `now.md` (implementation can ship with `[TBD]` sections only if you prefer to iterate in production)

---

## Next step

Review §9 decisions → approve plan → open implementation PR on `cursor/now-page-impl-3b0b` (or continue on this branch) with Phase A checklist.
