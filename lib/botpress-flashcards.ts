/**
 * Request randomized flashcard order via Botpress Cloud Runtime API.
 * The bot must handle the trigger message, call ContactDex
 * POST /api/webhook/botpress { "action":"flashcards_random", "data":{ limit } },
 * then reply in chat with JSON: {"cardIds":["001","002",...]} (same order as study deck).
 *
 * If env is incomplete or the bot never replies with valid JSON, returns null (caller should fall back).
 */

import {
  botpressCreateConversation,
  botpressCreateUser,
  botpressDefaultChannel,
  botpressDefaultIntegrationId,
  botpressEnvBotId,
  botpressEnvToken,
  botpressListMessages,
  botpressPostTextMessage,
  textFromMessagePayload,
} from "@/lib/botpress-chat-client";

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

/**
 * Returns contact ids in study order, or null if Botpress is not configured or did not respond usefully.
 */
export async function requestRandomDeckCardIdsViaBotpress(
  limit: number,
): Promise<string[] | null> {
  const token = botpressEnvToken();
  const botId = botpressEnvBotId();
  if (!token || !botId) return null;

  const integrationId = botpressDefaultIntegrationId();
  const channel = botpressDefaultChannel();
  const triggerBase =
    process.env.BOTPRESS_FLASHCARD_TRIGGER?.trim() || "__dex_flashcards__";
  const cap = Math.max(1, Math.min(limit, 40));

  try {
    const userId = await botpressCreateUser(botId, integrationId, {
      source: "contactdex-flashcards",
    });
    const conversationId = await botpressCreateConversation(
      botId,
      channel,
      integrationId,
      { source: "contactdex-flashcards" },
    );
    const trigger = `${triggerBase}:${cap}`;
    const afterDateIso = new Date(Date.now() - 1500).toISOString();
    await botpressPostTextMessage(
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
      const messages = await botpressListMessages(
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
