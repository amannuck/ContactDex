import { NextResponse } from "next/server";
import type { Contact } from "@/lib/types";
import { readContacts } from "@/lib/contacts";

type HiddenKind = "name" | "bio" | "moveset";

function randomInt(max: number) {
  return Math.floor(Math.random() * max);
}

export async function GET() {
  const contacts = await readContacts();
  if (contacts.length === 0) {
    return NextResponse.json(
      { error: "no contacts for quiz" },
      { status: 404 },
    );
  }

  const contact = contacts[randomInt(contacts.length)]!;
  const kinds: HiddenKind[] = ["name", "bio", "moveset"];
  const hiddenField = kinds[randomInt(kinds.length)]!;

  const display: Contact = { ...contact, interactions: contact.interactions };

  let answer = "";
  let movesetIndex: number | undefined;

  if (hiddenField === "name") {
    answer = contact.name;
    display.name = "???";
  } else if (hiddenField === "bio") {
    answer = contact.bio;
    display.bio = "???";
  } else {
    if (contact.moveset.length === 0) {
      answer = contact.name;
      display.name = "???";
      const effective: HiddenKind = "name";
      return NextResponse.json({
        hiddenField: effective,
        display,
        answer,
        id: contact.id,
      });
    }
    movesetIndex = randomInt(contact.moveset.length);
    const original = contact.moveset[movesetIndex]!;
    answer = original;
    display.moveset = contact.moveset.map((m, i) =>
      i === movesetIndex ? "???" : m,
    );
  }

  return NextResponse.json({
    hiddenField,
    movesetIndex,
    display,
    answer,
    id: contact.id,
  });
}
