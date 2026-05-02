import { NextResponse } from "next/server";
import { readContacts } from "@/lib/contacts";
import { buildQuizRound } from "@/lib/quiz-round";

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
  return NextResponse.json(buildQuizRound(contact, contacts));
}
