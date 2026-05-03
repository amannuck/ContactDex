import fs from "fs/promises";
import path from "path";
import type { Contact } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "contacts.json");

let chain: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.then(() => undefined, () => undefined);
  return next;
}

export async function readContacts(): Promise<Contact[]> {
  return enqueue(async () => {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw) as Contact[];
  });
}

/** Read + mutate + write serialized on a single mutex chain. */
export async function mutateContacts(
  updater: (contacts: Contact[]) => void,
): Promise<void> {
  return enqueue(async () => {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const contacts = JSON.parse(raw) as Contact[];
    updater(contacts);
    await fs.writeFile(DATA_PATH, JSON.stringify(contacts, null, 2), "utf8");
  });
}

export function stageFromInteractionCount(count: number): number {
  if (count >= 6) return 3;
  if (count >= 3) return 2;
  if (count >= 1) return 1;
  return 0;
}

export function nextContactId(contacts: Contact[]): string {
  const max = contacts.reduce((m, c) => {
    const n = Number.parseInt(c.id, 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return String(max + 1).padStart(3, "0");
}

function parseTime(isoOrDate: string): number {
  const t = Date.parse(isoOrDate);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Evolution leaderboard: highest stage first, then more interactions, then name.
 */
export function sortContactsByEvolutionLeaderboard(
  contacts: Contact[],
): Contact[] {
  return [...contacts].sort((a, b) => {
    if (b.stage !== a.stage) return b.stage - a.stage;
    const ib = b.interactions.length;
    const ia = a.interactions.length;
    if (ib !== ia) return ib - ia;
    return a.name.localeCompare(b.name);
  });
}

/** Oldest activity first (good for stale nudges). Uses last interaction note date or createdAt. */
export function sortContactsByStale(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => {
    const aLast =
      a.interactions.length > 0
        ? Math.max(...a.interactions.map((i) => parseTime(i.date)))
        : parseTime(a.createdAt);
    const bLast =
      b.interactions.length > 0
        ? Math.max(...b.interactions.map((i) => parseTime(i.date)))
        : parseTime(b.createdAt);
    return aLast - bLast;
  });
}
