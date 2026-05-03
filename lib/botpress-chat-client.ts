/**
 * Shared Botpress Cloud Chat Runtime helpers (deck shuffle, infer stage, …).
 */

export const BOTPRESS_CLOUD_API = "https://api.botpress.cloud";

export function botpressEnvToken(): string | undefined {
  return (
    process.env.BOTPRESS_PERSONAL_ACCESS_TOKEN?.trim() ||
    process.env.BOTPRESS_TOKEN?.trim()
  );
}

export function botpressEnvBotId(): string | undefined {
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

export function botpressDefaultIntegrationId(): string | undefined {
  return (
    process.env.BOTPRESS_INTEGRATION_ID?.trim() ||
    process.env.BOTPRESS_X_INTEGRATION_ID?.trim()
  );
}

export function botpressHeaders(
  botId: string,
  integrationId?: string,
): HeadersInit {
  const token = botpressEnvToken();
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-bot-id": botId,
  };
  const integ = integrationId?.trim() || botpressDefaultIntegrationId();
  if (integ) h["x-integration-id"] = integ;
  return h;
}

export async function botpressCreateUser(
  botId: string,
  integrationId?: string,
  tags: Record<string, string> = { source: "contactdex" },
  name = "ContactDex",
): Promise<string> {
  const res = await fetch(`${BOTPRESS_CLOUD_API}/v1/chat/users`, {
    method: "POST",
    headers: botpressHeaders(botId, integrationId),
    body: JSON.stringify({ tags, name }),
  });
  if (!res.ok) throw new Error(`createUser ${res.status}`);
  const data = (await res.json()) as { user?: { id?: string } };
  const id = data.user?.id;
  if (!id) throw new Error("createUser: missing id");
  return id;
}

export async function botpressCreateConversation(
  botId: string,
  channel: string,
  integrationId?: string,
  tags: Record<string, string> = { source: "contactdex" },
): Promise<string> {
  const res = await fetch(`${BOTPRESS_CLOUD_API}/v1/chat/conversations`, {
    method: "POST",
    headers: botpressHeaders(botId, integrationId),
    body: JSON.stringify({
      channel,
      tags,
    }),
  });
  if (!res.ok) throw new Error(`createConversation ${res.status}`);
  const data = (await res.json()) as { conversation?: { id?: string } };
  const id = data.conversation?.id;
  if (!id) throw new Error("createConversation: missing id");
  return id;
}

export async function botpressPostTextMessage(
  botId: string,
  userId: string,
  conversationId: string,
  text: string,
  integrationId?: string,
): Promise<void> {
  const res = await fetch(`${BOTPRESS_CLOUD_API}/v1/chat/messages`, {
    method: "POST",
    headers: botpressHeaders(botId, integrationId),
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

export async function botpressListMessages(
  botId: string,
  conversationId: string,
  integrationId?: string,
  afterDateIso?: string,
): Promise<
  Array<{ direction?: string; payload?: unknown; createdAt?: string }>
> {
  const url = new URL(`${BOTPRESS_CLOUD_API}/v1/chat/messages`);
  url.searchParams.set("conversationId", conversationId);
  if (afterDateIso) url.searchParams.set("afterDate", afterDateIso);
  const res = await fetch(url.toString(), {
    headers: botpressHeaders(botId, integrationId),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { messages?: unknown[] };
  if (!Array.isArray(data.messages)) return [];
  return data.messages as Array<{
    direction?: string;
    payload?: unknown;
    createdAt?: string;
  }>;
}

export function textFromMessagePayload(payload: unknown): string {
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

export function botpressDefaultChannel(): string {
  return (
    process.env.BOTPRESS_CHANNEL?.trim() ||
    process.env.BOTPRESS_WEBCHAT_CHANNEL?.trim() ||
    "web"
  );
}
