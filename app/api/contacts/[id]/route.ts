import { NextResponse } from "next/server";
import type { Contact } from "@/lib/types";
import { mutateContacts, readContacts } from "@/lib/contacts";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const { id } = await context.params;
  const contacts = await readContacts();
  const found = contacts.find((c) => c.id === id);
  if (!found) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(found);
}

export async function PATCH(request: Request, context: Params) {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as Partial<Contact>;
    let updated: Contact | null = null;

    await mutateContacts((contacts) => {
      const idx = contacts.findIndex((c) => c.id === id);
      if (idx === -1) return;
      const cur = contacts[idx];
      const next = { ...cur };
      if (typeof body.name === "string") next.name = body.name.trim();
      if (typeof body.bio === "string") next.bio = body.bio.trim();
      if (Array.isArray(body.tags))
        next.tags = body.tags.filter((x) => typeof x === "string");
      if (Array.isArray(body.moveset))
        next.moveset = body.moveset.filter((x) => typeof x === "string");
      if (
        typeof body.stage === "number" &&
        body.stage >= 0 &&
        body.stage <= 3
      )
        next.stage = body.stage;
      if (typeof body.avatar === "string") next.avatar = body.avatar;
      contacts[idx] = next;
      updated = next;
    });

    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
