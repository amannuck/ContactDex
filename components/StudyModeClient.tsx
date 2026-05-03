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

type AnswerResult = "idle" | "correct" | "partial" | "wrong";

type Scoreboard = {
  correct: number;
  partial: number;
  wrong: number;
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  return dp[m]![n]!;
}

function similarityRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
}

/**
 * Fill-in-the-blank: strict “correct”, loose “partial”, else wrong.
 * Multiple choice continues to use exact match only.
 */
function evaluateFillInBlank(
  guess: string,
  answer: string,
): "correct" | "partial" | "wrong" {
  const g = guess.trim();
  const a = answer.trim();
  if (!g) return "wrong";

  const gl = g.toLowerCase();
  const al = a.toLowerCase();

  if (gl === al) return "correct";
  const gNoSpace = gl.replace(/\s+/g, "");
  const aNoSpace = al.replace(/\s+/g, "");
  if (gNoSpace === aNoSpace) return "correct";

  const sim = similarityRatio(gl, al);
  if (sim >= 0.88) return "correct";

  const gWords = gl.split(/\s+/).filter((w) => w.length > 1);
  const aWords = al.split(/\s+/).filter((w) => w.length > 1);
  if (aWords.length > 0) {
    const aSet = new Set(aWords);
    const hits = gWords.filter((w) => aSet.has(w)).length;
    const coverage = hits / aWords.length;
    if (coverage >= 0.72 && sim >= 0.52) return "correct";
    if (coverage >= 0.38 && (hits > 0 || sim >= 0.4)) return "partial";
  } else if (al.length > 0) {
    if (al.includes(gl) && gl.length >= Math.min(4, al.length * 0.55))
      return "partial";
  }

  if (sim >= 0.45) return "partial";

  if (gl.length >= 3 && al.includes(gl) && gl.length >= al.length * 0.22)
    return "partial";
  if (al.length >= 3 && gl.includes(al)) return "partial";

  return "wrong";
}

function choiceEquals(selected: string | null, answer: string): boolean {
  if (selected == null || !selected.trim()) return false;
  return selected.trim().toLowerCase() === answer.trim().toLowerCase();
}

function isMultipleChoice(round: QuizPayload | null): boolean {
  return !!round && round.choices?.length === 4;
}

const DEFAULT_QUIZ_SIZE = 5;

export default function StudyModeClient({ initialContext }: Props) {
  const [prepContext, setPrepContext] = useState(initialContext ?? "");
  const prepContextRef = useRef(prepContext);
  prepContextRef.current = prepContext;

  const [round, setRound] = useState<QuizPayload | null>(null);
  const [guess, setGuess] = useState("");
  const [selection, setSelection] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult>("idle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizSize, setQuizSize] = useState(DEFAULT_QUIZ_SIZE);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [quizPhase, setQuizPhase] = useState<"active" | "complete">("active");
  const [scoreboard, setScoreboard] = useState<Scoreboard>({
    correct: 0,
    partial: 0,
    wrong: 0,
  });

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

  const resetSessionAndLoad = useCallback(async () => {
    setQuestionIndex(0);
    setScoreboard({ correct: 0, partial: 0, wrong: 0 });
    setQuizPhase("active");
    await load();
  }, [load]);

  const handleNextCard = useCallback(async () => {
    if (quizPhase !== "active" || result === "idle") return;
    if (questionIndex >= quizSize - 1) {
      setQuizPhase("complete");
      return;
    }
    setQuestionIndex((i) => i + 1);
    await load();
  }, [quizPhase, result, questionIndex, quizSize, load]);

  const reveal = () => {
    if (!round) return;
    const mc = isMultipleChoice(round);
    let outcome: "correct" | "partial" | "wrong";
    if (mc) {
      outcome = choiceEquals(selection, round.answer) ? "correct" : "wrong";
    } else {
      outcome = evaluateFillInBlank(guess, round.answer);
    }
    setResult(outcome);
    setScoreboard((s) => ({
      correct: s.correct + (outcome === "correct" ? 1 : 0),
      partial: s.partial + (outcome === "partial" ? 1 : 0),
      wrong: s.wrong + (outcome === "wrong" ? 1 : 0),
    }));
  };

  const roundPoints =
    scoreboard.correct + scoreboard.partial * 0.5;
  const maxPoints = quizSize;
  const pctRounded =
    maxPoints > 0
      ? Math.round((roundPoints / maxPoints) * 1000) / 10
      : 0;

  const canChangeQuizLength =
    quizPhase === "complete" ||
    (questionIndex === 0 && result === "idle" && !loading);

  const c = round?.display;
  const choiceList = round?.choices;

  return (
    <div>
      <div className="mb-8 flex min-h-11 items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm text-slate-400 transition hover:text-white sm:min-h-0"
        >
          ← Gallery
        </Link>
      </div>

      <h1 className="mb-6 text-center font-pixel-display text-2xl font-normal leading-snug text-white sm:text-3xl md:text-4xl">
        Study mode
      </h1>
      <p className="mb-6 text-center text-slate-400">
        One field is concealed per round. Reinforce recall before stepping into an
        event room.
      </p>

      <div className="mb-8 rounded-2xl border border-slate-700 bg-[#161d2788] px-4 py-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wide">
              Quiz length
            </span>
            <select
              value={quizSize}
              disabled={!canChangeQuizLength}
              onChange={(e) => setQuizSize(Number(e.target.value))}
              className="rounded-lg border border-slate-600 bg-[#121820] px-2 py-1.5 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-45"
            >
              {[3, 5, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} cards
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void resetSessionAndLoad()}
            className="rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:bg-slate-700/65 disabled:opacity-40"
          >
            Reload first card
          </button>
        </div>
        {quizPhase === "active" && (
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Question{" "}
            <span className="font-mono text-slate-300">
              {questionIndex + 1}
            </span>{" "}
            of {quizSize}
            {scoreboard.correct + scoreboard.partial + scoreboard.wrong > 0 ? (
              <>
                {" "}
                · running score:{" "}
                <span className="text-emerald-200/90">
                  {roundPoints.toFixed(1)} / {maxPoints}
                </span>{" "}
                pts (1 = correct, ½ = partial on typed answers)
              </>
            ) : null}
          </p>
        )}
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

      {quizPhase === "complete" && !loading && (
        <div className="rounded-2xl border border-emerald-500/35 bg-[#14221a]/95 p-5 shadow-xl sm:rounded-3xl sm:p-8">
          <h2 className="font-pixel-display text-xl font-normal text-white sm:text-2xl">
            Quiz complete
          </h2>
          <p className="mt-2 text-slate-400">
            Here’s how you did across {quizSize} card{quizSize === 1 ? "" : "s"}.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-700 bg-black/25 p-5">
              <p className="font-pixel-display text-sm font-normal uppercase tracking-widest text-slate-500 sm:text-base">
                Score
              </p>
              <p className="mt-1 font-pixel-display text-2xl font-normal tabular-nums text-emerald-200 sm:text-3xl">
                {roundPoints.toFixed(1)}
                <span className="text-base font-normal text-slate-500 sm:text-lg">
                  {" "}
                  / {maxPoints}
                </span>
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {pctRounded}% — full credit on correct answers, half credit on
                partially correct fill-ins
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-black/25 p-5 text-sm text-slate-300">
              <ul className="space-y-2">
                <li>
                  <span className="text-emerald-300">Correct:</span>{" "}
                  {scoreboard.correct}
                </li>
                <li>
                  <span className="text-amber-200">Partially correct:</span>{" "}
                  {scoreboard.partial}
                </li>
                <li>
                  <span className="text-rose-300">Wrong:</span> {scoreboard.wrong}
                </li>
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void resetSessionAndLoad()}
            className="mt-8 rounded-xl bg-emerald-600 px-6 py-3 font-pixel-display text-xs font-normal uppercase tracking-wide text-white transition hover:bg-emerald-500 sm:text-sm"
          >
            Start new quiz
          </button>
        </div>
      )}

      {!loading && quizPhase === "active" && c && round && (
        <div className="rounded-2xl border border-slate-700 bg-[#1a222c]/95 p-4 shadow-xl sm:rounded-3xl sm:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:gap-6">
            {c.avatar && c.name !== "???" ? (
              <img
                src={c.avatar}
                alt=""
                className="size-[4.5rem] shrink-0 rounded-full object-cover ring-2 ring-slate-600/70 sm:size-20"
              />
            ) : (
              <div
                className={`flex size-[4.5rem] shrink-0 items-center justify-center rounded-full text-xl font-bold text-white sm:size-20 sm:text-2xl ${avatarColorClass(c.tags[0])}`}
              >
                {c.name === "???" ? "?" : initials(c.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-mono text-xs text-blue-400/90">#{c.id}</p>
              <h2 className="text-xl font-semibold leading-tight sm:text-2xl">
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
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Bio
              <br />
            </span>
            {c.bio}
          </p>

          <div className="mb-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
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
                  : result === "partial"
                    ? "mb-6 rounded-xl border border-amber-400/50 bg-amber-950/45 p-4 text-amber-50"
                    : "mb-6 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-rose-100"
              }
            >
              <p className="font-semibold">
                {result === "correct"
                  ? "✓ Nice recall!"
                  : result === "partial"
                    ? "◐ Partially correct — close, but not exact."
                    : "✗ Not quite"}
              </p>
              {(result === "partial" || result === "wrong") && (
                <p className="mt-2 text-sm opacity-95">
                  Correct answer:{" "}
                  <span className="font-semibold">{round.answer}</span>
                </p>
              )}
              {result === "correct" && (
                <p className="mt-2 text-sm opacity-95">
                  Answer:{" "}
                  <span className="font-semibold">{round.answer}</span>
                </p>
              )}
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
              onClick={() => void handleNextCard()}
              disabled={result === "idle"}
              className="rounded-xl border border-slate-600 bg-slate-800/70 px-5 py-2.5 font-medium text-slate-100 disabled:opacity-40"
            >
              {questionIndex >= quizSize - 1 ? "Finish quiz" : "Next card"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-slate-700 bg-[#161d2788] px-6 py-6 sm:px-7 sm:py-6">
        <div className="space-y-4">
          <label className="block text-sm font-semibold uppercase tracking-wider text-slate-400">
            Event brief (optional)
          </label>
          <textarea
            rows={3}
            aria-label="Context for contextual quiz — leave empty for Dex-wide shuffle"
            placeholder="Robotics Week, judges, ROS…"
            value={prepContext}
            onChange={(e) => setPrepContext(e.target.value)}
            className="min-h-[5.75rem] w-full resize-y rounded-xl border border-slate-700 bg-[#121820] px-4 py-3.5 text-sm leading-relaxed text-slate-100 outline-none ring-emerald-500/35 placeholder:text-slate-500 focus:border-emerald-400/55 focus:ring-2"
          />
          <p className="text-xs leading-relaxed text-slate-500">
            {contextual ? (
              <span className="text-emerald-200/95">
                With a brief, cards are ranked for relevance to your event, then
                shuffled from that shortlist. Use{" "}
                <span className="font-semibold text-slate-300">
                  Reload first card
                </span>{" "}
                after editing.
              </span>
            ) : (
              <span>
                Leave the brief blank to draw from anyone in your Dex at random.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
