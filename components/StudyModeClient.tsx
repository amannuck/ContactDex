"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Contact } from "@/lib/types";
import { avatarColorClass, initials, tagCss } from "@/lib/format";

type QuizPayload = {
  hiddenField?: string;
  display: Contact;
  answer: string;
  id: string;
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

export default function StudyModeClient() {
  const [round, setRound] = useState<QuizPayload | null>(null);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<"idle" | "correct" | "wrong">("idle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setGuess("");
    setResult("idle");
    setError(null);
    try {
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
    } catch {
      setError("Network error loading quiz.");
      setRound(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reveal = () => {
    if (!round) return;
    setResult(guessMatches(guess, round.answer) ? "correct" : "wrong");
  };

  const c = round?.display;

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
      <p className="mb-10 text-center text-slate-400">
        One field is concealed. Guess based on clues — reinforcing real memory!
      </p>

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
            <div
              className={`flex size-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white ${avatarColorClass(c.tags[0])}`}
            >
              {c.name === "???" ? "?" : initials(c.name)}
            </div>
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
              Your guess ({round.hiddenField} hidden above)
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-600 bg-[#121820] px-4 py-3 text-white outline-none ring-emerald-500/30 focus:ring-2"
              placeholder="Who is this? What's the missing fact?"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") reveal();
              }}
            />
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
                Answer: <span className="font-semibold">{round.answer}</span>
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reveal}
              disabled={!guess.trim() || result !== "idle"}
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
