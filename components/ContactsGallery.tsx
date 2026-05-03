"use client";

import { useMemo, useRef, useState } from "react";
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
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    bio: "",
    tagsCsv: "",
    movesetCsv: "",
    avatar: "",
  });
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          ...(form.avatar.trim() ? { avatar: form.avatar.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setCreateErr((j as { error?: string }).error ?? "Could not create");
        return;
      }
      setForm({
        name: "",
        bio: "",
        tagsCsv: "",
        movesetCsv: "",
        avatar: "",
      });
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
    <div className="mx-auto max-w-6xl px-4 py-8 font-pixel">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-pixel-display text-lg font-normal leading-snug text-white sm:text-xl md:text-2xl">
            Dex gallery
          </h1>
          <p className="mt-1 text-slate-400">
            Search, filter, open a card — or add one manually below.
          </p>
        </div>
        <div className="flex w-full flex-shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[11rem]">
          <button
            type="button"
            onClick={() => setImportOpen((o) => !o)}
            className="w-full rounded-xl border border-dashed border-sky-600/55 bg-sky-950/35 px-4 py-2 text-sm font-semibold text-sky-200/95 transition hover:border-sky-500/70 hover:bg-sky-950/50"
          >
            {importOpen ? "Hide import form" : "Import new connections"}
          </button>
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className="w-full rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700/70"
          >
            {addOpen ? "Hide form" : "Add contact"}
          </button>
        </div>
      </div>

      {importOpen && (
        <div className="mb-10 rounded-2xl border border-sky-800/40 bg-sky-950/20 p-6 shadow-inner ring-1 ring-sky-900/30">
          <h2 className="mb-2 text-lg font-semibold text-white">
            Import new connections
          </h2>
          <p className="mb-6 max-w-xl text-sm leading-relaxed text-slate-400">
            Pull in contacts from LinkedIn or another source in bulk. Wiring
            arrives in a later release.
          </p>
          <button
            type="button"
            disabled
            title="Not wired up yet — bulk import will connect here later."
            className="rounded-xl border border-dashed border-sky-600/55 bg-sky-950/40 px-5 py-3 text-sm font-semibold text-sky-200/90 sm:min-w-[12rem]"
          >
            Import new connections
          </button>
        </div>
      )}

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
            <div className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm text-slate-400">Photo</span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    if (f.size > 1_500_000) {
                      setCreateErr(
                        "Image is too large — try under ~1.5MB or paste a URL below.",
                      );
                      return;
                    }
                    setCreateErr(null);
                    const r = new FileReader();
                    r.onloadend = () => {
                      const u = typeof r.result === "string" ? r.result : "";
                      if (u) setForm((prev) => ({ ...prev, avatar: u }));
                    };
                    r.readAsDataURL(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-slate-600 bg-slate-800/70 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-blue-500/50 hover:bg-slate-700/80"
                >
                  Add profile picture
                </button>
              </div>
              <input
                value={
                  form.avatar.startsWith("data:") ? "" : form.avatar
                }
                onChange={(e) =>
                  setForm((f) => ({ ...f, avatar: e.target.value }))
                }
                placeholder="Or paste an image URL (https://…)"
                className="w-full rounded-xl border border-slate-700 bg-[#121820] px-3 py-2 text-sm text-slate-100 outline-none ring-blue-400/30 focus:ring-2"
              />
              {form.avatar ? (
                <div className="mt-1 flex items-center gap-3">
                  <img
                    src={form.avatar}
                    alt=""
                    className="size-14 rounded-full object-cover ring-2 ring-slate-600/80"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, avatar: "" }))}
                    className="text-xs font-medium text-rose-400/90 underline decoration-rose-500/40 underline-offset-2 hover:text-rose-300"
                  >
                    Remove photo
                  </button>
                </div>
              ) : null}
            </div>
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
