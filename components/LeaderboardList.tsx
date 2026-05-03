import Link from "next/link";
import type { Contact } from "@/lib/types";
import { avatarColorClass, initials, stageLabel, tagCss } from "@/lib/format";

type Props = { contacts: Contact[] };

function rankAccent(rank: number): string {
  if (rank === 1)
    return "border-amber-500/50 bg-gradient-to-r from-amber-950/40 to-[#1a222c]/90 text-amber-100 ring-1 ring-amber-400/25";
  if (rank === 2)
    return "border-slate-400/40 bg-[#1a222c]/95 text-slate-100 ring-1 ring-slate-400/20";
  if (rank === 3)
    return "border-orange-700/45 bg-gradient-to-r from-orange-950/35 to-[#1a222c]/90 text-orange-100/95 ring-1 ring-orange-600/25";
  return "border-slate-700/70 bg-[#1a222c]/80 text-slate-200";
}

export default function LeaderboardList({ contacts }: Props) {
  if (contacts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/40 p-16 text-center text-slate-400">
        No connections in your Dex yet — add some from the gallery.
      </p>
    );
  }

  return (
    <ol className="space-y-3 font-pixel">
      {contacts.map((c, index) => {
        const rank = index + 1;
        const accent = rankAccent(rank);
        const fillRatio = Math.min(c.stage + 1, 4) / 4;
        return (
          <li key={c.id}>
            <Link
              href={`/contact/${c.id}`}
              className={`flex flex-col gap-4 rounded-2xl border p-4 shadow-lg shadow-black/15 transition hover:border-blue-400/40 hover:shadow-xl sm:flex-row sm:items-center sm:gap-6 ${accent}`}
            >
              <div className="flex shrink-0 items-center gap-4 sm:w-48">
                <span
                  className="flex size-11 items-center justify-center rounded-xl bg-black/30 font-pixel-display text-xs font-normal tabular-nums text-white/90 sm:text-sm"
                  aria-label={`Rank ${rank}`}
                >
                  #{rank}
                </span>
                {c.avatar ? (
                  <img
                    src={c.avatar}
                    alt=""
                    className="size-14 shrink-0 rounded-full object-cover ring-2 ring-slate-600/70"
                  />
                ) : (
                  <div
                    className={`flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${avatarColorClass(c.tags[0])}`}
                  >
                    {initials(c.name)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-pixel-display text-xs text-blue-400/85">
                    #{c.id}
                  </span>
                  <h2 className="font-pixel-display text-sm font-normal text-white sm:text-base">
                    {c.name}
                  </h2>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {c.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset sm:text-xs ${tagCss(t)}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-full shrink-0 sm:w-52">
                <p className="mb-1.5 flex justify-between text-[9px] font-normal uppercase tracking-wider text-slate-400 font-pixel-display sm:text-[10px]">
                  <span>Evolution path</span>
                  <span className="normal-case text-emerald-300">
                    {stageLabel(c.stage)}
                  </span>
                </p>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/90">
                  <div
                    style={{ width: `${fillRatio * 100}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-blue-600"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {c.interactions.length} interaction
                  {c.interactions.length === 1 ? "" : "s"} logged
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
