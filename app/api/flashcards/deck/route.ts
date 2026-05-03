import { NextResponse } from "next/server";
import { requestRandomDeckCardIdsViaBotpress } from "@/lib/botpress-flashcards";
import { readContacts } from "@/lib/contacts";
import { resolveContextualContactPool } from "@/lib/contextual-quiz";
import { buildRandomDexDeck, FLASHCARD_DECK_MAX } from "@/lib/flashcard-deck";

const DEFAULT_DEX_LIMIT = 18;
const DEFAULT_EVENT_LIMIT = 20;

export async function POST(request: Request) {
  try {
    const raw = (await request.json()) as unknown;
    const body =
      typeof raw === "object" && raw !== null
        ? (raw as Partial<{ query: string; limit?: number }>)
        : {};
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const limit =
      typeof body.limit === "number" &&
      Number.isFinite(body.limit) &&
      body.limit >= 1
        ? Math.floor(body.limit)
        : undefined;

    const contacts = await readContacts();

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: "No contacts in Dex." },
        { status: 404 },
      );
    }

    if (!query) {
      const cap = Math.min(limit ?? DEFAULT_DEX_LIMIT, FLASHCARD_DECK_MAX);
      const bpIds = await requestRandomDeckCardIdsViaBotpress(cap);
      if (bpIds?.length) {
        const byId = new Map(contacts.map((c) => [c.id, c]));
        const seen = new Set<string>();
        const fromBot: typeof contacts = [];
        for (const id of bpIds) {
          if (seen.has(id)) continue;
          const c = byId.get(id);
          if (c) {
            seen.add(id);
            fromBot.push(c);
          }
        }
        if (fromBot.length > 0) {
          return NextResponse.json({
            mode: "dex" as const,
            contacts: fromBot,
            source: "botpress" as const,
          });
        }
      }
      const deck = buildRandomDexDeck(contacts, cap);
      return NextResponse.json({
        mode: "dex" as const,
        contacts: deck,
        source: "dex" as const,
      });
    }

    const poolCap =
      limit !== undefined
        ? Math.min(limit, FLASHCARD_DECK_MAX)
        : DEFAULT_EVENT_LIMIT;

    const result = resolveContextualContactPool(query, contacts, {
      poolCap,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      mode: "event" as const,
      brief: result.brief,
      contacts: result.contacts,
    });
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
}
