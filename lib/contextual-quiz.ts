import {
  scoreEventRelevance,
  tokensFrom,
} from "./contact-relevance";
import type { Contact } from "./types";
import { buildQuizRound, type QuizRoundResponse } from "./quiz-round";

/** Default upper bound on how many top-ranked contacts compete for uniform random selection. */
const DEFAULT_POOL_CAP = 12;

/** Hard cap per request for abuse avoidance. */
const MAX_POOL_CAP = 40;

/**
 * Drops weak overlaps (single cheap substring hits) so the quiz stays “clearly relevant”
 * to the event brief. Tune together with fixture data/contacts.json.
 */
const MIN_SCORE_THRESHOLD = 8;

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

export type ContextualQuizFailure = {
  ok: false;
  error: string;
};

export type ContextualQuizSuccess = { ok: true; round: QuizRoundResponse };

type PoolBuild =
  | ContextualQuizFailure
  | { ok: true; pool: Contact[]; brief: string };

/**
 * Shared relevance pool for contextual quiz rounds and flashcard decks.
 */
function buildContextualPool(
  query: string,
  contacts: Contact[],
  options?: {
    poolCap?: number;
    minScore?: number;
  },
): PoolBuild {
  const q = typeof query === "string" ? query.trim() : "";
  if (!q) {
    return {
      ok: false,
      error:
        "Provide a non-empty contextual brief describing the conference, theme, or stack.",
    };
  }

  if (contacts.length === 0) {
    return {
      ok: false,
      error: "No contacts in Dex to quiz.",
    };
  }

  if (tokensFrom(q).length === 0) {
    return {
      ok: false,
      error:
        "No usable keywords in that brief — add richer terms (e.g. robotics, ROS, infra, VC) matching your Dex tags and bios.",
    };
  }

  const ranked = scoreEventRelevance(q, contacts);

  if (ranked.length === 0) {
    return {
      ok: false,
      error:
        "No overlaps with your Dex — tag people, lengthen bios/logs, or use a clearer event brief.",
    };
  }

  const minScore =
    typeof options?.minScore === "number" && options.minScore > 0
      ? options.minScore
      : MIN_SCORE_THRESHOLD;

  let poolCap =
    typeof options?.poolCap === "number" && Number.isFinite(options.poolCap)
      ? Math.floor(options.poolCap)
      : DEFAULT_POOL_CAP;

  poolCap = Math.max(1, Math.min(poolCap, MAX_POOL_CAP));

  const filtered = ranked
    .filter((r) => r.score >= minScore)
    .slice(0, poolCap)
    .map((r) => r.contact);

  if (filtered.length === 0) {
    return {
      ok: false,
      error:
        `No contacts cleared the contextual relevance cutoff (score ≥ ${minScore}). Broaden keywords or tighten Dex metadata.`,
    };
  }

  return { ok: true, pool: filtered, brief: q };
}

export type ContextualPoolSuccess = {
  ok: true;
  contacts: Contact[];
  brief: string;
};

/**
 * All contacts from your Dex that match an event brief (same pool as contextual quiz).
 */
export function resolveContextualContactPool(
  query: string,
  contacts: Contact[],
  options?: {
    poolCap?: number;
    minScore?: number;
  },
): ContextualPoolSuccess | ContextualQuizFailure {
  const built = buildContextualPool(query, contacts, options);
  if (!built.ok) return built;
  return { ok: true, contacts: built.pool, brief: built.brief };
}

/**
 * Exactly one contextual flashcard drawn from contacts that pass event-scoring —
 * reuse {@link scoreEventRelevance}; never staleness reconnect ranking.
 */
export function resolveContextualQuizRound(
  query: string,
  contacts: Contact[],
  options?: {
    /** Max distinct contacts in the roulette pool before uniform pick (top scores first). */
    poolCap?: number;
    /** Override relevance floor (default MIN_SCORE_THRESHOLD). */
    minScore?: number;
  },
): ContextualQuizSuccess | ContextualQuizFailure {
  const built = buildContextualPool(query, contacts, options);
  if (!built.ok) return built;
  const contact = built.pool[randomInt(built.pool.length)]!;
  const round = buildQuizRound(contact, contacts);
  return { ok: true, round };
}
