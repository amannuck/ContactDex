import type { Contact } from "./types";

export const FLASHCARD_DECK_MAX = 40;

export function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
}

/** Random Dex-wide deck (no event filter). */
export function buildRandomDexDeck(contacts: Contact[], cap: number): Contact[] {
  if (contacts.length === 0 || cap <= 0) return [];
  const copy = [...contacts];
  shuffleInPlace(copy);
  return copy.slice(
    0,
    Math.min(cap, contacts.length, FLASHCARD_DECK_MAX),
  );
}
