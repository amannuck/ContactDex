import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-mono text-sm text-blue-400/90">Missing dex entry</p>
      <h1 className="mt-4 text-3xl font-bold text-white">No such contact</h1>
      <p className="mt-4 text-slate-400">
        That ID is not registered. Perhaps it fled into tall grass?
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-500"
      >
        Back to gallery
      </Link>
    </main>
  );
}
