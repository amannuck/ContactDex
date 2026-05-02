"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AssistantMatchJson,
  AssistantPayload,
  AssistantResponseJson,
} from "@/lib/contact-relevance";

type ChatRole = "user" | "assistant";

interface ChatBubble {
  id: string;
  role: ChatRole;
  text: string;
  matches?: AssistantMatchJson[];
  quizLinkQuery?: string;
}

const STARTERS = [
  {
    label: "AI hackathon prep",
    body: `I'm heading to an AI / ML hackathon. Who in my Dex overlaps with bots, embeddings, infra, founders, investors, or conference chatter? Mention intros I can tee up.`,
  },
  {
    label: "YC + fundraising scene",
    body: "I'm spending a week networking about Series A readiness and incubator intros. Surface anyone with YC, investor, founder, design partner, or GTM moves.",
  },
  {
    label: "Stale nudges (auto)",
    body: "__RECONNECT_STUB__",
  },
];

type PromptPayload = AssistantPayload & {
  fallbackUserText?: string;
};

async function fetchAssistant(payload: AssistantPayload) {
  const res = await fetch("/api/assistant/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as
    | AssistantResponseJson
    | { ok: false; error: string };
  return { ok: res.ok, json };
}

export default function EventPrepAssistant() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      id: "seed",
      role: "assistant",
      text:
        "Describe the vibe of your trip or event—teams, mentors, investors, infra—and I’ll pull likely matches from your Dex. Pick a starter below or ask in plain language who you should reconnect with first.",
    },
  ]);

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  const pushBubble = useCallback((bubble: ChatBubble) => {
    setMessages((list) => [...list, bubble]);
  }, []);

  const runAssistant = useCallback(
    async (prompt: PromptPayload) => {
      const { fallbackUserText, ...payload } = prompt;
      if (fallbackUserText) {
        pushBubble({
          id: crypto.randomUUID(),
          role: "user",
          text: fallbackUserText,
        });
      }
      setBusy(true);
      try {
        const { ok, json } = await fetchAssistant(payload);
        if (!ok || !("summary" in json)) {
          const err =
            (json as { error?: string }).error ?? "Couldn't reach Dex brain.";
          pushBubble({ id: crypto.randomUUID(), role: "assistant", text: err });
          return;
        }

        let quizLinkQuery: string | undefined;
        if (
          json.mode === "event" &&
          (json.matches?.length ?? 0) > 0 &&
          !(typeof fallbackUserText === "string" &&
            fallbackUserText.trim().startsWith("(Assistant mode"))
        ) {
          const fromPrompt =
            typeof payload.query === "string" ? payload.query.trim() : "";
          const fromChip =
            typeof fallbackUserText === "string"
              ? fallbackUserText.trim()
              : "";
          const pick =
            fromPrompt.length > 0 ? fromPrompt : fromChip.length > 0 ? fromChip : "";
          if (pick.length > 0) quizLinkQuery = pick;
        }

        pushBubble({
          id: crypto.randomUUID(),
          role: "assistant",
          text: json.summary,
          matches: json.matches,
          quizLinkQuery,
        });
      } finally {
        setBusy(false);
      }
    },
    [pushBubble],
  );

  async function submitFromInput() {
    const q = input.trim();
    if (!q || busy) return;
    pushBubble({
      id: crypto.randomUUID(),
      role: "user",
      text: q,
    });
    setInput("");
    await runAssistant({ query: q, mode: "auto", limit: 6 });
  }

  async function starterClicked(body: string) {
    if (busy) return;
    if (body === "__RECONNECT_STUB__") {
      await runAssistant({
        query: "",
        mode: "reconnect",
        limit: 5,
        fallbackUserText:
          "(Assistant mode • reconnect leaderboard — ranked by staleness)",
      });
      return;
    }
    await runAssistant({
      query: body,
      mode: "event",
      limit: 7,
      fallbackUserText: body,
    });
  }

  const panelClasses = open
    ? "pointer-events-auto translate-y-0 opacity-100"
    : "pointer-events-none translate-y-6 opacity-0";

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="dex-prep-drawer"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 left-6 z-[60] flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-600/95 px-4 py-2.5 text-sm font-semibold text-white shadow-2xl shadow-emerald-900/40 backdrop-blur transition hover:bg-emerald-500"
      >
        <span aria-hidden>🌿</span>
        Event prep assistant
      </button>

      <div
        id="dex-prep-drawer"
        className={`fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        role="presentation"
      />

      <section
        className={`fixed bottom-28 left-4 right-4 z-[60] mx-auto max-w-xl rounded-3xl border border-slate-700 bg-[#0f141bcc] px-6 py-5 shadow-2xl shadow-black/55 backdrop-blur-md transition-all duration-200 sm:left-auto sm:right-28 sm:w-[min(420px,calc(100vw-96px))] ${panelClasses}`}
        aria-hidden={!open}
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/85">
              Context helper
            </p>
            <h2 className="text-lg font-semibold text-white">Dex strategist</h2>
            <p className="text-xs text-slate-400">
              Scores contacts against what you&apos;re prepping for—not legal or
              calendar advice.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close assistant"
            className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </header>

        <div className="mb-3 flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button
              key={s.label}
              type="button"
              disabled={busy}
              onClick={() =>
                starterClicked(s.body).catch(() => {
                  /* noop */
                })
              }
              className="rounded-full border border-slate-600 bg-slate-900/55 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-emerald-400/60 hover:text-white disabled:opacity-40"
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex max-h-[40vh] flex-col gap-3 overflow-y-auto pr-2 text-sm">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl border px-4 py-3 ${
                m.role === "user"
                  ? "ml-8 border-slate-600 bg-[#171f2bcc] text-slate-50"
                  : "mr-5 border-emerald-500/30 bg-[#14302555] text-slate-50"
              }`}
            >
              <p className="whitespace-pre-wrap leading-snug">{m.text}</p>
              {!!m.matches?.length && (
                <ul className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs">
                  {m.matches.map((hit) => (
                    <li
                      key={`${m.id}-${hit.id}`}
                      className="rounded-xl border border-slate-600/70 bg-black/25 p-2"
                    >
                      <Link
                        href={`/contact/${hit.id}`}
                        className="font-semibold text-emerald-200 hover:underline"
                      >
                        #{hit.id} • {hit.name}
                      </Link>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Stale&nbsp;≈&nbsp;
                        <span className="font-mono text-sky-300">
                          {hit.staleDaysApprox}d
                        </span>
                      </p>
                      {hit.reasons.slice(0, 3).map((reason, idx) => (
                        <p
                          key={`${hit.id}-r-${idx}`}
                          className="text-[11px] text-slate-300"
                        >
                          • {reason}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
              {m.role === "assistant" &&
                typeof m.quizLinkQuery === "string" &&
                m.quizLinkQuery.length > 0 && (
                  <p className="mt-3 border-t border-white/10 pt-3">
                    <Link
                      href={`/study?context=${encodeURIComponent(m.quizLinkQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-emerald-300 underline decoration-emerald-500/55 underline-offset-2 hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      Quiz me on these picks → Study
                    </Link>
                  </p>
                )}
            </div>
          ))}
          <div ref={endRef} />
          {busy && (
            <p className="text-xs text-emerald-200/85">Analyzing Dex entries…</p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            aria-label="Ask the assistant"
            placeholder="Prep me for Robotics Week + infra judges…"
            className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-[#111822] px-4 py-2 text-sm outline-none ring-emerald-400/35 focus:border-emerald-400/65 focus:ring-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitFromInput();
              }
            }}
          />
          <button
            type="button"
            disabled={busy || !input.trim()}
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-35"
            onClick={() =>
              submitFromInput().catch(() => {
                /* noop */
              })
            }
          >
            Send
          </button>
        </div>
      </section>
    </>
  );
}
