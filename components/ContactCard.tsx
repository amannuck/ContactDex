import Link from "next/link";
import type { Contact } from "@/lib/types";
import { avatarColorClass, initials, tagCss } from "@/lib/format";

type Props = { contact: Contact };

export default function ContactCard({ contact }: Props) {
  const primaryTag = contact.tags[0];
  const bg = avatarColorClass(primaryTag);
  const stageDots = 4;

  return (
    <Link
      href={`/contact/${contact.id}`}
      className="group flex flex-col rounded-2xl border border-slate-700/70 bg-[#1a222c]/90 p-5 shadow-lg shadow-black/20 transition hover:border-blue-400/35 hover:shadow-xl"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={`flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-inner ${bg}`}
        >
          {initials(contact.name)}
        </div>
        <span className="font-mono text-sm text-slate-400 transition group-hover:text-slate-200">
          #{contact.id}
        </span>
      </div>

      <h2 className="mb-3 line-clamp-2 font-semibold text-white">
        {contact.name}
      </h2>

      <div className="mb-4 flex flex-wrap gap-2">
        {contact.tags.slice(0, 4).map((t) => (
          <span
            key={t}
            className={`rounded-full px-3 py-0.5 text-xs font-medium ring-1 ring-inset ${tagCss(t)}`}
          >
            {t}
          </span>
        ))}
        {contact.tags.length > 4 && (
          <span className="text-xs text-slate-400">
            +{contact.tags.length - 4}
          </span>
        )}
      </div>

      <div className="mt-auto flex gap-1.5 pt-2">
        {Array.from({ length: stageDots }).map((_, i) => (
          <span
            key={`dot-${contact.id}-${i}`}
            className={
              i <= contact.stage
                ? "text-lg text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.45)]"
                : "text-lg text-slate-600"
            }
          >
            ●
          </span>
        ))}
      </div>
    </Link>
  );
}
