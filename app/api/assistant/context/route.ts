import { NextResponse } from "next/server";
import { readContacts } from "@/lib/contacts";
import {
  buildAssistantResponse,
  type AssistantPayload,
} from "@/lib/contact-relevance";

export async function POST(request: Request) {
  try {
    const raw = (await request.json()) as unknown;
    const parsed =
      typeof raw === "object" && raw !== null
        ? (raw as Partial<AssistantPayload>)
        : {};

    const modeParsed =
      parsed.mode === "auto" ||
      parsed.mode === "event" ||
      parsed.mode === "reconnect"
        ? parsed.mode
        : undefined;

    const body: AssistantPayload = {
      query: typeof parsed.query === "string" ? parsed.query : undefined,
      mode: modeParsed,
      limit:
        typeof parsed.limit === "number" && Number.isFinite(parsed.limit)
          ? parsed.limit
          : undefined,
    };

    const contacts = await readContacts();
    const result = buildAssistantResponse(contacts, body);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false as const, error: "invalid JSON body" },
      { status: 400 },
    );
  }
}
