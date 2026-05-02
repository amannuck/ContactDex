/**
 * POST demo-webhook-payload.json straight to Next.js /api/contacts/import/linkedin.
 * Use when the importer already treated everyone as "noop" or when Next was down
 * during the worker bridge (no Dex rows created).
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bridgeUrl =
  process.env.BRIDGE_URL ??
  "http://127.0.0.1:3000/api/contacts/import/linkedin";
const secret = process.env.CONTACTDEX_IMPORT_SECRET?.trim();
if (!secret) {
  console.error(
    "Missing CONTACTDEX_IMPORT_SECRET (same value as in docker compose + next dev).",
  );
  process.exit(1);
}

function slugFromUrl(url) {
  const u = String(url ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!u) return null;
  const seg = u.split("/").pop()?.split("?")[0];
  return seg && seg.length ? seg.slice(0, 512) : null;
}

/** Mirrors services/importer/app/tasks.py normalize + bio helpers */
function normalizeExternalPersonKey(row) {
  const epk = String(row.external_person_key ?? "").trim();
  if (epk) return epk.slice(0, 512);
  const slugRaw =
    row.profile_url ?? row.profileUrl ?? row.linkedin_url ?? "";
  const s = slugFromUrl(slugRaw);
  if (s) return `linkedin:${s}`;
  const nameBuf = Buffer.from(String(row.name ?? "").trim(), "utf8");
  const h = crypto.createHash("sha256").update(nameBuf).digest("hex");
  return `name:${h}`;
}

function buildBio(row) {
  const parts = [];
  if (row.headline) parts.push(String(row.headline));
  if (row.company) parts.push(`Company: ${row.company}`);
  let bio =
    parts.length > 0
      ? parts.join(". ")
      : "LinkedIn connection (aggregator import).";
  const url = row.profileUrl ?? row.linkedin_url ?? row.profile_url;
  if (url) bio = `${bio} Profile: ${url}`;
  return bio;
}

const payloadPath = path.join(__dirname, "demo-webhook-payload.json");
const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
const connections = payload.connections ?? [];

const contacts = connections.map((c) => ({
  name: String(c.name ?? "").trim(),
  bio: buildBio(c),
  tags: ["LinkedIn", "Importer"],
  moveset: [],
  linkedinExternalKey: normalizeExternalPersonKey(c),
  ...(typeof c.avatar === "string" && c.avatar.trim()
    ? { avatar: c.avatar.trim() }
    : {}),
}));

const res = await fetch(bridgeUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  },
  body: JSON.stringify({ contacts }),
});

const text = await res.text();
console.log(`${res.status} ${text}`);
if (!res.ok) process.exit(1);
