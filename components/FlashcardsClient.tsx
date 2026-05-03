"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Contact } from "@/lib/types";
import { avatarColorClass, stageLabel, tagCss } from "@/lib/format";

type Props = { initialContext?: string };

type DeckResponse =
  | { mode: "event"; brief: string; contacts: Contact[] }
  | { mode: "dex"; contacts: Contact[] };

const SWIPE_PX = 48;

const CARD_SHELL =
  "mx-auto h-[min(66dvh,31.25rem)] w-[min(17.5rem,88vw)] overflow-visible";

/** Portrait flashcard frame — tall study cards, optional event filter via URL only. */
export default function FlashcardsClient({ initialContext }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deck, setDeck] = useState<Contact[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [slideVisual, setSlideVisual] = useState<
    "idle" | "exit-next" | "exit-prev"
  >("idle");
  const [enterSeq, setEnterSeq] = useState(0);
  const [enterDir, setEnterDir] = useState<"next" | "prev">("next");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const ptrDown = useRef<{ x: number; y: number } | null>(null);
  /** Tap flips in pointerup (reliable on touch); next click is skipped to avoid double-toggle. */
  const skipNextClickFlip = useRef(false);
  const animatingNavRef = useRef(false);
  const slideVisualRef = useRef<"idle" | "exit-next" | "exit-prev">("idle");

  useEffect(() => {
    slideVisualRef.current = slideVisual;
  }, [slideVisual]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const loadDeck = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    setFlipped(false);
    setIndex(0);
    setSlideVisual("idle");
    setEnterSeq(0);
    animatingNavRef.current = false;
    try {
      const res = await fetch("/api/flashcards/deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          limit: query.trim() ? 24 : 22,
        }),
      });
      const data = (await res.json()) as DeckResponse | { error?: string };
      if (!res.ok || !("contacts" in data)) {
        setDeck([]);
        setError((data as { error?: string }).error ?? "Could not load deck.");
        return;
      }
      setDeck(data.contacts);
    } catch {
      setError("Network error.");
      setDeck([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDeck(initialContext ?? "");
  }, [initialContext, loadDeck]);

  const current = deck[index] ?? null;
  const total = deck.length;

  const goNext = useCallback(() => {
    if (total === 0) return;
    if (prefersReducedMotion) {
      setFlipped(false);
      setIndex((i) => (i + 1) % total);
      return;
    }
    if (animatingNavRef.current) return;
    animatingNavRef.current = true;
    setFlipped(false);
    setSlideVisual("exit-next");
  }, [total, prefersReducedMotion]);

  const goPrev = useCallback(() => {
    if (total === 0) return;
    if (prefersReducedMotion) {
      setFlipped(false);
      setIndex((i) => (i - 1 + total) % total);
      return;
    }
    if (animatingNavRef.current) return;
    animatingNavRef.current = true;
    setFlipped(false);
    setSlideVisual("exit-prev");
  }, [total, prefersReducedMotion]);

  const handleTopCardTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.propertyName !== "transform") return;
      const sv = slideVisualRef.current;
      if (sv === "idle") return;

      const kind = sv === "exit-next" ? "next" : "prev";
      setEnterDir(kind);
      if (kind === "next") setIndex((i) => (i + 1) % total);
      else setIndex((i) => (i - 1 + total) % total);
      setSlideVisual("idle");
      setEnterSeq((s) => s + 1);
      animatingNavRef.current = false;
    },
    [total],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current || loading) return;
      if (animatingNavRef.current && !prefersReducedMotion) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, loading, goNext, goPrev, prefersReducedMotion]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    ptrDown.current = { x: e.clientX, y: e.clientY };
    skipNextClickFlip.current = false;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!ptrDown.current) return;
    const start = ptrDown.current;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    ptrDown.current = null;

    const isSwipe =
      Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) + 12;

    if (isSwipe) {
      if (animatingNavRef.current && !prefersReducedMotion) return;
      skipNextClickFlip.current = true;
      if (dx < 0) goNext();
      else goPrev();
      return;
    }

    const target = e.target as HTMLElement | null;
    if (target?.closest("a")) return;

    skipNextClickFlip.current = true;
    setFlipped((f) => !f);
  };

  const onPointerCancel = () => {
    ptrDown.current = null;
  };

  const onCardClick = () => {
    if (skipNextClickFlip.current) {
      skipNextClickFlip.current = false;
      return;
    }
    setFlipped((f) => !f);
  };

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="mb-4 flex min-h-11 shrink-0 items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center px-1 text-sm text-slate-400 transition hover:text-white sm:min-h-0 sm:px-0"
        >
          ← Gallery
        </Link>
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadDeck(initialContext ?? "")}
          className="min-h-11 shrink-0 rounded-lg px-2 py-2 text-sm text-slate-400 underline decoration-slate-600 underline-offset-2 transition hover:bg-white/5 hover:text-emerald-300 disabled:opacity-40 sm:min-h-0 sm:py-0"
        >
          New deck
        </button>
      </div>

      <h1 className="mb-1 shrink-0 text-center font-pixel-display text-2xl font-normal text-white sm:text-3xl md:text-4xl">
        Dex flashcards
      </h1>
      <p className="mb-4 shrink-0 px-2 text-center text-xs text-slate-500 sm:text-sm">
        Portrait cards · tap to flip · swipe ← next · → prev
      </p>

      {loading && (
        <p className="grow text-center text-slate-400">Shuffling deck…</p>
      )}

      {error && !loading && (
        <p className="grow rounded-xl border border-amber-500/40 bg-amber-950/35 p-4 text-center text-sm text-amber-100">
          {error}
          {initialContext ? (
            <>
              {" "}
              <Link href="/flashcards" className="text-emerald-300 underline">
                Open unfiltered deck
              </Link>
            </>
          ) : null}
        </p>
      )}

      {!loading && current && (
        <div className="flex grow flex-col items-center justify-center gap-3 overflow-visible pb-6">
          <p className="text-center text-[13px] text-slate-500">
            <span className="font-mono text-slate-400">{index + 1}</span> /{" "}
            {total}
          </p>

          <div
            className="touch-pan-y overflow-visible px-2 pb-10 pt-1 sm:px-4"
            style={{ perspective: "1200px" }}
          >
            <div className={`relative ${CARD_SHELL}`}>
              {/*
                Fanned deck behind the top card (reference: slight alternating
                rotations around center + soft shadows so edges peek out).
              */}
              <div
                className="pointer-events-none absolute inset-0 z-0"
                aria-hidden
              >
                <div
                  className="absolute inset-0 z-[1] rounded-3xl border border-emerald-950/30 bg-gradient-to-b from-[#1a2a24] to-[#0d1612] shadow-[0_22px_44px_-14px_rgba(0,0,0,0.88),0_6px_16px_-4px_rgba(0,0,0,0.5)]"
                  style={{
                    transform:
                      "translate(8px, 18px) rotate(-4.5deg) scale(0.9)",
                    transformOrigin: "center center",
                  }}
                />
                <div
                  className="absolute inset-0 z-[2] rounded-3xl border border-emerald-900/30 bg-gradient-to-b from-[#1d2f28] to-[#101a16] shadow-[0_18px_36px_-12px_rgba(0,0,0,0.78),0_5px_14px_-4px_rgba(0,0,0,0.45)]"
                  style={{
                    transform:
                      "translate(-5px, 10px) rotate(3.5deg) scale(0.945)",
                    transformOrigin: "center center",
                  }}
                />
                <div
                  className="absolute inset-0 z-[3] rounded-3xl border border-emerald-800/35 bg-gradient-to-b from-[#22342d] to-[#131e1a] shadow-[0_14px_30px_-10px_rgba(0,0,0,0.68),0_4px_12px_-3px_rgba(0,0,0,0.4)]"
                  style={{
                    transform:
                      "translate(3px, 5px) rotate(-2deg) scale(0.98)",
                    transformOrigin: "center center",
                  }}
                />
              </div>

              <div
                role="button"
                tabIndex={0}
                className={[
                  "relative z-10 h-full w-full",
                  "cursor-pointer select-none rounded-3xl shadow-2xl shadow-black/60 outline-none ring-1 ring-slate-600/40 ring-offset-2 ring-offset-[#0f1419] focus-visible:ring-emerald-500/50",
                  "transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
                  slideVisual === "exit-next" &&
                    "-translate-x-[120%] scale-95 opacity-0",
                  slideVisual === "exit-prev" &&
                    "translate-x-[120%] scale-95 opacity-0",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ touchAction: "manipulation" }}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onTransitionEnd={handleTopCardTransitionEnd}
                onClick={onCardClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFlipped((f) => !f);
                  }
                }}
                aria-label={
                  flipped
                    ? "Card back — facts. Activate to flip."
                    : "Card front. Activate to reveal."
                }
              >
                <div
                  key={`${current.id}-${enterSeq}`}
                  className={[
                    "relative h-full w-full",
                    enterSeq > 0
                      ? enterDir === "next"
                        ? "animate-flashcard-in-next"
                        : "animate-flashcard-in-prev"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div
                    className="relative h-full w-full"
                    style={{
                      transformStyle: "preserve-3d",
                      transition:
                        "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
                      transform: flipped
                        ? "rotateY(180deg)"
                        : "rotateY(0deg)",
                    }}
                  >
                {/* Front */}
                <div
                  className="absolute inset-0 flex flex-col items-center rounded-3xl border-2 border-emerald-800/45 bg-gradient-to-b from-[#25332d] via-[#1c2a24] to-[#151f1b] px-4 pt-6 pb-4 shadow-inner"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                >
                  <p className="font-pixel-display text-sm uppercase tracking-[0.22em] text-slate-500">
                    Study
                  </p>
                  <p className="mt-1.5 font-mono text-sm text-blue-400/90">
                    #{current.id}
                  </p>
                  <div className="mt-4 flex shrink-0">
                    {current.avatar ? (
                      <img
                        src={current.avatar}
                        alt=""
                        draggable={false}
                        className="size-40 rounded-3xl object-cover ring-2 ring-slate-600/90 shadow-lg sm:size-44"
                      />
                    ) : (
                      <div
                        className={`flex size-40 items-center justify-center rounded-3xl text-6xl font-bold text-white/90 shadow-inner ring-2 ring-slate-600/90 sm:size-44 sm:text-7xl ${avatarColorClass(current.tags[0])}`}
                      >
                        ?
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex max-h-[26%] flex-wrap content-start justify-center gap-2 overflow-y-auto">
                    {current.tags.map((t) => (
                      <span
                        key={t}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset sm:text-xs ${tagCss(t)}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="mt-auto pt-2 text-center text-xs leading-snug text-slate-500">
                    Recall the name · tap anywhere to reveal
                  </p>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 flex flex-col overflow-hidden rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-b from-[#182820] via-[#14231c] to-[#0e1a14] shadow-inner"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div className="shrink-0 border-b border-emerald-500/25 px-4 py-2 text-center">
                    <p className="font-pixel-display text-sm uppercase tracking-[0.18em] text-emerald-300/90">
                      Answer
                    </p>
                  </div>
                  <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 [overflow-wrap:anywhere]">
                    <p className="font-mono text-xs text-blue-400/90">
                      #{current.id}
                    </p>
                    <h2 className="mt-1 break-words font-pixel-display text-xl font-normal leading-snug text-white sm:text-2xl">
                      {current.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 uppercase tracking-wide">
                      {stageLabel(current.stage)}
                    </p>
                    <p className="mt-3 break-words text-sm leading-relaxed text-slate-200 sm:text-base">
                      {current.bio}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-emerald-100/95 sm:text-base">
                      {current.moveset.map((m, i) => (
                        <li key={`${m}-${i}`} className="flex min-w-0 gap-2">
                          <span className="shrink-0 text-emerald-500/90">▸</span>
                          <span className="min-w-0 break-words">{m}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/contact/${current.id}`}
                      className="mt-4 inline-block max-w-full break-words text-sm font-semibold text-emerald-300 underline decoration-emerald-500/50 underline-offset-2 hover:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Full Dex entry →
                    </Link>
                  </div>
                </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
