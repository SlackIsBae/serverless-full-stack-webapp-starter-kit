import { describe, expect, it } from 'vitest';
import { DEFAULT_PICTURE, todoPicture } from './todoPicture';

describe('todoPicture', () => {
  it('maps keywords to an emoji, ignoring case', () => {
    expect(todoPicture('Buy milk and eggs')).toBe('🛒');
    expect(todoPicture('FIX the login bug')).toBe('🐛');
  });

  it('uses the first matching rule', () => {
    expect(todoPicture('call the dentist')).toBe('📞');
  });

  it('matches whole words only', () => {
    expect(todoPicture('scarlet')).toBe(DEFAULT_PICTURE);
  });

  it('falls back to the default', () => {
    expect(todoPicture('something unrelated')).toBe(DEFAULT_PICTURE);
  });
});
