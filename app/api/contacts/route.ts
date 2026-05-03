import { NextResponse } from "next/server";
import type { Contact } from "@/lib/types";
import {
  mutateContacts,
  nextContactId,
  readContacts,
  sortContactsByStale,
} from "@/lib/contacts";

function filterContacts(
  list: Contact[],
  search?: string | null,
  tag?: string | null,
): Contact[] {
  let result = list;
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.bio.toLowerCase().includes(q),
    );
  }
  if (tag && tag.trim()) {
    const t = tag.trim().toLowerCase();
    result = result.filter((c) =>
      c.tags.some((x) => x.toLowerCase() === t),
    );
  }
  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const tag = searchParams.get("tag");
  const sort = searchParams.get("sort");

  let list = await readContacts();
  if (sort === "stale") {
    list = sortContactsByStale(list);
  }
  list = filterContacts(list, search, tag);
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const bio =
      typeof body?.bio === "string" ? body.bio.trim() : "";
    const tags = Array.isArray(body?.tags)
      ? body.tags.filter((x: unknown) => typeof x === "string")
      : [];
    const moveset = Array.isArray(body?.moveset)
      ? body.moveset.filter((x: unknown) => typeof x === "string")
      : [];
    const avatarRaw =
      typeof body?.avatar === "string" ? body.avatar.trim() : "";
    const avatar = avatarRaw || undefined;

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
        ...(avatar ? { avatar } : {}),
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
    return NextResponse.json(created, { status: 201 });


  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
