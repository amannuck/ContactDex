"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Contact } from "@/lib/types";
import { avatarColorClass, initials, stageLabel, tagCss } from "@/lib/format";
import LogInteractionModal from "@/components/LogInteractionModal";

type Props = { contact: Contact };

const STAGES = ["Met", "Talked", "Collaborated", "Close"] as const;

function sortInteractionsNewestFirst(c: Contact) {
  return [...c.interactions].sort((a, b) => {
    const ta = Date.parse(a.date);
    const tb = Date.parse(b.date);
    return tb - ta;
  });
}

export default function ContactDetailClient({ contact: initial }: Props) {
  const [contact, setContact] = useState<Contact>(initial);
  const [flash, setFlash] = useState<string | null>(null);
  const lastStageRef = useRef(initial.stage);

  useEffect(() => {
    lastStageRef.current = initial.stage;
    setContact(initial);
  }, [
    initial.id,
    initial.stage,
    initial.name,
    initial.bio,
    initial.avatar,
    initial.interactions.length,
    initial.tags.join(","),
    initial.moveset.join(","),
  ]);

  const reload = useCallback(async () => {
    const prev = lastStageRef.current;
    const res = await fetch(`/api/contacts/${initial.id}`);
    if (!res.ok) return;
    const next = (await res.json()) as Contact;
    setContact(next);
    if (next.stage > prev) {
      setFlash(`Evolved to ${stageLabel(next.stage)}!`);
      window.setTimeout(() => setFlash(null), 3800);
    }
    lastStageRef.current = next.stage;
  }, [initial.id]);

  const interactions = sortInteractionsNewestFirst(contact);

  const fillRatio = Math.min(contact.stage + 1, 4) / 4;

  return (
    <div>
      <div className="overflow-hidden rounded-3xl border border-slate-700/80 bg-gradient-to-br from-[#1a222c] to-[#151b24] shadow-2xl shadow-black/30">
        <div className="relative border-b border-slate-700/60 bg-black/25 px-8 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-6">
              {contact.avatar ? (
                <img
                  src={contact.avatar}
                  alt=""
                  className="size-24 shrink-0 rounded-full object-cover shadow-inner ring-2 ring-slate-600/70"
                />
              ) : (
                <div
                  className={`flex size-24 shrink-0 items-center justify-center rounded-full text-3xl font-bold text-white shadow-inner ${avatarColorClass(contact.tags[0])}`}
                >
                  {initials(contact.name)}
                </div>
              )}
              <div className="min-w-0">
                <span className="font-mono text-sm text-blue-400/90">
                  #{contact.id}
                </span>
                <h1 className="truncate text-3xl font-bold text-white">
                  {contact.name}
                </h1>
                <p className="mt-2 flex flex-wrap gap-2">
                  {contact.tags.map((t) => (
                    <span
                      key={t}
                      className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${tagCss(t)}`}
                    >
                      {t}
                    </span>
                  ))}
                </p>
              </div>
            </div>
            <LogInteractionModal contactId={contact.id} onLogged={reload} />
          </div>

          <div className="mt-8">
            <p className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Evolution path</span>
              <span className="normal-case text-emerald-300">
                {stageLabel(contact.stage)}
              </span>
            </p>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                style={{ width: `${fillRatio * 100}%` }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-blue-600 transition-[width] duration-700 ease-out"
              />
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] text-slate-500 sm:text-xs">
              {STAGES.map((label, idx) => (
                <span
                  key={label}
                  className={
                    idx <= contact.stage
                      ? "text-center font-medium text-emerald-300"
                      : "text-center"
                  }
                >
                  {label}
                </span>
              ))}
            </div>
            {flash && (
              <p className="mt-3 animate-pulse text-sm font-medium text-emerald-300">
                {flash}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-8 px-8 py-8">
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Bio & context
            </h2>
            <p className="leading-relaxed text-slate-200">{contact.bio}</p>
          </section>

          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Moveset
            </h2>
            <ul className="space-y-2">
              {(contact.moveset.length ? contact.moveset : ["No moves logged yet"]).map(
                (m, i) => (
                  <li
                    key={`${m}-${i}`}
                    className="rounded-xl border border-slate-700/60 bg-black/25 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/40"
                  >
                    {m}
                  </li>
                ),
              )}
            </ul>
          </section>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="mb-6 text-xl font-semibold text-white">
          Interaction log
        </h2>
        {interactions.length === 0 ? (
          <p className="text-slate-500">No touches yet.</p>
        ) : (
          <ol className="space-y-4">
            {interactions.map((i, idx) => (
              <li
                key={`${i.date}-${idx}`}
                className="border-l-2 border-blue-500/50 pl-4"
              >
                <span className="font-mono text-xs text-slate-500">
                  {i.date}
                </span>
                <p className="mt-1 text-slate-200">{i.note}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
