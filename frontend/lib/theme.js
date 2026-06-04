'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Default to light ("white") mode. We intentionally do NOT follow the OS
    // `prefers-color-scheme`; only an explicit user choice (saved earlier) wins.
    const saved = (typeof window !== 'undefined' && localStorage.getItem('fems_theme')) || 'light';
    apply(saved);
    setTheme(saved);
  }, []);

  function apply(t) {
    const root = document.documentElement;
    if (t === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      apply(next);
      localStorage.setItem('fems_theme', next);
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: 'light', toggle: () => {} };
  return ctx;
}
