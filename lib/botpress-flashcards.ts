/**
 * Request randomized flashcard order via Botpress Cloud Runtime API.
 * The bot must handle the trigger message, call ContactDex
 * POST /api/webhook/botpress { "action":"flashcards_random", "data":{ limit } },
 * then reply in chat with JSON: {"cardIds":["001","002",...]} (same order as study deck).
 *
 * If env is incomplete or the bot never replies with valid JSON, returns null (caller should fall back).
 */

const API = "https://api.botpress.cloud";

function envToken(): string | undefined {
  return (
    process.env.BOTPRESS_PERSONAL_ACCESS_TOKEN?.trim() ||
    process.env.BOTPRESS_TOKEN?.trim()
  );
}

function envBotId(): string | undefined {
  const direct =
    process.env.BOTPRESS_BOT_ID?.trim() ||
    process.env.NEXT_PUBLIC_BOTPRESS_BOT_ID?.trim();
  if (direct) return direct;
  const raw = process.env.NEXT_PUBLIC_BOTPRESS_WEBCHAT_CONFIG?.trim();
  if (!raw) return undefined;
  try {
    const cfg = JSON.parse(raw) as { botId?: string };
    return typeof cfg.botId === "string" ? cfg.botId.trim() : undefined;
  } catch {
    return undefined;
  }
}

function headers(botId: string, integrationId?: string): HeadersInit {
  const token = envToken();
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-bot-id": botId,
  };
  const integ =
    integrationId?.trim() ||
    process.env.BOTPRESS_INTEGRATION_ID?.trim() ||
    process.env.BOTPRESS_X_INTEGRATION_ID?.trim();
  if (integ) h["x-integration-id"] = integ;
  return h;
}

function makeServerUserId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function textFromMessagePayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as Record<string, unknown>;
  if (typeof p.text === "string") return p.text;
  if (typeof p.markdown === "string") return p.markdown;
  const inner = p.payload;
  if (inner && typeof inner === "object") {
    const o = inner as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
  }
  return "";
}

function parseCardIdsFromBotText(text: string): string[] | null {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const brace = trimmed.match(/\{[\s\S]*"cardIds"[\s\S]*\}/);
  if (brace) candidates.push(brace[0]!);
  for (const chunk of candidates) {
    try {
      const j = JSON.parse(chunk) as { cardIds?: unknown };
      if (
        Array.isArray(j.cardIds) &&
        j.cardIds.length > 0 &&
        j.cardIds.every((x) => typeof x === "string")
      ) {
        return j.cardIds as string[];
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

function parseCardIdsFromMessagePayload(payload: unknown): string[] | null {
  return parseCardIdsFromBotText(textFromMessagePayload(payload));
}

async function createUser(botId: string, integrationId?: string): Promise<string> {
  const res = await fetch(`${API}/v1/chat/users`, {
    method: "POST",
    headers: headers(botId, integrationId),
    body: JSON.stringify({
      tags: { source: "contactdex-flashcards" },
      name: "ContactDex deck",
    }),
  });
  if (!res.ok) throw new Error(`createUser ${res.status}`);
  const data = (await res.json()) as { user?: { id?: string } };
  const id = data.user?.id;
  if (!id) throw new Error("createUser: missing id");
  return id;
}

async function createConversation(
  botId: string,
  channel: string,
  integrationId?: string,
): Promise<string> {
  const res = await fetch(`${API}/v1/chat/conversations`, {
    method: "POST",
    headers: headers(botId, integrationId),
    body: JSON.stringify({
      channel,
      tags: { source: "contactdex-flashcards" },
    }),
  });
  if (!res.ok) throw new Error(`createConversation ${res.status}`);
  const data = (await res.json()) as { conversation?: { id?: string } };
  const id = data.conversation?.id;
  if (!id) throw new Error("createConversation: missing id");
  return id;
}

async function postTriggerMessage(
  botId: string,
  userId: string,
  conversationId: string,
  text: string,
  integrationId?: string,
): Promise<void> {
  const res = await fetch(`${API}/v1/chat/messages`, {
    method: "POST",
    headers: headers(botId, integrationId),
    body: JSON.stringify({
      userId,
      conversationId,
      type: "text",
      payload: { type: "text", text },
      tags: { source: "contactdex" },
    }),
  });
  if (!res.ok) throw new Error(`createMessage ${res.status}`);
}

async function listMessages(
  botId: string,
  conversationId: string,
  integrationId?: string,
  afterDateIso?: string,
): Promise<
  Array<{ direction?: string; payload?: unknown; createdAt?: string }>
> {
  const url = new URL(`${API}/v1/chat/messages`);
  url.searchParams.set("conversationId", conversationId);
  if (afterDateIso) url.searchParams.set("afterDate", afterDateIso);
  const res = await fetch(url.toString(), { headers: headers(botId, integrationId) });
  if (!res.ok) return [];
  const data = (await res.json()) as { messages?: unknown[] };
  if (!Array.isArray(data.messages)) return [];
  return data.messages as Array<{
    direction?: string;
    payload?: unknown;
    createdAt?: string;
  }>;
}

/**
 * Returns contact ids in study order, or null if Botpress is not configured or did not respond usefully.
 */
export async function requestRandomDeckCardIdsViaBotpress(
  limit: number,
): Promise<string[] | null> {
  const token = envToken();
  const botId = envBotId();
  if (!token || !botId) return null;

  const integrationId =
    process.env.BOTPRESS_INTEGRATION_ID?.trim() ||
    process.env.BOTPRESS_X_INTEGRATION_ID?.trim();
  const channel =
    process.env.BOTPRESS_CHANNEL?.trim() ||
    process.env.BOTPRESS_WEBCHAT_CHANNEL?.trim() ||
    "web";
  const triggerBase =
    process.env.BOTPRESS_FLASHCARD_TRIGGER?.trim() || "__dex_flashcards__";
  const cap = Math.max(1, Math.min(limit, 40));

  try {
    const userId = await createUser(botId, integrationId);
    const conversationId = await createConversation(botId, channel, integrationId);
    const trigger = `${triggerBase}:${cap}`;
    const afterDateIso = new Date(Date.now() - 1500).toISOString();
    await postTriggerMessage(
      botId,
      userId,
      conversationId,
      trigger,
      integrationId,
    );

    const deadline = Date.now() + 18_000;
    const minWait = 400;
    await new Promise((r) => setTimeout(r, minWait));

    while (Date.now() < deadline) {
      const messages = await listMessages(
        botId,
        conversationId,
        integrationId,
        afterDateIso,
      );
      for (const m of messages) {
        if (m.direction !== "outgoing") continue;
        const ids = parseCardIdsFromMessagePayload(m.payload);
        if (ids?.length) return ids.slice(0, cap);
      }
      await new Promise((r) => setTimeout(r, 450));
    }
  } catch {
    return null;
  }

  return null;
}
