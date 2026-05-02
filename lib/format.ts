/** Tag-based accent for avatars — deterministic, Pokémon-adjacent without trademark art. */
const AVATAR_BACKGROUNDS = [
  "bg-emerald-600",
  "bg-sky-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-fuchsia-600",
];

export function avatarColorClass(primaryTag?: string): string {
  if (!primaryTag) return AVATAR_BACKGROUNDS[3]!;
  let h = 0;
  for (let i = 0; i < primaryTag.length; i++)
    h = (h + primaryTag.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_BACKGROUNDS[h % AVATAR_BACKGROUNDS.length]!;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

const TAG_STYLES = [
  "bg-teal-500/20 text-teal-200 ring-teal-500/30",
  "bg-blue-500/20 text-blue-100 ring-blue-400/35",
  "bg-purple-500/20 text-purple-100 ring-purple-400/35",
  "bg-orange-500/15 text-orange-100 ring-orange-400/35",
  "bg-pink-500/20 text-pink-100 ring-pink-400/35",
];

export function tagCss(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h += tag.charCodeAt(i);
  return TAG_STYLES[h % TAG_STYLES.length]!;
}

const STAGE_LABELS = ["Met", "Talked", "Collaborated", "Close"];

export function stageLabel(stage: number): string {
  return STAGE_LABELS[Math.min(3, Math.max(0, stage))] ?? "Met";
}
