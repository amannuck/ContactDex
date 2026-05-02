import { NextResponse } from "next/server";
import type { Contact } from "@/lib/types";
import {
  mutateContacts,
  nextContactId,
  stageFromInteractionCount,
} from "@/lib/contacts";

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

      let created!: Contact;

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

      return NextResponse.json({ ok: true, contact: created! });
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

    return NextResponse.json(
      { error: 'unknown action; use "create" or "log"' },
      { status: 400 },
    );
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
