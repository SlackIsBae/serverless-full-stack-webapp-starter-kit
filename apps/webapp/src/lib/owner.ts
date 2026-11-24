export const MAX_OWNER_LENGTH = 40;

/** Trims and collapses spaces. Empty means no owner (stored as NULL). */
export function normalizeOwner(owner: string | undefined): string | null {
  const value = (owner ?? '').trim().replace(/\s+/g, ' ');
  return value === '' ? null : value;
}

/** Up to two initials, e.g. "Henry Lee" -> "HL", "henry" -> "H". */
export function ownerInitials(owner: string): string {
  const words = owner.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : [words[0] ?? ''];
  return letters
    .map((word) => (word ? String.fromCodePoint(word.codePointAt(0)!) : ''))
    .join('')
    .toUpperCase();
}
