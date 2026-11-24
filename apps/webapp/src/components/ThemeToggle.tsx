'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';

const noopSubscribe = () => () => {};

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // resolvedTheme is unknown on the server; render a stable label until hydrated.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex items-center px-3 py-2 border border-white/60 text-sm font-medium rounded-md shadow-sm whitespace-nowrap text-white bg-indigo-500 hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white"
    >
      <span aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
      <span className="sr-only sm:not-sr-only sm:ml-2">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
