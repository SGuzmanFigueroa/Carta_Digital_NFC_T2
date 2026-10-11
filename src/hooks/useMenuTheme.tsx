'use client';

import { ACCENT_PALETTE } from '@/utils/theme';
import {
  createMenuThemeController,
  type MenuTheme,
  type MenuThemeController,
} from '@/utils/menuTheme';
import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';

// Preserve existing exports and the storage key used by previous releases.
export { MENU_THEME_STORAGE_KEY, resolveInitialMenuTheme } from '@/utils/menuTheme';
export type { MenuTheme } from '@/utils/menuTheme';

interface MenuThemeContextValue {
  theme: MenuTheme;
  isDark: boolean;
  setTheme: (theme: MenuTheme) => void;
  toggleTheme: () => void;
}
const MenuThemeContext = createContext<MenuThemeContextValue | null>(null);

export function MenuThemeProvider({ children }: { children: React.ReactNode }) {
  // Identical initial React markup on server/client. The inline head script
  // already sets the actual CSS theme; layout effect also covers client navigation.
  const [theme, setThemeState] = useState<MenuTheme>('dark');
  const controller = useRef<MenuThemeController | null>(null);
  useLayoutEffect(() => {
    controller.current = createMenuThemeController(setThemeState);
    try {
      const config = JSON.parse(window.localStorage.getItem('gastropulse_system_config') || '{}');
      const accent = ACCENT_PALETTE[config?.colorAccent];
      if (accent) {
        const root = document.documentElement;
        root.setAttribute('data-accent', config.colorAccent);
        root.style.setProperty('--primary-accent', accent.hex);
        root.style.setProperty('--primary-accent-ink', accent.ink);
        root.style.setProperty('--color-primary', accent.hex);
        root.style.setProperty('--color-kinetic-amber', accent.hex);
      }
    } catch { /* Use the existing accent when storage is unavailable. */ }
    return () => { controller.current?.dispose(); controller.current = null; };
  }, []);

  const setTheme = useCallback((next: MenuTheme) => controller.current?.setTheme(next), []);
  const toggleTheme = useCallback(() => controller.current?.toggleTheme(), []);
  const value = useMemo<MenuThemeContextValue>(
    () => ({ theme, isDark: theme === 'dark', setTheme, toggleTheme }), [theme, setTheme, toggleTheme],
  );
  return <MenuThemeContext.Provider value={value}>{children}</MenuThemeContext.Provider>;
}

export function useMenuTheme(): MenuThemeContextValue {
  const context = useContext(MenuThemeContext);
  if (!context) throw new Error('useMenuTheme debe usarse dentro de <MenuThemeProvider>.');
  return context;
}
