/**
 * Static shell account — visuals only (no auth).
 */
export default function UserAccountPreview() {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-slate-600/55 bg-[#121820]/90 py-2 pl-2 pr-4"
      aria-label="Signed in"
    >
      <img
        src="https://api.dicebear.com/9.x/avataaars/png?seed=ContactDexOwner&size=96"
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-full ring-2 ring-slate-500/40"
      />
      <div className="min-w-0 text-left leading-tight">
        <p className="truncate text-sm font-semibold text-white">
          Nicholas Sheppard
        </p>
        <p className="truncate text-xs text-slate-400">nichorito@dex.local</p>
      </div>
      <span className="hidden rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/95 sm:inline">
        Live
      </span>
    </div>
  );
}
