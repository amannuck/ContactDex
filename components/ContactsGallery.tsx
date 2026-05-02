"use client";

import { useMemo, useState } from "react";
import ContactCard from "@/components/ContactCard";
import type { Contact } from "@/lib/types";

type Props = {
  contacts: Contact[];
  tagOptions: string[];
};

export default function ContactsGallery({ contacts: initial, tagOptions }: Props) {
  const [contacts, setContacts] = useState<Contact[]>(initial);
  const [tag, setTag] = useState("");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    bio: "",
    tagsCsv: "",
    movesetCsv: "",
  });
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const mergedTagDropdown = useMemo(() => {
    const s = new Set(tagOptions);
    for (const c of contacts) {
      for (const t of c.tags) s.add(t);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [contacts, tagOptions]);

  async function fetchList(tagFilter: string) {
    const params = new URLSearchParams();
    if (tagFilter) params.set("tag", tagFilter);
    const qs = params.toString();
    const url = qs ? `/api/contacts?${qs}` : "/api/contacts";
    const res = await fetch(url);
    const data = (await res.json()) as Contact[];
    setContacts(Array.isArray(data) ? data : []);
  }

  const normalizedQuery = query.trim().toLowerCase();

  const visible = contacts.filter((c) => {
    if (normalizedQuery === "") return true;
    return (
      c.name.toLowerCase().includes(normalizedQuery) ||
      c.bio.toLowerCase().includes(normalizedQuery)
    );
  });

  async function createContact() {
    setCreating(true);
    setCreateErr(null);
    try {
      const tags = form.tagsCsv
        .split(/[,]/g)
        .map((x) => x.trim())
        .filter(Boolean);
      const moveset = form.movesetCsv
        .split(/[,]/g)
        .map((x) => x.trim())
        .filter(Boolean);
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          bio: form.bio.trim(),
          tags,
          moveset,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setCreateErr((j as { error?: string }).error ?? "Could not create");
        return;
      }
      setForm({ name: "", bio: "", tagsCsv: "", movesetCsv: "" });
      setAddOpen(false);
      await fetchList(tag);
    } catch {
      setCreateErr("Network error");
    } finally {
      setCreating(false);
    }
  }

  const emptyMessage =
    contacts.length === 0
      ? "Add your first contact!"
      : visible.length === 0
        ? "No contacts found"
        : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Dex Gallery
          </h1>
          <p className="mt-1 text-slate-400">
            Search, filter, open a card — or add one manually below.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className="rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700/70"
        >
          {addOpen ? "Hide form" : "Add contact"}
        </button>
      </div>

      {addOpen && (
        <div className="mb-10 rounded-2xl border border-slate-700 bg-[#1a222c]/90 p-6 shadow-inner">
          <h2 className="mb-4 text-lg font-semibold text-white">
            New dex entry (manual)
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-400">
              Name*
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-700 bg-[#121820] px-3 py-2 text-slate-100 outline-none ring-blue-400/30 focus:ring-2"
              />
            </label>
            <label className="block text-sm text-slate-400 md:col-span-2">
              Bio
              <input
                value={form.bio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bio: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-700 bg-[#121820] px-3 py-2 text-slate-100 outline-none ring-blue-400/30 focus:ring-2"
              />
            </label>
            <label className="block text-sm text-slate-400">
              Tags (comma-separated)
              <input
                value={form.tagsCsv}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tagsCsv: e.target.value }))
                }
                placeholder="Work, Coffee chat"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-[#121820] px-3 py-2 text-slate-100 outline-none ring-blue-400/30 focus:ring-2"
              />
            </label>
            <label className="block text-sm text-slate-400">
              Moveset / superpowers (comma-separated)
              <input
                value={form.movesetCsv}
                onChange={(e) =>
                  setForm((f) => ({ ...f, movesetCsv: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-700 bg-[#121820] px-3 py-2 text-slate-100 outline-none ring-blue-400/30 focus:ring-2"
              />
            </label>
          </div>
          {createErr ? (
            <p className="mt-4 text-sm text-rose-300">{createErr}</p>
          ) : null}
          <button
            type="button"
            disabled={creating || !form.name.trim()}
            onClick={() => void createContact()}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-blue-900/40 disabled:opacity-40"
          >
            {creating ? "Saving…" : "Catch contact"}
          </button>
          <p className="mt-4 text-xs text-slate-500">
            Prefer voice? Embed Professor Oak (Botpress Webchat below) calling{" "}
            <code className="rounded bg-slate-900 px-1.5 py-0.5 text-slate-300">
              /api/webhook/botpress
            </code>
            .
          </p>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <input
          type="search"
          placeholder="Search name or bio…"
          aria-label="Search contacts"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[200px] flex-1 rounded-xl border border-slate-700 bg-[#121820] px-4 py-2 text-slate-100 outline-none ring-blue-400/35 focus:border-blue-500/70 focus:ring-2"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="tag-filter" className="sr-only">
            Tag filter
          </label>
          <select
            id="tag-filter"
            aria-label="Filter by tag"
            value={tag}
            onChange={async (e) => {
              const next = e.target.value;
              setTag(next);
              await fetchList(next);
            }}
            className="rounded-xl border border-slate-700 bg-[#121820] px-4 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-400/50"
          >
            <option value="">All tags</option>
            {mergedTagDropdown.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {emptyMessage ? (
        <p className="rounded-xl border border-dashed border-slate-600 bg-slate-900/40 p-16 text-center text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((c) => (
            <ContactCard key={c.id} contact={c} />
          ))}
        </div>
      )}
    </div>
  );
}
