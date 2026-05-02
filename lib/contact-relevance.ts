import type { Contact } from "./types";

const STOP = new Set([
  "the",
  "a",
  "an",
  "to",
  "for",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "who",
  "what",
  "which",
  "is",
  "are",
  "was",
  "be",
  "been",
  "my",
  "me",
  "i",
  "we",
  "you",
  "it",
  "this",
  "that",
  "with",
  "from",
  "about",
  "into",
  "any",
  "some",
  "can",
  "could",
  "would",
  "should",
  "help",
  "tell",
]);

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#\s]/gi, " ");
}

export function tokensFrom(text: string): string[] {
  const n = normalizeText(text);
  return n.split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));
}

/** Last activity timestamp (interaction or creation). */
function lastTouchMs(c: Contact): number {
  if (c.interactions.length === 0) return Date.parse(c.createdAt);
  let max = 0;
  for (const i of c.interactions) {
    const ms = Date.parse(i.date);
    if (Number.isFinite(ms) && ms > max) max = ms;
  }
  return max || Date.parse(c.createdAt);
}

/** Days since last touch; higher = staler */
export function daysSinceTouch(c: Contact): number {
  const ms = Math.max(Date.now() - lastTouchMs(c), 0);
  return ms / 86_400_000;
}

export type MatchReason =
  | { kind: "tag"; detail: string }
  | { kind: "bio"; detail: string }
  | { kind: "move"; detail: string }
  | { kind: "interaction"; detail: string; recent: boolean }
  | { kind: "name"; detail: string };

export interface RankedPick {
  contact: Contact;
  score: number;
  reasons: MatchReason[];
}

const WE_TAG = 12;
const WE_MOVE = 6;
const WE_NOTE = 6;
const WE_BIO = 4;
const WE_NAME = 2;

function pushReason(reasons: MatchReason[], max: number, r: MatchReason) {
  if (reasons.length >= max) return;
  reasons.push(r);
}

/**
 * Keyword overlap across tags, bio, moveset, and interaction logs.
 */
export function scoreEventRelevance(
  query: string,
  contacts: Contact[],
): RankedPick[] {
  const toks = new Set(tokensFrom(query));
  if (toks.size === 0) return [];

  const ranked: RankedPick[] = [];

  for (const c of contacts) {
    let score = 0;
    const reasons: MatchReason[] = [];
    const nameL = normalizeText(c.name);
    const bioL = normalizeText(c.bio);

    for (const tok of toks) {
      if (!tok) continue;
      if (nameL.includes(tok)) {
        score += WE_NAME;
        pushReason(reasons, 8, {
          kind: "name",
          detail: `"${tok}" ↔ name`,
        });
      }

      const tagHits = c.tags.filter((t) =>
        normalizeText(t).includes(tok),
      );
      if (tagHits.length) {
        score += WE_TAG * Math.min(tagHits.length, 3);
        for (const t of tagHits.slice(0, 2))
          pushReason(reasons, 8, {
            kind: "tag",
            detail: `"${tok}" ↔ tag “${t}”`,
          });
      }

      if (bioL.includes(tok)) {
        score += WE_BIO;
        pushReason(reasons, 8, {
          kind: "bio",
          detail: `"${tok}" ↔ bio`,
        });
      }

      for (const m of c.moveset) {
        const ml = normalizeText(m);
        if (ml.includes(tok)) {
          score += WE_MOVE;
          pushReason(reasons, 8, {
            kind: "move",
            detail: `"${tok}" ↔ move “${m.slice(0, 80)}${m.length > 80 ? "…" : ""}”`,
          });
        }
      }

      for (const i of [...c.interactions].sort(
        (a, b) => Date.parse(b.date) - Date.parse(a.date),
      )) {
        const il = normalizeText(i.note);
        if (il.includes(tok)) {
          const nd = Date.parse(i.date);
          const msAgo =
            Number.isFinite(nd) ? Date.now() - nd : Number.POSITIVE_INFINITY;
          const recent = msAgo >= 0 && msAgo < 56 * 86_400_000;
          score += WE_NOTE + (recent ? 2 : 0);
          if (recent) score += 1.25;
          pushReason(reasons, 8, {
            kind: "interaction",
            detail: `"${tok}" ↔ log (${i.date})`,
            recent,
          });
        }
      }
    }

    /** Light boost for richer relationships when scores tie */
    score += Math.min(c.stage * 1.25, 5);

    if (score <= 0) continue;
    ranked.push({ contact: c, score, reasons });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

const RECONNECT_HINT =
  /\b(re-?connect|haven'?t\s+(talked|spoken|heard)|lost\s+touch|cold\s+(contact|outreach|relationship)|prioritize\s+stal(e|eness)|follow\s+up|who\s+should\s+i\s+(ping|reach\s+out|meet|coffee|follow\s+up)|which\s+contacts\s+should\s+i\b)/i;

export function inferAssistantMode(message: string): "event" | "reconnect" {
  if (RECONNECT_HINT.test(message)) return "reconnect";
  return "event";
}

/**
 * Favor staleness × optional keyword overlap — “who should I ping before conference X?”
 */
export function scoreReconnectMix(
  query: string,
  contacts: Contact[],
): RankedPick[] {
  const toks = new Set(tokensFrom(query));
  const ranked: RankedPick[] = [];

  for (const c of contacts) {
    let score = 0;
    const reasons: MatchReason[] = [];
    const days = Math.min(daysSinceTouch(c), 400);
    const stalenessPts = Math.sqrt(days) * 2.25;
    score += stalenessPts;
    pushReason(reasons, 6, {
      kind: "interaction",
      detail: `≈ ${Math.round(days)}d since last touch`,
      recent: false,
    });

    if (toks.size === 0) {
      ranked.push({ contact: c, score, reasons });
      continue;
    }

    /* keyword overlap boosts “relevant cold” intros */
    for (const r of scoreEventRelevance(query, [c])) {
      score += r.score * 0.35;
      for (const x of r.reasons.slice(0, 4)) reasons.push(x);
    }

    ranked.push({ contact: c, score, reasons });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

export interface AssistantPayload {
  query?: string;
  mode?: "event" | "reconnect" | "auto";
  limit?: number;
}

export interface AssistantMatchJson {
  id: string;
  name: string;
  tags: string[];
  score: number;
  reasons: string[];
  staleDaysApprox: number;
}

export interface AssistantResponseJson {
  ok: true;
  mode: "event" | "reconnect";
  query: string;
  summary: string;
  matches: AssistantMatchJson[];
}

function pickMatches(
  mode: "event" | "reconnect",
  query: string,
  contacts: Contact[],
  candidates: number,
): RankedPick[] {
  const ranked =
    mode === "event"
      ? scoreEventRelevance(query, contacts)
      : scoreReconnectMix(query, contacts);
  const pool = Math.max(candidates, 8);
  return ranked.slice(0, Math.min(pool, ranked.length));
}

function formatSummary(mode: "event" | "reconnect", n: number, q: string) {
  if (mode === "event")
    return `Found ${n} contact${n === 1 ? "" : "s"} whose tags, bios, moves, or logs overlap your event context (“${q.slice(0, 120)}${q.length > 120 ? "…" : ""}”).`;
  return `${n} reconnection suggestion${n === 1 ? "" : "s"} — prioritized by time since last touch${q.trim() ? ` and hints from “${q.slice(0, 100)}${q.length > 100 ? "…" : ""}”` : ""}.`;
}

export function buildAssistantResponse(
  contacts: Contact[],
  payload: AssistantPayload,
): AssistantResponseJson | { ok: false; error: string } {
  const rawQ =
    typeof payload.query === "string" ? payload.query.trim() : "";

  let mode: "event" | "reconnect";
  if (payload.mode === "reconnect") mode = "reconnect";
  else if (payload.mode === "event") mode = "event";
  else mode = inferAssistantMode(rawQ);

  if (!rawQ && mode !== "reconnect") {
    return {
      ok: false,
      error:
        'Describe your event/context in query, or set mode:"reconnect" (leave query empty for pure staleness nudges).',
    };
  }

  const query = rawQ;

  const limit =
    typeof payload.limit === "number" && payload.limit >= 1
      ? Math.min(payload.limit, 12)
      : 6;

  const picks = pickMatches(
    mode,
    query ?? "",
    contacts,
    Math.max(limit + 4, 12),
  );

  const capped = picks.slice(0, limit);

  const matches: AssistantMatchJson[] = capped.map((p) => ({
    id: p.contact.id,
    name: p.contact.name,
    tags: [...p.contact.tags],
    score: Math.round(p.score * 100) / 100,
    reasons: [...new Set(p.reasons.map((r) => r.detail))].slice(0, 6),
    staleDaysApprox: Math.round(daysSinceTouch(p.contact)),
  }));

  return {
    ok: true,
    mode,
    query: rawQ || "(staleness-ranked suggestions)",
    summary: formatSummary(mode, matches.length, rawQ),
    matches,
  };
}
