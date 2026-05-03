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

async function loadContactsJsonFile(): Promise<Contact[]> {
  let raw: string;
  try {
    raw = await fs.readFile(DATA_PATH, "utf8");
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "ENOENT") {
      throw new Error(
        `ContactDex: contacts.json not found (looked at ${DATA_PATH}). Run npm run dev from the project folder that contains the data directory.`,
      );
    }
    throw e;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("root value must be a JSON array");
    }
    return parsed as Contact[];
  } catch (e) {
    const detail =
      e instanceof SyntaxError
        ? e.message
        : e instanceof Error
          ? e.message
          : String(e);
    throw new Error(
      `ContactDex: corrupt contacts.json — ${detail} (${DATA_PATH})`,
    );
  }
}

export async function readContacts(): Promise<Contact[]> {
  return enqueue(loadContactsJsonFile);
}

/** Read + mutate + write serialized on a single mutex chain. */
export async function mutateContacts(
  updater: (contacts: Contact[]) => void,
): Promise<void> {
  return enqueue(async () => {
    const contacts = await loadContactsJsonFile();
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
