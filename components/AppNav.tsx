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
            className="shrink-0 block rounded-xl p-1 ring-slate-600/40 transition hover:ring-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
            aria-label="ContactDex — home"
          >
            <BrandMark className="h-10 w-10" />
          </Link>
          <nav className="flex gap-6 text-sm text-slate-300">
            <Link href="/" className="transition hover:text-white">
              Gallery
            </Link>
            <Link href="/study" className="transition hover:text-white">
              Study Mode
            </Link>
          </nav>
        </div>
        <UserAccountPreview />
      </div>
    </header>
  );
}
