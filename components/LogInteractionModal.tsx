"use client";

import { useCallback, useState } from "react";

type Props = {
  contactId: string;
  onLogged: () => void;
};

export default function LogInteractionModal({ contactId, onLogged }: Props) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, date: today }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as { error?: string }).error ?? "Could not save");
        return;
      }
      setNote("");
      setOpen(false);
      onLogged();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }, [contactId, note, onLogged, today]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500"
      >
        Log Interaction
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#161d27] p-6 shadow-2xl"
          >
            <h3 className="mb-4 text-lg font-semibold text-white">
              Log interaction
            </h3>
            <label className="mb-4 block text-sm text-slate-400">
              What happened?
              <textarea
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-[#121820] px-3 py-2 text-slate-100 outline-none ring-blue-400/40 focus:border-blue-400/70 focus:ring-2"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <p className="mb-6 text-xs text-slate-500">
              Date&nbsp;
              <span className="font-mono text-slate-400">{today}</span>
              &nbsp;(auto-filled; adjust via API if needed)
            </p>
            {error ? (
              <p className="mb-4 text-sm text-rose-300">{error}</p>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !note.trim()}
                onClick={() => void submit()}
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-40"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
