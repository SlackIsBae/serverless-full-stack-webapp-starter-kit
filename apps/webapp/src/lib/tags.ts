export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 24;

// Full class names so Tailwind can see them at build time.
const TAG_COLORS = [
  'bg-red-100 text-red-800',
  'bg-orange-100 text-orange-800',
  'bg-amber-100 text-amber-800',
  'bg-lime-100 text-lime-800',
  'bg-emerald-100 text-emerald-800',
  'bg-teal-100 text-teal-800',
  'bg-sky-100 text-sky-800',
  'bg-indigo-100 text-indigo-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
] as const;

export function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Normalizes, drops empties and duplicates, keeps first-seen order. */
export function normalizeTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map(normalizeTag).filter(Boolean))];
}

/** Same tag (ignoring case and spacing) always gets the same color. FNV-1a hash into the palette. */
export function tagColor(tag: string): string {
  let hash = 2166136261;
  for (const char of normalizeTag(tag)) {
    hash = Math.imul(hash ^ char.codePointAt(0)!, 16777619) >>> 0;
  }
  return TAG_COLORS[hash % TAG_COLORS.length];
}
