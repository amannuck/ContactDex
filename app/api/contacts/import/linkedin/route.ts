import { NextResponse } from "next/server";
import type { Contact } from "@/lib/types";
import { mutateContacts, nextContactId } from "@/lib/contacts";

type InboundContact = {
  name?: unknown;
  bio?: unknown;
  tags?: unknown;
  moveset?: unknown;
  linkedinExternalKey?: unknown;
  avatar?: unknown;
};

/**
 * Internal bridge from Python importer worker (Bearer CONTACTDEX_IMPORT_SECRET).
 * Upserts-by-key: skips rows whose linkedinExternalKey already exists locally.
 */
export async function POST(request: Request) {
  const secret = process.env.CONTACTDEX_IMPORT_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CONTACTDEX_IMPORT_SECRET not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization")?.trim();
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const inbound = body as { contacts?: unknown };
  if (!Array.isArray(inbound.contacts)) {
    return NextResponse.json(
      { error: "body must include contacts array" },
      { status: 400 },
    );
  }

  let created = 0;
  let skipped = 0;

  await mutateContacts((list) => {
    const rows = inbound.contacts as InboundContact[];
    for (const row of rows) {
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!name) {
        skipped += 1;
        continue;
      }
      const key =
        typeof row.linkedinExternalKey === "string"
          ? row.linkedinExternalKey.trim()
          : "";
      if (key && list.some((c) => c.linkedinExternalKey === key)) {
        skipped += 1;
        continue;
      }
      const bio = typeof row.bio === "string" ? row.bio.trim() : "";
      const tags = Array.isArray(row.tags)
        ? row.tags.filter((x): x is string => typeof x === "string")
        : [];
      const moveset = Array.isArray(row.moveset)
        ? row.moveset.filter((x): x is string => typeof x === "string")
        : [];
      const avatar =
        typeof row.avatar === "string" ? row.avatar.trim() : "";
      const id = nextContactId(list);
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
      if (key) {
        entry.linkedinExternalKey = key;
      }
      if (avatar) {
        entry.avatar = avatar;
      }
      list.push(entry);
      created += 1;
    }
  });

  return NextResponse.json({ created, skipped });
}
