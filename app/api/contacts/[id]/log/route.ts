import { NextResponse } from "next/server";
import type { Contact } from "@/lib/types";
import { mutateContacts, stageFromInteractionCount } from "@/lib/contacts";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    const note = typeof body?.note === "string" ? body.note.trim() : "";
    let dateRaw = typeof body?.date === "string" ? body.date.trim() : "";
    const today = new Date().toISOString().slice(0, 10);
    if (!dateRaw) dateRaw = today;

    if (!note) {
      return NextResponse.json({ error: "note required" }, { status: 400 });
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
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
