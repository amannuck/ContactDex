import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import UserAccountPreview from "@/components/UserAccountPreview";

export default function AppNav() {
  return (
    <header className="border-b border-slate-700/60 bg-[#141b24]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3 rounded-xl p-1 ring-slate-600/40 transition hover:ring-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
            aria-label="ContactDex — home"
          >
            <BrandMark className="h-10 w-10" />
            <span className="font-pixel-display truncate text-base font-normal leading-tight text-white sm:text-lg md:text-xl">
              ContactDex
            </span>
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm uppercase tracking-wider text-slate-300 font-pixel">
            <Link href="/" className="transition hover:text-emerald-300">
              Gallery
            </Link>
            <Link href="/study" className="transition hover:text-emerald-300">
              Study mode
            </Link>
            <Link href="/flashcards" className="transition hover:text-emerald-300">
              Flashcards
            </Link>
            <Link
              href="/leaderboard"
              className="transition hover:text-emerald-300"
            >
              Leaderboard
            </Link>
          </nav>
        </div>
        <UserAccountPreview />
      </div>
    </header>
  );
}
