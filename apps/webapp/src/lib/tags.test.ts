import { describe, expect, it } from 'vitest';
import { normalizeTag, normalizeTags, tagColor } from './tags';

describe('normalizeTag(s)', () => {
  it('trims, collapses spaces and lowercases', () => {
    expect(normalizeTag('  Work   Stuff ')).toBe('work stuff');
  });

  it('drops empties and case-insensitive duplicates, keeping order', () => {
    expect(normalizeTags(['Work', ' ', 'home', 'WORK', 'home '])).toEqual(['work', 'home']);
  });
});

describe('tagColor', () => {
  it('is stable for the same tag regardless of case and spacing', () => {
    expect(tagColor('Urgent')).toBe(tagColor('  urgent '));
    expect(tagColor('urgent')).toBe(tagColor('urgent'));
  });

  it('spreads different tags over more than one color', () => {
    const colors = new Set(['a', 'b', 'c', 'work', 'home', 'urgent', 'ideas', 'bug'].map(tagColor));
    expect(colors.size).toBeGreaterThan(1);
  });
});
