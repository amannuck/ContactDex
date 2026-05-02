# ContactDex — Architecture

## System Overview

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│           Next.js (App Router) + React               │
│                                                      │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │ Gallery │  │  Detail  │  │  Botpress Webchat  │   │
│  │  Grid   │  │  View    │  │  (Embedded Widget) │   │
│  └────┬────┘  └─────┬────┘  └────────┬──────────┘   │
│       │              │               │               │
│       └──────────────┼───────────────┘               │
│                      │                               │
│              Internal API calls                      │
│              (fetch /api/*)                           │
└──────────────────────┬───────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │     NEXT.JS API ROUTES      │
        │         /api/*              │
        │                             │
        │  GET    /contacts           │
        │  GET    /contacts/:id       │
        │  POST   /contacts           │
        │  PATCH  /contacts/:id       │
        │  POST   /contacts/:id/log   │
        │  GET    /quiz/random        │
        │  POST   /webhook/botpress   │
        └──────────────┬──────────────┘
                       │
              ┌────────┴────────┐
              │   DATA LAYER    │
              │  contacts.json  │
              │  (flat file)    │
              └─────────────────┘

        ┌─────────────────────────────┐
        │       BOTPRESS ADK          │
        │                             │
        │  Bot: "Professor Oak"       │
        │                             │
        │  Flows:                     │
        │   • capture_contact         │
        │   • study_quiz              │
        │   • nudge_reminder          │
        │                             │
        │  Integrations:              │
        │   • Webhook → POST /api/*   │
        │   • Webchat (embedded)      │
        └─────────────────────────────┘
```

---

## Component Breakdown

### 1. Frontend (Next.js + React)

| Component | Responsibility |
|---|---|
| `Gallery` | Renders grid of `ContactCard` components. Handles search input and tag filter state. |
| `ContactCard` | Single card: number, avatar, name, tag pills, stage dot indicator. Click navigates to detail. |
| `DetailView` | Full dex entry. Shows bio, moveset, evolution progress bar, interaction log. Contains "Log Interaction" modal. |
| `LogModal` | Text input + submit. POSTs to `/api/contacts/:id/log`. On success, refetches detail. |
| `StudyMode` | Flashcard UI. Fetches `/api/quiz/random`, displays partial info, accepts guess input, reveals answer. |
| `BotpressWidget` | Embeds Botpress Webchat via `<script>` tag. Positioned as floating button bottom-right. |

### 2. API Routes (Next.js Route Handlers)

All routes read/write a single `data/contacts.json` file. No database needed.

| Route | Method | Purpose |
|---|---|---|
| `/api/contacts` | GET | List all contacts. Query params: `?search=`, `?tag=` |
| `/api/contacts` | POST | Create new contact. Body: `{name, bio, tags[], moveset[], stage}` |
| `/api/contacts/[id]` | GET | Single contact with full interaction log |
| `/api/contacts/[id]` | PATCH | Update fields (tags, bio, stage, moveset) |
| `/api/contacts/[id]/log` | POST | Add interaction log entry `{note, date}`. Auto-advances evolution stage based on log count. |
| `/api/quiz/random` | GET | Returns a random contact with one field hidden for study mode |
| `/api/webhook/botpress` | POST | Receives structured payloads from Botpress bot → calls internal create/update logic |
| `/api/contacts/import/linkedin` | POST | Internal bridge from Python importer (**Bearer CONTACTDEX_IMPORT_SECRET**); `{ contacts[] }` with **`linkedinExternalKey`** dedupe against `contacts.json`. |

### 3. Data Model

```jsonc
// Single contact entry
{
  "id": "047",
  "name": "Alex Chen",
  "avatar": "/avatars/default.png",  // or generated initials
  "bio": "ML engineer at Stripe, met at DevConf 2026",
  "tags": ["Work", "Conference 2026", "ML"],
  "moveset": [
    "Knows React & PyTorch",
    "Can intro to Stripe hiring manager",
    "Lives in Montreal"
  ],
  "stage": 2,          // 0=Met, 1=Talked, 2=Collaborated, 3=Close
  "interactions": [
    { "note": "Chatted about transformers at lunch", "date": "2026-04-28" },
    { "note": "Shared paper on diffusion models", "date": "2026-05-01" }
  ],
  "createdAt": "2026-04-28T10:00:00Z"
}
```

**Evolution rules**: stage advances at interaction thresholds: 0→1 at 1 log, 1→2 at 3 logs, 2→3 at 6 logs.

### 4. Botpress ADK Bot

**Bot name**: Professor Oak

**Built with**: Botpress ADK (Agent Developer Kit) — configured and developed within Cursor.

| Flow | Trigger | Behavior | API Call |
|---|---|---|---|
| `capture_contact` | User says "I met someone…" or "Add contact…" | Extracts name, context, tags, moveset from natural language. Confirms with user. | `POST /api/contacts` |
| `study_quiz` | User says "Quiz me" or "Study mode" | Fetches random card, asks "Who works at Stripe and knows React?" | `GET /api/quiz/random` |
| `nudge_reminder` | Scheduled or user asks "Who should I reach out to?" | Finds contacts with oldest last-interaction date, suggests top 3. | `GET /api/contacts?sort=stale` |

**Webchat integration**: Embedded in the Next.js app via Botpress Webchat snippet. Floating chat bubble in bottom-right. All Botpress ↔ backend communication goes through the webhook route or direct API calls from the bot's action cards.

---

## Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS | Fast scaffolding in Cursor, good DX |
| Backend | Next.js API Routes | Zero extra server, co-located with frontend |
| Data | JSON file (`fs` read/write) | No DB setup, trivial for hackathon scope |
| Bot | Botpress ADK | Required tool; handles NLP, conversation flows |
| Bot UI | Botpress Webchat widget | Drop-in embed, no custom chat UI needed |
| Dev tool | Cursor | Required tool; AI-assisted coding for speed |
| Hosting | Local (localhost:3000) | Demo from laptop |

---

## Key Integration Point: Botpress ↔ App

```
User speaks in Webchat
        │
        ▼
Botpress ADK processes intent
        │
        ▼
Bot action card calls POST /api/webhook/botpress
  with payload: { action: "create", data: { name, bio, tags, moveset } }
        │
        ▼
API route creates contact in contacts.json
        │
        ▼
Frontend polls or refetches → new card appears in gallery
```

This is the "wow" moment in the demo: say something in chat → card materializes in the grid.

---

## Aggregator ingest service (LinkedIn-style webhooks)

ContactDex’s primary store remains `data/contacts.json` on the Next.js host. A **separate Python service** under `services/importer/` accepts signed webhooks from an external aggregator (Clay, Zapier, custom), persists deduplicated snapshots in **Postgres**, diffs **`external_person_key`** values across time, optionally **POSTs new rows** into ContactDex via a **secret Bearer** bridge.

```text
Aggregator (Clay / Zapier / custom)
           │  POST /webhooks/connections
           │  Authorization: Bearer <api-token>
           ▼
┌─────────────────────────────┐      enqueue        ┌──────────────────┐
│  importer-api (FastAPI)      │ ─────────────────►   │ Redis (RQ queue) │
│  • api_key → ingestion_users │                      └────────┬─────────┘
│  • idempotent batch rows      │                               │
└──────────────┬──────────────┘                               ▼
               │ saves                              ┌──────────────────────┐
               ▼                                      │ importer-worker     │
┌─────────────────────────────┐                      │ • snapshots + diff  │
│ Postgres                    │ ◄─────────────────── │ • optional bridge   │
│ • ingestion_batches         │                       └──────────┬─────────┘
│ • connection_snapshots      │                                  │
│ • import_events (new/noop)  │                                  │ POST when configured
└─────────────────────────────┘                                  ▼
                                         ┌───────────────────────────────────────┐
                                         │ Next.js: /api/contacts/import/linkedin │
                                         │ Bearer CONTACTDEX_IMPORT_SECRET        │
                                         │ → mutateContacts (contacts.json)        │
                                         └───────────────────────────────────────┘
```

| Piece | Role |
|---|---|
| `POST /webhooks/connections` | Validates Bearer token against `ingestion_users.api_key_sha256` (SHA256 of raw token); stores JSON payload keyed by **`idempotency_key`** per user (duplicate replays get the existing `batch_id`, no duplicate job). |
| RQ worker | Runs `process_batch`: inserts `connection_snapshots`, emits `import_events` (`new` vs `noop` by watermark of distinct keys seen before for that user). |
| `POST /api/contacts/import/linkedin` | Server-only bridge: skips contacts whose **`linkedinExternalKey`** already exists; otherwise appends Dex entries with LinkedIn importer tags as sent by Python. |

Local orchestration uses **`docker-compose.yml`** at repo root (`postgres`, `redis`, `importer-api`, `importer-worker`). Set **`CONTACTDEX_IMPORT_SECRET`** in the Compose environment **and** in the Next.js process so bridge calls succeed **and match** importer `CONTACTDEX_IMPORT_SECRET`.

**Development token** (matches seeded migration user SHA256): `contactdex-aggr-webhook-token` → used as the raw Bearer secret when calling `/webhooks/connections` against a migrated DB.

