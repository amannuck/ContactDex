"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  inferConnectionsIntent,
  type AssistantMatchJson,
  type AssistantPayload,
  type AssistantResponseJson,
} from "@/lib/contact-relevance";

type ChatRole = "user" | "assistant";

interface ChatBubble {
  id: string;
  role: ChatRole;
  text: string;
  matches?: AssistantMatchJson[];
  quizLinkQuery?: string;
}

/** Readable chat prose for roster Q&A — not just a one-line teaser. */
function composeConnectionsChatText(json: AssistantResponseJson): string {
  const summary = json.summary.trim();
  if (!json.matches.length) return summary;

  const lines = json.matches.map((m, i) => {
    const tagStr =
      m.tags.length > 0 ? ` — tags: ${m.tags.slice(0, 8).join(", ")}` : "";
    let note = "";
    const r = m.reasons.find(
      (x) =>
        x &&
        x !== "Snapshot pick" &&
        !/^Stale ≈/.test(x) &&
        !/^Dex lookup/.test(x),
    );
    if (r) note = ` — ${r}`;
    else if (
      json.query.includes("(dex overview)") &&
      m.reasons.includes("Snapshot pick")
    )
      note = " — sampler from your Dex";
    else if (/^Stale ≈/.test(m.reasons[0] ?? ""))
      note = ` — stale ≈ ${m.staleDaysApprox}d`;
    return `${i + 1}. ${m.name} (#${m.id})${tagStr}${note}`;
  });

  return `${summary}\n\nListed in your Dex:\n${lines.join("\n")}`;
}

/** Sparkle “agent” glyph for the floating assistant control (inline SVG, no extra deps). */
function AgentBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  {
    label: "Dex & connections Q&A",
    body: "__CONNECTIONS_OVERVIEW_STUB__",
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
        "Describe an event brief and you’ll see scored matches from your Dex — or ask about your roster (counts, Dex IDs like “#042”, tags, bios, notes). Pick a starter below or ask straight who deserves a reconnect ping first.",
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

        const bubbleText =
          json.mode === "connections"
            ? composeConnectionsChatText(json)
            : json.summary;

        pushBubble({
          id: crypto.randomUUID(),
          role: "assistant",
          text: bubbleText,
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
    await runAssistant({
      query: q,
      mode: inferConnectionsIntent(q) ? "connections" : "auto",
      limit: inferConnectionsIntent(q) ? 12 : 8,
    });
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
    if (body === "__CONNECTIONS_OVERVIEW_STUB__") {
      await runAssistant({
        query: "",
        mode: "connections",
        limit: 8,
        fallbackUserText:
          "Give me a snapshot of my Dex — how many connections, tags, samples.",
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
    ? "translate-x-0 translate-y-0 scale-100 opacity-100"
    : "translate-x-6 translate-y-3 scale-[0.97] opacity-0";

  return (
    <>
      <div
        id="dex-prep-drawer"
        className={`fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        role="presentation"
        aria-hidden={!open}
      />

      <section
        inert={!open}
        className={`fixed bottom-[max(5.75rem,calc(4rem+env(safe-area-inset-bottom,0px)))] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] z-[60] flex h-[min(72dvh,560px)] max-h-[min(72dvh,560px)] min-h-0 origin-bottom flex-col gap-3 overflow-hidden rounded-2xl border border-slate-700 bg-[#0f141bcc] px-4 py-4 font-pixel shadow-2xl shadow-black/55 backdrop-blur-md transition-all duration-200 ease-out sm:bottom-[max(6.75rem,calc(5rem+env(safe-area-inset-bottom,0px)))] sm:left-auto sm:right-[max(calc(env(safe-area-inset-right,0px)+1.25rem),1.75rem)] sm:h-[min(76dvh,620px)] sm:max-h-[min(76dvh,620px)] sm:w-[min(400px,calc(100vw-2.5rem-env(safe-area-inset-right,0px)))] sm:origin-bottom-right sm:px-5 sm:py-4 ${open ? "pointer-events-auto" : "pointer-events-none [&_*]:pointer-events-none"} ${panelClasses}`}
        aria-hidden={!open}
      >
        <header className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <p className="font-pixel-display text-xs uppercase tracking-[0.12em] text-emerald-300/90">
              Context helper
            </p>
            <h2 className="font-pixel-display text-sm font-normal leading-tight text-white sm:text-base">
              Dex strategist
            </h2>
            <p className="text-[10px] leading-snug text-slate-500 sm:text-[11px]">
              Scores contacts for your prep — not legal advice.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close assistant"
            className="shrink-0 rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </header>

        <div className="flex shrink-0 flex-wrap gap-1.5">
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
              className="rounded-full border border-slate-600 bg-slate-900/55 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-emerald-400/60 hover:text-white disabled:opacity-40 sm:px-3 sm:py-1 sm:text-[11px]"
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden overscroll-contain pr-2 text-xs [-webkit-overflow-scrolling:touch] sm:text-sm">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`min-w-0 shrink-0 rounded-xl border px-3 py-2 ${
                m.role === "user"
                  ? "ml-4 border-slate-600 bg-[#171f2bcc] text-slate-50"
                  : "mr-3 border-emerald-500/30 bg-[#14302555] text-slate-50"
              }`}
            >
              <p className="break-words whitespace-pre-wrap leading-snug">
                {m.text}
              </p>
              {!!m.matches?.length && (
                <ul className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 pt-2 text-[11px] sm:grid-cols-1 sm:text-xs">
                  {m.matches.map((hit) => (
                    <li
                      key={`${m.id}-${hit.id}`}
                      className="rounded-lg border border-slate-600/70 bg-black/25 p-2"
                    >
                      <Link
                        href={`/contact/${hit.id}`}
                        className="text-xs font-semibold leading-snug text-emerald-200 hover:underline sm:text-[11px]"
                      >
                        #{hit.id} • {hit.name}
                      </Link>
                      <p className="mt-1 text-[10px] leading-snug text-slate-400 sm:text-[11px]">
                        Stale&nbsp;≈&nbsp;
                        <span className="font-mono text-sky-300">
                          {hit.staleDaysApprox}d
                        </span>
                      </p>
                      {hit.reasons.slice(0, 3).map((reason, idx) => (
                        <p
                          key={`${hit.id}-r-${idx}`}
                          className="mt-0.5 text-[10px] leading-snug text-slate-300 sm:text-[11px]"
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
                  <div className="mt-3 grid gap-2.5 border-t border-white/15 pt-3 sm:mt-2 sm:gap-2 sm:pt-2">
                    <Link
                      href={`/study?context=${encodeURIComponent(m.quizLinkQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-400/45 bg-gradient-to-b from-emerald-600/25 to-emerald-950/50 px-4 py-3.5 text-center font-pixel text-base font-bold uppercase tracking-wide text-emerald-50 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-300/20 transition hover:border-emerald-300/80 hover:from-emerald-500/35 hover:to-emerald-900/55 hover:text-white hover:shadow-emerald-900/50 active:scale-[0.98] sm:min-h-0 sm:py-3 sm:text-sm"
                      onClick={() => setOpen(false)}
                    >
                      <span
                        className="text-lg leading-none text-emerald-300 sm:text-base"
                        aria-hidden
                      >
                        ▶
                      </span>
                      Quiz → Study
                    </Link>
                    <Link
                      href={`/flashcards?context=${encodeURIComponent(m.quizLinkQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl border-2 border-sky-400/45 bg-gradient-to-b from-sky-600/25 to-sky-950/50 px-4 py-3.5 text-center font-pixel text-base font-bold uppercase tracking-wide text-sky-50 shadow-md shadow-sky-950/40 ring-1 ring-sky-300/20 transition hover:border-sky-300/80 hover:from-sky-500/35 hover:to-sky-900/55 hover:text-white hover:shadow-sky-900/50 active:scale-[0.98] sm:min-h-0 sm:py-3 sm:text-sm"
                      onClick={() => setOpen(false)}
                    >
                      <span
                        className="text-lg leading-none text-sky-300 sm:text-base"
                        aria-hidden
                      >
                        ◆
                      </span>
                      Flashcards →
                    </Link>
                  </div>
                )}
            </div>
          ))}
          <div ref={endRef} className="h-px shrink-0" aria-hidden />
          {busy && (
            <p className="py-0.5 text-[10px] text-emerald-200/85 sm:text-xs">
              Analyzing…
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <input
            aria-label="Ask the assistant"
            placeholder="Event brief, Dex question…"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#111822] px-3 py-3 text-base outline-none ring-emerald-400/35 placeholder:text-slate-600 focus:border-emerald-400/65 focus:ring-1 sm:min-h-0 sm:py-2 sm:text-sm"
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
            className="min-h-11 shrink-0 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-35 sm:min-h-0 sm:px-3 sm:py-2 sm:text-sm"
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

      <button
        type="button"
        aria-expanded={open}
        aria-controls="dex-prep-drawer"
        aria-label={
          open ? "Close event prep assistant" : "Open event prep assistant"
        }
        title={open ? "Close event prep assistant" : "Open event prep assistant"}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-[max(1rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))] right-[max(1rem,calc(0.5rem+env(safe-area-inset-right,0px)))] z-[70] flex size-14 touch-manipulation items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 text-white shadow-2xl shadow-emerald-950/50 ring-2 ring-emerald-300/50 transition hover:scale-105 hover:ring-emerald-200/60 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/45 active:scale-95 sm:bottom-10 sm:right-10"
      >
        {open ? (
          <span className="text-xl font-light leading-none" aria-hidden>
            ✕
          </span>
        ) : (
          <AgentBubbleIcon className="size-7 text-white drop-shadow-sm" />
        )}
      </button>
    </>
  );
}
