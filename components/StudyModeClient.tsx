"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Contact } from "@/lib/types";
import { avatarColorClass, initials, tagCss } from "@/lib/format";

type Props = {
  initialContext?: string;
};

type QuizPayload = {
  hiddenField?: string;
  movesetIndex?: number;
  display: Contact;
  answer: string;
  id: string;
  choices?: string[];
};

function guessMatches(guess: string, answer: string): boolean {
  const g = guess.toLowerCase().trim();
  const a = answer.toLowerCase().trim();
  if (!g.length) return false;
  return (
    g === a ||
    a.includes(g) ||
    g.includes(a) ||
    a.replace(/\s+/g, "").includes(g.replace(/\s+/g, ""))
  );
}

function choiceEquals(selected: string | null, answer: string): boolean {
  if (selected == null || !selected.trim()) return false;
  return selected.trim().toLowerCase() === answer.trim().toLowerCase();
}

function isMultipleChoice(round: QuizPayload | null): boolean {
  return !!round && round.choices?.length === 4;
}

export default function StudyModeClient({ initialContext }: Props) {
  const [prepContext, setPrepContext] = useState(initialContext ?? "");
  const prepContextRef = useRef(prepContext);
  prepContextRef.current = prepContext;

  const [round, setRound] = useState<QuizPayload | null>(null);
  const [guess, setGuess] = useState("");
  const [selection, setSelection] = useState<string | null>(null);
  const [result, setResult] = useState<"idle" | "correct" | "wrong">("idle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Typing edits the textarea without refetching; Next / Reload read the latest ref. */
  useEffect(() => {
    setPrepContext(initialContext ?? "");
  }, [initialContext]);

  const contextual = prepContext.trim().length > 0;

  const load = useCallback(async () => {
    setLoading(true);
    setGuess("");
    setSelection(null);
    setResult("idle");
    setError(null);
    const brief = prepContextRef.current.trim();
    try {
      if (!brief) {
        const res = await fetch("/api/quiz/random");
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          const msg =
            (j as { error?: string }).error ?? "Nothing to quiz yet.";
          setError(msg);
          setRound(null);
          return;
        }
        setRound((await res.json()) as QuizPayload);
        return;
      }

      const res = await fetch("/api/quiz/contextual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: brief, limit: 12 }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg =
          (j as { error?: string }).error ??
          "Couldn't build contextual quiz.";
        setError(msg);
        setRound(null);
        return;
      }
      setRound((await res.json()) as QuizPayload);
    } catch {
      setError("Network error loading quiz.");
      setRound(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [initialContext, load]);

  const reveal = () => {
    if (!round) return;
    const mc = isMultipleChoice(round);
    const correct = mc
      ? choiceEquals(selection, round.answer)
      : guessMatches(guess, round.answer);
    setResult(correct ? "correct" : "wrong");
  };

  const c = round?.display;
  const choiceList = round?.choices;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex text-sm text-slate-400 transition hover:text-white"
        >
          ← Gallery
        </Link>
      </div>

      <h1 className="mb-6 text-center text-3xl font-bold text-white">
        Study Mode
      </h1>
      <p className="mb-6 text-center text-slate-400">
        One field is concealed per round. Reinforce recall before stepping into an
        event room.
      </p>

      <div className="mb-10 rounded-2xl border border-slate-700 bg-[#161d2788] px-5 py-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Event brief (optional)
        </label>
        <textarea
          rows={2}
          aria-label="Context for contextual quiz — leave empty for Dex-wide shuffle"
          placeholder="Robotics Week, judges, ROS…"
          value={prepContext}
          onChange={(e) => setPrepContext(e.target.value)}
          className="w-full resize-none rounded-xl border border-slate-700 bg-[#121820] px-3 py-2 text-sm text-slate-100 outline-none ring-emerald-500/35 focus:border-emerald-400/55 focus:ring-2"
        />
        <p className="mt-2 text-xs text-slate-500">
          {contextual ? (
            <span className="text-emerald-200/95">
              With a brief, cards are ranked for relevance to your event, then
              shuffled from that shortlist.
            </span>
          ) : (
            <span>
              Leave the brief blank to draw from anyone in your Dex at random.
            </span>
          )}
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="mt-4 rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:bg-slate-700/65 disabled:opacity-40"
        >
          Reload first card
        </button>
      </div>

      {loading && (
        <p className="text-center text-slate-400">Drawing a flashcard…</p>
      )}

      {error && !loading && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-950/35 p-6 text-center text-amber-100">
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-4 rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-50"
          >
            Retry
          </button>
        </p>
      )}

      {!loading && c && round && (
        <div className="rounded-3xl border border-slate-700 bg-[#1a222c]/95 p-8 shadow-xl">
          <div className="mb-8 flex gap-6">
            {c.avatar && c.name !== "???" ? (
              <img
                src={c.avatar}
                alt=""
                className="size-20 shrink-0 rounded-full object-cover ring-2 ring-slate-600/70"
              />
            ) : (
              <div
                className={`flex size-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white ${avatarColorClass(c.tags[0])}`}
              >
                {c.name === "???" ? "?" : initials(c.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-mono text-xs text-blue-400/90">#{c.id}</p>
              <h2 className="text-2xl font-semibold">
                <span className="text-white">
                  {c.name === "???" ? "???" : c.name}
                </span>
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {c.tags.map((t) => (
                  <span
                    key={t}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tagCss(t)}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="mb-8 leading-relaxed text-slate-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Bio
              <br />
            </span>
            {c.bio}
          </p>

          <div className="mb-10">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Moveset
            </p>
            <ul className="space-y-2">
              {c.moveset.map((m, i) => (
                <li
                  key={`${m}-${i}`}
                  className="rounded-lg border border-slate-700 bg-black/20 px-3 py-2 text-sm font-medium text-emerald-100/90"
                >
                  {m}
                </li>
              ))}
            </ul>
          </div>

          <label className="mb-6 block">
            <span className="text-sm font-medium text-slate-300">
              {isMultipleChoice(round) ? (
                <>
                  Pick the concealed{" "}
                  <span className="text-emerald-200/90">
                    {round.hiddenField === "moveset" ? "moveset line" : "bio"}
                  </span>
                </>
              ) : (
                <>
                  Your guess (
                  {(round.hiddenField as string | undefined) ?? "?"} concealed)
                </>
              )}
            </span>
            {isMultipleChoice(round) && choiceList ? (
              <div
                className="mt-3 space-y-2"
                role="radiogroup"
                aria-label="Multiple choice answers"
              >
                {choiceList.map((opt, idx) => {
                  const picked = selection === opt;
                  return (
                    <button
                      key={`${idx}-${opt.slice(0, 24)}`}
                      type="button"
                      role="radio"
                      aria-checked={picked}
                      disabled={result !== "idle"}
                      onClick={() => setSelection(opt)}
                      className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                        picked
                          ? "border-emerald-500/70 bg-emerald-950/40 text-white ring-2 ring-emerald-500/40"
                          : "border-slate-600 bg-[#121820] text-slate-200 hover:border-slate-500"
                      } disabled:opacity-60`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                className="mt-2 w-full rounded-xl border border-slate-600 bg-[#121820] px-4 py-3 text-white outline-none ring-emerald-500/30 focus:ring-2"
                placeholder="Who is this? What's the hidden fact?"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") reveal();
                }}
              />
            )}
          </label>

          {result !== "idle" && (
            <div
              className={
                result === "correct"
                  ? "mb-6 rounded-xl border border-emerald-500/50 bg-emerald-950/50 p-4 text-emerald-100"
                  : "mb-6 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-rose-100"
              }
            >
              <p className="font-semibold">
                {result === "correct" ? "✓ Nice recall!" : "✗ Not quite"}
              </p>
              <p className="mt-2 text-sm opacity-95">
                Answer:{" "}
                <span className="font-semibold">{round.answer}</span>
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reveal}
              disabled={
                result !== "idle" ||
                (isMultipleChoice(round) ? selection == null : !guess.trim())
              }
              className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white disabled:opacity-40"
            >
              Check
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-slate-600 bg-slate-800/70 px-5 py-2.5 font-medium text-slate-100"
            >
              Next card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
