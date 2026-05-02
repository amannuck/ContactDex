# ContactDex — Product Requirements Document

## One-Liner

A Pokédex-style personal CRM where you "catch" contacts, tag their superpowers, and level up relationships — with a Botpress AI assistant acting as your Professor Oak.

---

## Problem

Networking events generate dozens of shallow connections that decay within days. Traditional CRMs are lifeless spreadsheets. People don't use them because there's zero engagement loop.

## Solution

Gamify relationship management. Every contact is a collectible "dex entry" with a number, type tags, evolution stage, and moveset. A conversational Botpress agent handles capture and recall so logging contacts feels like talking, not typing into forms.

---

## Target User

Hackathon judges experiencing the demo; proxy for any professional who networks frequently (conference-goers, salespeople, founders).

## Success Metrics (Demo Day)

| Metric | Target |
|---|---|
| Judge understands concept | < 10 seconds |
| Live demo flow completes without errors | 1 clean run |
| Botpress interaction feels natural | 2+ conversational turns |
| "I'd actually use this" reaction | At least 1 judge |

---

## Core Features (MVP — 5 hours)

### F1 · Dex Gallery (Grid View)

- Scrollable grid of contact cards showing: number (#001), avatar placeholder, name, type-tags (colored pills), evolution stage indicator.
- Search/filter bar: text search + tag filter.
- Click opens detail view.

### F2 · Dex Entry (Detail View)

- Full card: avatar, name, bio, tags, evolution stage progress bar (Met → Talked → Collaborated → Close), moveset list (superpowers/skills), interaction log (timestamped notes).
- "Log Interaction" button → modal with text input + auto-timestamp. Logging advances evolution.

### F3 · Add Entry (Manual + Botpress)

- Manual: simple form (name, bio, tags, moveset).
- Botpress: chat widget where user says "Met Jordan at DevConf — into robotics, can intro to YC partners" → agent extracts structured fields → creates card via API.

### F4 · Botpress Agent ("Professor Oak")

- **Capture flow**: parse natural language into {name, where_met, tags[], moveset[], bio}.
- **Study mode**: flashcard quiz — shows avatar + company, user guesses name or one fact. Agent confirms/corrects.
- **Nudge**: "You haven't talked to #012 Sara in 14 days. Want to log a note?"

### F5 · Study Mode (Flashcards)

- Random card displayed with partial info hidden.
- User types guess → agent scores and reveals.
- Ties the game loop to actual memory reinforcement.

---

## Stretch Features (if time permits)

| Feature | Value |
|---|---|
| CSV import | Bulk-load contacts for a richer demo |
| Rarity badges | "Seen" vs "Caught" status on LinkedIn-only contacts |
| Sound effects | Catch jingle on new entry, level-up chime |
| Dark/light Pokédex skin toggle | Visual flair |

---

## Non-Goals

- Real authentication / multi-user.
- Actual phone contact sync.
- Production database (SQLite or JSON file is fine).
- Pixel-perfect Pokémon branding (avoid trademark issues).

---

## Judging Alignment

| Criteria | How We Score |
|---|---|
| **Impact** | Solves a real pain (contact decay); relatable to every judge |
| **Execution** | Working end-to-end flow: add via chat → see card → quiz |
| **Presentation** | Visual cards + live Botpress conversation = compelling demo |
| **Design** | Game-inspired UI with clear information hierarchy |
| **Botpress ADK** | Central role: capture, study mode, nudges — not a bolt-on |
