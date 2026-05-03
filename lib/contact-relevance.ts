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

/** Phrases implying “tell me about my roster / Dex” rather than prepping for one event surface. */
const EVENT_PREP_BLOCK =
  /\bprep(?:ping|are)?(?:\s+for|\s+against)?\s|hackathon|meetup\b|overlap with|overlap between|conference\b|pitch\s+fest|investor\s+week|meet at|bring to|bring into|warm\s+intro|who\s+(?:else\s+)?should\s+i\s+(?:meet|bring|prioritize)\b/i;

const COUNT_META = new Set([
  "how",
  "many",
  "much",
  "contacts",
  "contact",
  "connections",
  "connection",
  "people",
  "person",
  "total",
  "count",
  "number",
  "does",
  "did",
  "have",
  "has",
  "having",
  "there",
  "what",
  "whats",
  "whose",
  "which",
  "when",
  "where",
  "who",
  "whom",
  "any",
  "about",
  "know",
  "exist",
  "still",
  "actually",
]);

const COUNT_INTENT =
  /\b(how many|what'?s\s+the\s+(count|total)|number\s+of|contact\s+count|connections?\s+count)\b|^how\s+big\b/i;

function filterTokens(q: string, extraStop: Set<string>): string[] {
  return tokensFrom(q).filter((t) => !extraStop.has(t));
}

export interface AssistantPayload {
  query?: string;
  mode?: "event" | "reconnect" | "connections" | "auto";
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
  mode: "event" | "reconnect" | "connections";
  query: string;
  summary: string;
  matches: AssistantMatchJson[];
}

/** Whether `auto` should answer from the Dex roster instead of event scoring. */
export function inferConnectionsIntent(message: string): boolean {
  const q = message.trim();
  if (!q.length) return false;
  if (EVENT_PREP_BLOCK.test(q)) return false;
  if (/^(prep|overlap)\b/i.test(q)) return false;

  if (/\#(\d{1,6})\b/.test(q)) return true;

  const rosterCue =
    /\b(in my (dex|roster)|(from|on|in)\s+(?:my\s+)?(?:dex|linkedin|contacts?|connections?|network)(?:\s+(?:list|import|spreadsheet))?|my\s+dex\b|trainer(?:s)?\b.*\bdex\b|linkedin\b.*\bdex\b|(?:contact|connection)\s+list|(my|who(?:'ve|'s)?\s+in\s+)?(?:connections?|contacts?)\b|(?:my\s+)?(?:network|trainers)\b|\broster\b|people\s+i(?:'ve)?\s+(?:met|know|added|caught)\b)/i.test(
      q,
    );

  const asksRosterFacts =
    /\b(how many|who('?ve|'?s|'s)?\s+in|what'?s\s+in|anything\s+(in\s+)?(there|here)|tell me\b|summarize\b|give me\b|describe\b|\b(who is|who are|which\s+\w+)\b|^\s*who\b|\?\s*$|(^|\s)(show|give|tell|list)(\s+(me))?(\s+(all|everyone))\b|(do\s+(i|we)\s+(have|know))|common tags|popular tags|(with|having)\s+tag|tagged (with|as)|when\s+did\s+i\s+last|last\s+log|anything\s+(about\s+)?#?\d+)/i.test(
      q,
    );

  const rosterShape =
    COUNT_INTENT.test(q) ||
    /\bin my (dex|roster)\b|\b(from|in) my (connections|contacts|dex|network)\b|\b(my|all my|list my|everyone(?:\s+in)? my)\s+(connections|contacts)\b|^connections?\??$/i.test(
      q,
    ) ||
    /\btell me about\b.+|\b(who is|who are|describe|lookup|dex entry|trainer)\b|\b(who has|with (the )?tag|tagged (with|as))\b|\b(top tags|common tags)\b|\bwhen did i last\b|\blast (interaction|logged|touch|touchpoint)\s+(with|for)\b|\bstale\b.*\bdex\b|\bhow many\b|\b(empty|anything in) my dex\b|\banything in my dex\b/i.test(
      q,
    );

  /** Connection/contact vocabulary + interrogative ⇒ usually roster Q&A */
  const connectionTopicQuestion =
    asksRosterFacts &&
    rosterCue &&
    !/\bi\s+m heading\b|\bi\s+m spending\b|\boverlap with\b|\bintro(s)? i can\b|\bmeet at\b/i.test(q);

  return rosterShape || connectionTopicQuestion;
}

function resolveAssistantModeKind(
  payload: AssistantPayload,
  rawQ: string,
): "event" | "reconnect" | "connections" {
  if (payload.mode === "reconnect") return "reconnect";
  if (payload.mode === "connections") return "connections";
  if (payload.mode === "event") return "event";
  /* auto */
  if (RECONNECT_HINT.test(rawQ)) return "reconnect";
  if (inferConnectionsIntent(rawQ)) return "connections";
  return "event";
}

export function contactHasToken(c: Contact, tok: string): boolean {
  const t = normalizeText(tok);
  if (!t.length) return false;
  if (normalizeText(c.name).includes(t)) return true;
  if (normalizeText(c.bio).includes(t)) return true;
  for (const tag of c.tags)
    if (normalizeText(tag).includes(t) || normalizeText(tag) === t) return true;
  for (const m of c.moveset) if (normalizeText(m).includes(t)) return true;
  for (const i of c.interactions) if (normalizeText(i.note).includes(t))
    return true;
  return false;
}

function findContactByDexId(contacts: Contact[], idRaw: string): Contact | undefined {
  const digits = idRaw.replace(/\D/g, "");
  if (!digits.length) return undefined;
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n)) return undefined;
  const padded = String(n).padStart(3, "0");
  const plain = String(n);
  return contacts.find(
    (c) =>
      c.id === padded ||
      c.id === plain ||
      c.id.replace(/^0+/, "") === plain.replace(/^0+/, ""),
  );
}

/** Short paragraph + one match row for lookups. */
function formatContactFacts(c: Contact): string {
  const stale = Math.round(daysSinceTouch(c));
  const tagLine =
    c.tags.length > 0 ? c.tags.slice(0, 8).join(", ") : "no tags recorded";
  const mv =
    c.moveset.length > 0
      ? `${c.moveset.length} move${c.moveset.length === 1 ? "" : "s"} in the Dex`
      : "no moveset lines yet";

  let lastLog = "";
  if (c.interactions.length > 0) {
    const i = [...c.interactions].sort(
      (a, b) => Date.parse(b.date) - Date.parse(a.date),
    )[0];
    const note =
      i.note.length > 120 ? `${i.note.slice(0, 120)}…` : i.note;
    lastLog = ` Latest logged touch ${i.date}: ${note}`;
  } else lastLog = " No interaction logs yet.";

  const bio =
    c.bio.trim().length > 0 ? c.bio.trim() : "No bio on file.";
  const bioBrief =
    bio.length > 220 ? `${bio.slice(0, 220)}…` : bio;

  return `${c.name} (#${c.id}) • stage ${c.stage}/3 (${mv}). Tags: ${tagLine}. Stale ~${stale}d since last recorded touch.${lastLog}\n\nBio snapshot: ${bioBrief}`;
}

function extractDexNumber(q: string): string | undefined {
  const h = /\#(\d{1,6})\b(?!\])/i.exec(q);
  if (h) return h[1];
  const ctn = /\bcontact\s+#\s*(\d{1,6})\b/i.exec(q);
  if (ctn) return ctn[1];
  const tr = /\btrainer\s+#\s*(\d{1,6})\b/i.exec(q);
  if (tr) return tr[1];
  return undefined;
}

function buildConnectionsAssistant(
  contacts: Contact[],
  queryRaw: string,
  limit: number,
): AssistantResponseJson {
  const contactsEmpty = (): AssistantResponseJson => ({
    ok: true,
    mode: "connections",
    query: queryRaw.trim() || "(dex overview)",
    summary: "Your Dex is empty — add trainers from the Gallery to build a roster the professor can read back.",
    matches: [],
  });

  if (contacts.length === 0) return contactsEmpty();

  const query = queryRaw.trim();
  /** Overview when asked for connections mode without a sentence. */
  if (!query.length) return dexOverview(contacts, limit);

  const idNum = extractDexNumber(query);
  if (idNum) {
    const c = findContactByDexId(contacts, idNum);
    if (!c) {
      return {
        ok: true,
        mode: "connections",
        query: queryRaw.trim(),
        summary: `Nothing in your Dex carries id “#${idNum.padStart(3, "0")}”. Double‑check the number from the Gallery card.`,
        matches: [],
      };
    }

    const m = picksToAssistantMatches([{ contact: c, score: 1, reasons: [] }])[0];
    const d = Math.round(daysSinceTouch(c));

    return {
      ok: true,
      mode: "connections",
      query: queryRaw.trim(),
      summary: formatContactFacts(c),
      matches: [
        {
          ...m,
          reasons: [`Dex lookup`, `Stale ≈ ${d}d`],
        },
      ],
    };
  }

  if (COUNT_INTENT.test(query) || /^connections?\??$/i.test(query.trim())) {
    const toks = new Set(filterTokens(query, COUNT_META));
    let pool = contacts;

    const filterActive = (): boolean => [...toks].some((t) => t.length > 1);

    if (filterActive()) {
      pool = contacts.filter((c) => {
        for (const tok of toks) if (contactHasToken(c, tok)) return true;
        return false;
      });
    }

    let summary =
      pool.length === contacts.length && !filterActive()
        ? `You have ${contacts.length} trainer${contacts.length === 1 ? "" : "s"} in your Dex.`
        : `Found ${pool.length}/${contacts.length} connection${pool.length === 1 ? "" : "s"}` +
          `${filterActive() ? " matching keywords from your question." : "."}`;

    const rankedSubset = picksToAssistantMatches(
      pool
        .map((contact) => ({ contact, score: 1, reasons: [] as MatchReason[] }))
        .slice(0, Math.min(limit + 8, pool.length)),
    ).slice(0, limit);

    if (rankedSubset.length > 0)
      summary += ` Showing up to ${rankedSubset.length} sample entr${rankedSubset.length === 1 ? "y" : "ies"} below.`;

    return {
      ok: true,
      mode: "connections",
      query: queryRaw.trim(),
      summary,
      matches: rankedSubset.map((hit) =>
        hit.reasons?.length ? hit : { ...hit, reasons: [`Stale ≈ ${hit.staleDaysApprox}d`] },
      ),
    };
  }

  const rankedSearch = scoreEventRelevance(query, contacts).slice(0, limit);
  if (rankedSearch.length > 0) {
    const matches = picksToAssistantMatches(rankedSearch);
    const summary =
      matches.length <= 6
        ? `Here ${matches.length === 1 ? "is" : "are"} ${matches.length} connection${matches.length === 1 ? "" : "s"} whose Dex fields or logs overlap your wording.`
        : `Here are the strongest ${matches.length} matches among your Dex for that question.`;

    return {
      ok: true,
      mode: "connections",
      query: queryRaw.trim(),
      summary,
      matches,
    };
  }

  return {
    ok: true,
    mode: "connections",
    query: queryRaw.trim(),
    summary:
      `Couldn’t find any connection whose name, tags, bio, moves, or notes clearly match — try another keyword or a Dex ID such as “#042”.`,
    matches: [],
  };
}

/** Top tags snapshot + totals for mode:connections with no query body. */
function dexOverview(contacts: Contact[], limit: number): AssistantResponseJson {
  const tally = new Map<string, number>();
  for (const c of contacts) for (const t of c.tags) {
    tally.set(t, (tally.get(t) ?? 0) + 1);
  }
  const tops = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const noLogs = contacts.filter((c) => c.interactions.length === 0).length;

  const tagSentence =
    tops.length > 0
      ? `\nPopular tags include ${tops
          .slice(0, 6)
          .map(([t, n]) => `“${t}” (${n})`)
          .join("; ")}.`
      : "\nNobody is tagged yet — tags make Professor answers sharper.";

  const summary =
    `You have ${contacts.length} trainers in your Dex.${tagSentence}${noLogs > 0 ? ` ${noLogs} entr${noLogs === 1 ? "y has" : "ies have"} no logged touches yet.` : ""}`;

  const sample = [...contacts]
    .sort((a, b) => daysSinceTouch(b) - daysSinceTouch(a))
    .slice(0, Math.min(6, contacts.length));

  const matches = picksToAssistantMatches(
    sample.map((contact) => ({
      contact,
      score: 0.01,
      reasons: [{ kind: "interaction", detail: "Snapshot pick", recent: false }],
    })),
  ).slice(0, Math.min(limit, 6));

  return {
    ok: true,
    mode: "connections",
    query: "(dex overview)",
    summary,
    matches,
  };
}

function picksToAssistantMatches(picks: RankedPick[]): AssistantMatchJson[] {
  return picks.map((p) => ({
    id: p.contact.id,
    name: p.contact.name,
    tags: [...p.contact.tags],
    score: Math.round(p.score * 100) / 100,
    reasons: [...new Set(p.reasons.map((r) => r.detail))].slice(0, 6),
    staleDaysApprox: Math.round(daysSinceTouch(p.contact)),
  }));
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

  const kind = resolveAssistantModeKind(payload, rawQ);

  if (!rawQ && kind !== "reconnect" && kind !== "connections") {
    return {
      ok: false,
      error:
        'Describe your event/context in query, use mode:"reconnect" for staleness hints, mode:"connections" for a Dex snapshot, or add a roster question (“how many connections”, “#017”, etc.).',
    };
  }

  const limit =
    typeof payload.limit === "number" && payload.limit >= 1
      ? Math.min(payload.limit, 12)
      : 6;

  if (kind === "connections") {
    return buildConnectionsAssistant(contacts, rawQ, limit);
  }

  const mode: "event" | "reconnect" =
    kind === "reconnect" ? "reconnect" : "event";

  const picks = pickMatches(
    mode,
    rawQ,
    contacts,
    Math.max(limit + 4, 12),
  );

  const capped = picks.slice(0, limit);

  const matches = picksToAssistantMatches(capped);

  return {
    ok: true,
    mode,
    query: rawQ || "(staleness-ranked suggestions)",
    summary: formatSummary(mode, matches.length, rawQ),
    matches,
  };
}
