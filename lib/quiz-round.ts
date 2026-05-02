import { buildQuizChoices } from "./quiz-choices";
import type { Contact } from "./types";

export type QuizHiddenField = "name" | "bio" | "moveset";

/**
 * Serialized flashcard payload for `/api/quiz/random` and `/api/quiz/contextual`.
 * Mirrors the historical REST shape consumed by StudyModeClient / Bot tools.
 */
export interface QuizRoundResponse {
  hiddenField: QuizHiddenField;
  display: Contact;
  answer: string;
  id: string;
  /** Present when the concealed field was a moveset line (otherwise omitted). */
  movesetIndex?: number;
  /** Four options (bio/moveset) including the answer; omit for name rounds or when distractors exhausted. */
  choices?: string[];
}

function randomInt(max: number) {
  return Math.floor(Math.random() * max);
}

/**
 * Build one quiz round. Pass full `allContacts` so bio/moveset rounds can assemble multiple-choice distractors.
 */
export function buildQuizRound(
  contact: Contact,
  allContacts: Contact[],
): QuizRoundResponse {
  const kinds: QuizHiddenField[] = ["name", "bio", "moveset"];
  const hiddenField = kinds[randomInt(kinds.length)]!;

  const display: Contact = {
    ...contact,
    interactions: [...contact.interactions],
  };

  if (hiddenField === "name") {
    display.name = "???";
    return {
      hiddenField,
      display,
      answer: contact.name,
      id: contact.id,
    };
  }

  if (hiddenField === "bio") {
    display.bio = "???";
    const base = {
      hiddenField: "bio" as const,
      display,
      answer: contact.bio,
      id: contact.id,
    };
    const choices = buildQuizChoices(
      contact.bio,
      "bio",
      contact,
      allContacts,
    );
    return choices ? { ...base, choices } : base;
  }

  if (contact.moveset.length === 0) {
    display.name = "???";
    return {
      hiddenField: "name",
      display,
      answer: contact.name,
      id: contact.id,
    };
  }

  const movesetIndex = randomInt(contact.moveset.length);
  const original = contact.moveset[movesetIndex]!;
  display.moveset = contact.moveset.map((m, i) =>
    i === movesetIndex ? "???" : m,
  );

  const base = {
    hiddenField: "moveset" as const,
    movesetIndex,
    display,
    answer: original,
    id: contact.id,
  };
  const choices = buildQuizChoices(
    original,
    "moveset",
    contact,
    allContacts,
  );
  return choices ? { ...base, choices } : base;
}
