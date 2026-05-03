"use client";

import { useCallback, useState } from "react";
import type { Contact } from "@/lib/types";

type Props = {
  contactId: string;
  onLogged: (contact: Contact) => void;
  triggerClassName?: string;
};

export default function LogInteractionModal({
  contactId,
  onLogged,
  triggerClassName = "",
}: Props) {
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
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof (payload as { error: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Could not save";
        setError(msg);
        return;
      }
      const saved = payload as Contact;
      if (!saved?.id || typeof saved.id !== "string") {
        setError("Could not save");
        return;
      }
      setNote("");
      setOpen(false);
      onLogged(saved);
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
        className={`rounded-xl bg-emerald-600 px-4 py-3 text-center text-[15px] font-medium leading-tight text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 min-h-11 active:scale-[0.98] sm:min-h-0 sm:py-2.5 sm:text-[15px] ${triggerClassName}`}
      >
        Log Interaction
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:pb-4">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[min(92dvh,560px)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-700 bg-[#161d27] p-5 shadow-2xl sm:rounded-2xl sm:p-6"
          >
            <h3 className="mb-4 text-lg font-semibold text-white">
              Log interaction
            </h3>
            <label className="mb-4 block text-sm text-slate-400">
              What happened?
              <textarea
                rows={4}
                autoFocus
                className="mt-2 min-h-[6.5rem] w-full resize-y rounded-xl border border-slate-700 bg-[#121820] px-3 py-3 text-[16px] text-slate-100 outline-none ring-blue-400/40 focus:border-blue-400/70 focus:ring-2 sm:text-[15px]"
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
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 w-full rounded-lg px-4 py-3 text-slate-300 hover:bg-white/10 sm:min-h-0 sm:w-auto sm:py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !note.trim()}
                onClick={() => void submit()}
                className="min-h-11 w-full rounded-lg bg-blue-600 py-3 font-medium text-white disabled:opacity-40 sm:min-h-0 sm:w-auto sm:px-4 sm:py-2"
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
