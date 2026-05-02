import Link from "next/link";

export default function AppNav() {
  return (
    <header className="border-b border-slate-700/60 bg-[#141b24]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
        <Link
          href="/"
          className="font-semibold tracking-tight text-xl text-white"
        >
          ContactDex
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
    </header>
  );
}
