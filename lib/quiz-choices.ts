import type { Contact } from "./types";

const DISTRACTOR_TARGET = 3;
const SNIPPET_MAX = 140;

function normKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Build four shuffled options (one correct) for bio/moveset rounds.
 * Returns null when we cannot find three distinct distractors — caller falls back to free-text + fuzzy match.
 */
export function buildQuizChoices(
  answer: string,
  hiddenField: "bio" | "moveset",
  correctContact: Contact,
  allContacts: Contact[],
): string[] | null {
  const answerTrim = answer.trim();
  const answerNorm = normKey(answerTrim);
  if (!answerNorm) return null;

  const correctId = correctContact.id;
  const seen = new Set<string>([answerNorm]);

  /** True if this normalized string can't be used as a distractor. */
  const blocked = (k: string) => seen.has(k);

  const candidates: string[] = [];

  const tryAdd = (raw: string) => {
    const t = raw.trim();
    if (t.length < 2) return;
    const k = normKey(t);
    if (blocked(k)) return;
    /* Moveset rounds: exclude any line that appears on the correct card so visible moves never appear as bogus options. */
    if (
      hiddenField === "moveset" &&
      correctContact.moveset.some((m) => normKey(m) === k)
    ) {
      return;
    }
    seen.add(k);
    candidates.push(t);
  };

  if (hiddenField === "bio") {
    for (const c of allContacts) {
      if (c.id === correctId) continue;
      tryAdd(c.bio);
    }
  } else {
    for (const c of allContacts) {
      if (c.id === correctId) continue;
      for (const line of c.moveset) tryAdd(line);
    }
  }

  if (candidates.length < DISTRACTOR_TARGET) {
    for (const c of allContacts) {
      if (c.id === correctId) continue;
      for (const i of c.interactions) {
        let sn = i.note.trim();
        if (sn.length < 10) continue;
        if (sn.length > SNIPPET_MAX)
          sn = `${sn.slice(0, SNIPPET_MAX - 1)}…`;
        tryAdd(sn);
        if (candidates.length >= 40) break;
      }
    }
  }

  if (candidates.length < DISTRACTOR_TARGET) {
    for (const c of allContacts) {
      if (c.id === correctId) continue;
      for (const tag of c.tags) tryAdd(`Related tag — ${tag}`);
    }
  }

  if (candidates.length < DISTRACTOR_TARGET) return null;

  const picked = shuffle(candidates).slice(0, DISTRACTOR_TARGET);
  return shuffle([answerTrim, ...picked]);
}
