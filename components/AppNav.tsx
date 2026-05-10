import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import UserAccountPreview from "@/components/UserAccountPreview";

const linkClass =
  "flex min-h-12 min-w-[3rem] shrink-0 items-center justify-center rounded-lg px-3.5 py-1 font-pixel text-base font-medium uppercase tracking-wide text-slate-300 transition hover:bg-white/5 hover:text-emerald-300 sm:min-h-0 sm:min-w-0 sm:justify-start sm:px-0 sm:py-2 sm:text-base md:text-lg md:tracking-wider";

export default function AppNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/60 bg-[#141b24]/90 backdrop-blur-md supports-[backdrop-filter]:bg-[#141b24]/80">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-2 gap-y-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] pb-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-rows-1 sm:items-center sm:gap-x-6 sm:gap-y-0 sm:py-4 lg:px-8">
        <Link
          href="/"
          className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 rounded-xl p-1 ring-slate-600/40 transition hover:ring-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 sm:gap-3"
          aria-label="ContactDex — home"
        >
          <BrandMark className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
          <span className="font-pixel-display truncate text-[15px] font-normal leading-tight text-white sm:text-lg md:text-xl">
            Contact<span className="text-emerald-400">Dex</span>
          </span>
        </Link>

        <div className="col-start-2 row-start-1 justify-self-end sm:col-start-3 sm:justify-self-end">
          <UserAccountPreview />
        </div>

        <nav
          aria-label="Primary"
          className="scrollbar-none col-span-2 row-start-2 flex min-h-12 gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch] sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:min-h-0 sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-2 sm:overflow-visible md:justify-center"
        >
          <Link href="/" className={linkClass}>
            Gallery
          </Link>
          <Link href="/study" className={linkClass}>
            Study mode
          </Link>
          <Link href="/flashcards" className={linkClass}>
            Flashcards
          </Link>
          <Link href="/leaderboard" className={linkClass}>
            Leaderboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
