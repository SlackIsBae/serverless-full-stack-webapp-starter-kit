import { describe, expect, it } from 'vitest';
import { normalizeOwner, ownerInitials } from './owner';

describe('normalizeOwner', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeOwner('  Henry   Lee ')).toBe('Henry Lee');
  });

  it('returns null for empty or missing', () => {
    expect(normalizeOwner('   ')).toBeNull();
    expect(normalizeOwner(undefined)).toBeNull();
  });
});

describe('ownerInitials', () => {
  it('uses first and last word', () => {
    expect(ownerInitials('henry lee')).toBe('HL');
    expect(ownerInitials('Ana Maria Souza')).toBe('AS');
  });

  it('uses one letter for one word', () => {
    expect(ownerInitials('henry')).toBe('H');
  });
});
