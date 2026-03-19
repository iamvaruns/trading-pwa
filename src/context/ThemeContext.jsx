import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { THEMES, DIMS } from '../constants';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(() => {
    try { return localStorage.getItem('app_theme') || 'dark'; } catch { return 'dark'; }
  });
  const [layout, setLayout] = useState(() => {
    try { return localStorage.getItem('app_layout') || 'mobile'; } catch { return 'mobile'; }
  });

  const C = THEMES[themeName];
  const D = DIMS[layout];
  const isDesktop = layout === 'desktop';

  useEffect(() => {
    localStorage.setItem('app_theme', themeName);
    const r = document.documentElement.style;
    r.setProperty('--bg', C.bg);
    r.setProperty('--dimmer', C.dimmer);
    r.setProperty('--skel-a', C.skelA);
    r.setProperty('--skel-b', C.skelB);
    document.body.style.background = C.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', C.bg);
  }, [themeName, C]);

  useEffect(() => {
    localStorage.setItem('app_layout', layout);
  }, [layout]);

  const toggleTheme = () => setThemeName(t => t === 'dark' ? 'light' : 'dark');
  const toggleLayout = () => setLayout(l => l === 'mobile' ? 'desktop' : 'mobile');

  const value = useMemo(() => ({
    C, D, themeName, layout, isDesktop,
    setThemeName, setLayout, toggleTheme, toggleLayout,
  }), [C, D, themeName, layout, isDesktop]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function scoreColor(score, C) {
  return score >= 70 ? C.yes : score >= 50 ? C.caution : C.no;
}
