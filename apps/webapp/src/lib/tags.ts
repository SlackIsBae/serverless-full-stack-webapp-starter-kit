export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 24;

// Full class names so Tailwind can see them at build time.
const TAG_COLORS = [
  'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200',
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
