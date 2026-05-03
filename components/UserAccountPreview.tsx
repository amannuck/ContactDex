/**
 * Static shell account — visuals only (no auth).
 */
export default function UserAccountPreview() {
  return (
    <div
      className="flex items-center gap-2 rounded-2xl border border-slate-600/55 bg-[#121820]/90 py-1.5 pl-1.5 pr-2 sm:gap-3 sm:py-2 sm:pl-2 sm:pr-4"
      aria-label="Signed in"
    >
      <img
        src="https://api.dicebear.com/9.x/avataaars/png?seed=JohnDoe&size=96"
        alt=""
        width={36}
        height={36}
        className="size-8 shrink-0 rounded-full ring-2 ring-slate-500/40 sm:size-9"
      />
      <div className="hidden min-w-0 flex-1 text-left leading-tight sm:block">
        <p className="truncate text-sm font-semibold text-white">
          John Doe
        </p>
        <p className="truncate text-xs text-slate-400">john.doe@dex.local</p>
      </div>
      <span className="hidden rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/95 md:inline">
        Live
      </span>
    </div>
  );
}

