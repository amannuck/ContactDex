# ContactDex — Execution Plan

> **Total budget**: ~5 hours · **Team**: 1–3 people · **Tools**: Cursor + Botpress ADK

---

## Phase 0 — Scaffold & Seed Data (30 min)

**Goal**: Runnable app with fake data visible. Debug surface = zero logic, just rendering.

| Step | Task | Owner hint | Done when… |
|---|---|---|---|
| 0.1 | `npx create-next-app contactdex --ts --tailwind --app` in Cursor | Frontend | App runs on localhost:3000 |
| 0.2 | Create `data/contacts.json` with 8–10 seed entries (varied tags, stages, movelists) | Anyone | File exists, valid JSON |
| 0.3 | Create utility `lib/contacts.ts` — `readContacts()` / `writeContacts()` wrapping `fs.readFileSync`/`writeFileSync` with a mutex-style lock | Frontend | Import works in a test route |
| 0.4 | Init Botpress ADK project (`npx @botpress/cli init`) in a sibling folder or monorepo subfolder | Bot dev | Bot project compiles |

**Checkpoint**: `npm run dev` shows default Next.js page. Seed data file parses without errors.

---

## Phase 1 — API Routes (45 min)

**Goal**: Full CRUD over contacts via curl/Postman. No UI yet — pure backend.

| Step | Task | Detail |
|---|---|---|
| 1.1 | `GET /api/contacts` | Return full list. Support `?search=` (name substring) and `?tag=` (exact tag match). |
| 1.2 | `POST /api/contacts` | Accept `{name, bio, tags, moveset}`. Auto-assign next sequential `id`, set `stage: 0`, empty `interactions`, timestamp. |
| 1.3 | `GET /api/contacts/[id]` | Return single entry. |
| 1.4 | `PATCH /api/contacts/[id]` | Merge partial update into existing entry. |
| 1.5 | `POST /api/contacts/[id]/log` | Push `{note, date}` to `interactions[]`. Auto-advance `stage` if threshold crossed (1 → Talked, 3 → Collaborated, 6 → Close). |
| 1.6 | `GET /api/quiz/random` | Pick random contact, return object with one field replaced by `"???"` (name, bio, or a moveset item). |
| 1.7 | `POST /api/webhook/botpress` | Accept `{action, data}`. Actions: `create` → call create logic, `log` → call log logic. Return created/updated contact. |

**How to debug**: Use Cursor's terminal to curl every route after writing it. Fix before moving on. Example:

```bash
# Test create
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","bio":"Testing","tags":["Debug"],"moveset":["Finds bugs"]}'

# Test log
curl -X POST http://localhost:3000/api/contacts/001/log \
  -H "Content-Type: application/json" \
  -d '{"note":"Had coffee","date":"2026-05-02"}'
```

**Checkpoint**: Every route returns correct JSON. Stage auto-advances on log threshold.

---

## Phase 2 — Gallery & Card UI (60 min)

**Goal**: Visual grid of cards. Clickable. Searchable. This is what judges see first.

| Step | Task | Detail |
|---|---|---|
| 2.1 | `ContactCard` component | Displays: `#047` number (monospace), avatar circle (initials-based, colored by first tag), name, tag pills, small stage dots (● ● ○ ○). Keep it clean — function over flash. |
| 2.2 | `Gallery` page (`app/page.tsx`) | Fetch `/api/contacts` on load. Render grid (CSS grid, 3–4 columns). Add search input at top — filters client-side by name. Add tag filter dropdown. |
| 2.3 | Responsive grid | 1 column on mobile, 3–4 on desktop. Cards should have consistent height. |
| 2.4 | Click → navigate to `/contact/[id]` | Use Next.js dynamic route. |

**Visual target**: Think clean card grid — rounded corners, subtle shadow, colored tag pills. Not flashy, just organized and satisfying to scroll.

**Checkpoint**: Grid renders all seed contacts. Search filters live. Clicking a card navigates to detail page (even if detail page is empty).

---

## Phase 3 — Detail View & Interaction Logging (45 min)

**Goal**: Single-contact view with full info + ability to log interactions.

| Step | Task | Detail |
|---|---|---|
| 3.1 | `DetailView` page (`app/contact/[id]/page.tsx`) | Fetch `/api/contacts/[id]`. Display: large card header (number + name + avatar), bio paragraph, tag pills, moveset as a list, evolution progress bar (4 stages, filled to current). |
| 3.2 | Interaction log section | Chronological list of `{note, date}` entries below the card. Newest first. |
| 3.3 | "Log Interaction" button + modal | Button opens a small modal/drawer. Text input for note, auto-fills today's date. Submit → `POST /api/contacts/[id]/log`. On success, refetch and show updated stage if it changed. |
| 3.4 | Stage evolution feedback | When stage advances after logging, show a brief visual cue (e.g., progress bar animates, text flash "Evolved to Collaborated!"). |

**Checkpoint**: Can view full contact, log an interaction, see log appear, see stage advance.

---

## Phase 4 — Botpress "Professor Oak" (60 min)

**Goal**: Working chat agent that can create contacts and run quizzes. This is the Botpress ADK showcase.

| Step | Task | Detail |
|---|---|---|
| 4.1 | **Capture flow** | Create a Botpress flow triggered by intents like "I met someone" / "Add contact". Use ADK's built-in NLU or an LLM action card to extract `{name, bio, tags[], moveset[]}` from free text. Bot confirms: "Got it! Adding Alex — tagged Work, ML. Sound right?" On confirm → HTTP call to `POST /api/webhook/botpress` with `{action: "create", data: {...}}`. |
| 4.2 | **Study quiz flow** | Triggered by "Quiz me" / "Study mode". Bot calls `GET /api/quiz/random`, asks "This person works at Stripe and knows React. Who is it?" User guesses → bot compares → "Correct! That's #047 Alex Chen." or "Nope — it was Alex Chen. Keep studying!" |
| 4.3 | **Nudge flow** | Triggered by "Who should I reach out to?" Bot calls `GET /api/contacts?sort=stale` (add sort param to API if needed), returns top 3 stalest contacts. "You haven't logged anything with #012 Sara in 14 days. Want to add a note?" |
| 4.4 | **Embed Webchat in Next.js** | Add Botpress Webchat `<script>` snippet to `app/layout.tsx`. Floating button, bottom-right. Confirm it loads and connects to the bot. |
| 4.5 | **End-to-end test** | Say "I met Jordan at DevConf, she's into robotics and can intro to YC" in the chat. Verify card appears in gallery after refresh. |

**Debugging Botpress**:
- Test each flow in the Botpress Studio emulator first before connecting webhook.
- Use `console.log` / Botpress logs to inspect extracted entities.
- If webhook fails, check CORS and that the Next.js dev server is accessible from Botpress.
- Hardcode a fallback: if NLU extraction is flaky, have the bot ask structured questions (name? tags? superpower?) as a reliable backup path.

**Checkpoint**: Chat → create card works end-to-end. Quiz returns a real card and validates the guess.

---

## Phase 5 — Study Mode UI (30 min)

**Goal**: Standalone flashcard page in the web app (not just via chat).

| Step | Task | Detail |
|---|---|---|
| 5.1 | `app/study/page.tsx` | Fetch `/api/quiz/random`. Show a card with hidden field (blurred or replaced with "???"). Text input below for guess. |
| 5.2 | Submit → reveal | Compare guess (fuzzy match — lowercase, trim). Show ✓ or ✗ with the correct answer. "Next" button fetches another random card. |
| 5.3 | Link from gallery | Add "Study Mode" button in the nav bar. |

**Checkpoint**: Can cycle through 3+ flashcards, guessing correctly and incorrectly.

---

## Phase 6 — Polish & Demo Prep (30 min)

**Goal**: Smooth 2-minute demo. No crashes. Clear narrative.

| Step | Task |
|---|---|
| 6.1 | **Seed data cleanup**: Make sure 8–10 contacts have realistic names, bios, diverse tags, and varied stages. At least one at each evolution stage. |
| 6.2 | **Nav bar**: App title "ContactDex" + links to Gallery, Study Mode. Minimal. |
| 6.3 | **Empty states**: "No contacts found" on empty search. "Add your first contact!" if JSON is empty. |
| 6.4 | **Demo script** (write it down): (1) Show gallery, scroll, search by tag. (2) Click a card, show detail, log an interaction, watch stage evolve. (3) Open chat, say "I met someone…", watch card appear. (4) Run study mode quiz. (5) Explain architecture: Cursor built the app, Botpress ADK powers the conversational agent. |
| 6.5 | **Kill obvious bugs**: Test the full demo script 2–3 times. Fix any crash. |
| 6.6 | **Presentation slide** (optional): One slide — title, one-liner, architecture diagram, team. |

**Checkpoint**: Demo script runs cleanly twice in a row.

---

## Timeline Summary

| Phase | Duration | Cumulative |
|---|---|---|
| 0 — Scaffold & Seed | 30 min | 0:30 |
| 1 — API Routes | 45 min | 1:15 |
| 2 — Gallery UI | 60 min | 2:15 |
| 3 — Detail View | 45 min | 3:00 |
| 4 — Botpress Agent | 60 min | 4:00 |
| 5 — Study Mode | 30 min | 4:30 |
| 6 — Polish & Demo | 30 min | 5:00 |

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Botpress NLU misparses free text | Fallback to structured Q&A flow ("What's their name?" → "Any tags?"). Works just as well in demo. |
| Webhook connectivity issues | Run Botpress and Next.js on same machine. Use `localhost` or `ngrok` if needed. Test in Phase 4 early. |
| JSON file corruption on concurrent writes | Use a simple write-lock utility. For a demo, this is almost never hit. |
| Running out of time | Phases are ordered by demo impact. If you finish Phase 4, you have a shippable demo. Phase 5–6 are bonus. |
| Judges ask "how is Botpress used?" | Demo script explicitly includes chat interaction. Architecture slide shows Botpress as the conversational layer. Emphasize: capture, quiz, and nudge flows all run through Botpress ADK — it's not a sidebar feature, it's the primary input method. |

---

## What to Highlight for Judges

1. **Botpress ADK is central**: It's not a chatbot bolted on — it's how users *add* contacts (natural language capture) and *retain* contacts (study mode quiz). The conversational UX is the product differentiator.
2. **Cursor accelerated development**: Mention that Cursor's AI-assisted coding was used to scaffold components, write API routes, and debug — enabling a polished product in 5 hours.
3. **Impact**: Everyone networks; everyone forgets people. This solves a universal problem with an engaging game mechanic.
4. **Execution**: Live demo of the full loop — chat input → card creation → relationship tracking → memory quiz.
