"use client";

import Link from "next/link";
import { useEffect } from "react";

/** App Router boundary — renders when a Server Component throws; shows diagnostics instead of a blank 500. */
export default function AppErrorRoute({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ContactDex]", error);
  }, [error]);

  const hint =
    error.message.includes("Cannot find module") ||
    /\.next[\\/]/i.test(error.message)
      ? "Stale build cache: stop the server, run npm run clean, then npm run dev or npm run build."
      : error.message.includes("contacts.json")
        ? error.message
        : "Try npm run clean, then npm run dev. If issues persist, check the terminal trace above.";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16 font-sans text-slate-200">
      <h1 className="mb-4 text-xl font-semibold text-white">
        Something went wrong
      </h1>
      <p className="mb-6 text-sm text-slate-400">{hint}</p>
      {process.env.NODE_ENV === "development" && error.message && (
        <pre className="mb-8 max-h-48 overflow-auto rounded-lg border border-rose-500/30 bg-rose-950/25 p-3 text-xs text-rose-100">
          {error.message}
          {error.digest ? `\ndigest: ${error.digest}` : ""}
        </pre>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-white/10"
        >
          Gallery
        </Link>
      </div>
    </main>
  );
}
