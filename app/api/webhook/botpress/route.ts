import { NextResponse } from "next/server";
import type { Contact } from "@/lib/types";
import {
  mutateContacts,
  nextContactId,
  readContacts,
  stageFromInteractionCount,
} from "@/lib/contacts";
import {
  buildAssistantResponse,
  type AssistantPayload,
} from "@/lib/contact-relevance";
import { resolveContextualQuizRound } from "@/lib/contextual-quiz";

type CreatePayload = {
  action: "create";
  data: {
    name: string;
    bio?: string;
    tags?: string[];
    moveset?: string[];
  };
};

type LogPayload = {
  action: "log";
  data: {
    id: string;
    note: string;
    date?: string;
  };
};

type AssistantHookPayload = {
  action: "assistant";
  data?: AssistantPayload & { query?: string };
};

type QuizContextHookPayload = {
  action: "quiz_contextual";
  data?: { query?: string; limit?: number };
};

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (payload?.action === "create") {
      const p = payload as CreatePayload;
      const name = typeof p.data?.name === "string" ? p.data.name.trim() : "";
      const bio =
        typeof p.data?.bio === "string" ? p.data.bio.trim() : "";
      const tags = Array.isArray(p.data?.tags)
        ? p.data!.tags!.filter((x: unknown) => typeof x === "string")
        : [];
      const moveset = Array.isArray(p.data?.moveset)
        ? p.data!.moveset!.filter((x: unknown) => typeof x === "string")
        : [];

      if (!name) {
        return NextResponse.json({ error: "name required" }, { status: 400 });
      }

      let created: Contact | undefined;

      await mutateContacts((contacts) => {
        const id = nextContactId(contacts);
        const entry: Contact = {
          id,
          name,
          bio,
          tags,
          moveset,
          stage: 0,
          interactions: [],
          createdAt: new Date().toISOString(),
        };
        contacts.push(entry);
        created = entry;
      });

      if (!created) {
        return NextResponse.json(
          { error: "could not persist contact" },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true, contact: created });
    }

    if (payload?.action === "log") {
      const p = payload as LogPayload;
      const id = typeof p.data?.id === "string" ? p.data.id.trim() : "";
      const note =
        typeof p.data?.note === "string" ? p.data.note.trim() : "";
      let dateRaw =
        typeof p.data?.date === "string" ? p.data.date.trim() : "";
      const today = new Date().toISOString().slice(0, 10);
      if (!dateRaw) dateRaw = today;

      if (!id || !note) {
        return NextResponse.json(
          { error: "id and note required" },
          { status: 400 },
        );
      }

      let updated: Contact | null = null;

      await mutateContacts((contacts) => {
        const idx = contacts.findIndex((c) => c.id === id);
        if (idx === -1) return;
        const cur = contacts[idx];
        cur.interactions = [...cur.interactions, { note, date: dateRaw }];
        cur.stage = stageFromInteractionCount(cur.interactions.length);
        contacts[idx] = cur;
        updated = cur;
      });

      if (!updated) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, contact: updated });
    }

    if (payload?.action === "assistant") {
      const raw = payload as AssistantHookPayload;
      const data = raw.data ?? {};
      const contacts = await readContacts();
      const result = buildAssistantResponse(contacts, {
        query: typeof data.query === "string" ? data.query : undefined,
        mode: data.mode,
        limit: data.limit,
      });
      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json({ ok: true, assistant: result });
    }

    if (payload?.action === "quiz_contextual") {
      const raw = payload as QuizContextHookPayload;
      const q =
        typeof raw.data?.query === "string" ? raw.data.query.trim() : "";
      const contacts = await readContacts();
      const poolCap =
        typeof raw.data?.limit === "number" &&
        Number.isFinite(raw.data.limit) &&
        raw.data.limit >= 1
          ? Math.floor(raw.data.limit)
          : undefined;

      const result = resolveContextualQuizRound(q, contacts, { poolCap });

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ ok: true, quiz: result.round });
    }

    return NextResponse.json(
      {
        error:
          'unknown action — use create | log | assistant | quiz_contextual',
      },
      { status: 400 },
    );
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
