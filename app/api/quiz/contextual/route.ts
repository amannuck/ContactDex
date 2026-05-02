import { NextResponse } from "next/server";
import { readContacts } from "@/lib/contacts";
import { resolveContextualQuizRound } from "@/lib/contextual-quiz";

/**
 * Scoped flashcards: only contacts that score via {@link scoreEventRelevance}.
 * Uses POST so full event briefs are safe (mirror /api/assistant/context pattern).
 */

export async function POST(request: Request) {
  try {
    const raw = (await request.json()) as unknown;
    const body =
      typeof raw === "object" && raw !== null
        ? (raw as Partial<{ query: string; limit?: number }>)
        : {};
    const query = typeof body.query === "string" ? body.query : "";
    const limit =
      typeof body.limit === "number" &&
      Number.isFinite(body.limit) &&
      body.limit >= 1
        ? Math.floor(body.limit)
        : undefined;

    const contacts = await readContacts();
    const result = resolveContextualQuizRound(query, contacts, {
      poolCap: limit,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.round);
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
}
