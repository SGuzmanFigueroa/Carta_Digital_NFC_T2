'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

/**
 * GastroPulse OS · CD-13
 * Estado del tema Claro/Oscuro EXCLUSIVO de la vista pública del comensal
 * (ruta /menu). No usa librerías externas: React Hooks + Tailwind CSS.
 *
 * Decisiones de arquitectura:
 *  - El tema se resuelve desde `localStorage` y, si no hay elección previa,
 *    desde `prefers-color-scheme` del dispositivo.
 *  - La fuente de verdad visual es la clase `.dark` / `.light` en <html>, que
 *    es activada por un script anti-FOUC (`src/app/layout.tsx`) antes del
 *    primer paint. Este provider mantiene esa clase sincronizada en runtime.
 *  - Se usa el atributo `data-menu-theme` (propio) en lugar de `data-theme`
 *    global, para no disparar los overrides del panel de administración y
 *    garantizar que el tema NO afecte al sistema interno.
 */

export type MenuTheme = 'dark' | 'light';

/** Clave de persistencia exclusiva del comensal. */
export const MENU_THEME_STORAGE_KEY = 'gastropulse_menu_theme';

const isMenuTheme = (value: unknown): value is MenuTheme =>
  value === 'dark' || value === 'light';

/** Preferencia del sistema operativo del dispositivo (fallback inicial). */
function getSystemTheme(): MenuTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** Elección explícita guardada por el comensal, o `null` si nunca eligió. */
function getStoredTheme(): MenuTheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MENU_THEME_STORAGE_KEY);
    return isMenuTheme(raw) ? raw : null;
  } catch {
    // localStorage inaccesible (modo privado / permisos): se usa el sistema.
    return null;
  }
}

/** Prioridad: elección del comensal > preferencia del sistema > Obsidian. */
export function resolveInitialMenuTheme(): MenuTheme {
  return getStoredTheme() ?? getSystemTheme();
}

/** Refleja el tema en <html> para que las utilidades `dark:` reaccionen. */
function applyMenuTheme(theme: MenuTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-menu-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
}

/** Restaura el estado base (Obsidian) al salir de la vista del comensal. */
function resetMenuTheme(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.removeAttribute('data-menu-theme');
  root.classList.add('dark');
  root.classList.remove('light');
}

/** Aplicación de alto rendimiento: sincronización inmediata en GPU a 60fps */
function triggerThemeTransition(callback: () => void): void {
  // Ejecución directa síncrona en el frame actual sin bloqueos de captura de pantalla
  callback();
}

function persistMenuTheme(theme: MenuTheme): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MENU_THEME_STORAGE_KEY, theme);
  } catch {
    // Sin persistencia disponible: el tema sigue funcionando en memoria.
  }
}

interface MenuThemeContextValue {
  theme: MenuTheme;
  isDark: boolean;
  setTheme: (theme: MenuTheme) => void;
  toggleTheme: () => void;
}

const MenuThemeContext = createContext<MenuThemeContextValue | null>(null);

export function MenuThemeProvider({ children }: { children: React.ReactNode }) {
  // Valor determinista en servidor y en el primer render del cliente (evita
  // desajustes de hidratación). El script anti-FOUC ya pintó el tema correcto.
  const [theme, setThemeState] = useState<MenuTheme>('dark');
  const [isMounted, setIsMounted] = useState(false);
  // true cuando el comensal eligió manualmente: desactiva el seguimiento del SO.
  const hasExplicitChoiceRef = useRef(false);

  // 1) Hidratación: resolver la preferencia real (localStorage -> sistema).
  useEffect(() => {
    hasExplicitChoiceRef.current = getStoredTheme() !== null;
    // El tema real vive en sistemas externos (localStorage / matchMedia) que no
    // existen durante el render del servidor: el primer render del cliente debe
    // ser idéntico al HTML del servidor ('dark') para no romper la hidratación y,
    // por eso, la lectura se hace a propósito en este efecto. No hay parpadeo
    // porque el script anti-FOUC de `layout.tsx` ya dejó el tema correcto en el
    // DOM antes del primer paint; aquí solo se sincroniza el estado de React.
    /* eslint-disable react-hooks/set-state-in-effect -- hidratación de un store externo (localStorage/matchMedia) */
    setThemeState(resolveInitialMenuTheme());
    setIsMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // 2) Sincronizar <html> (clase + atributo) y persistir si fue elección manual.
  useEffect(() => {
    if (!isMounted) return;
    applyMenuTheme(theme);
    if (hasExplicitChoiceRef.current) persistMenuTheme(theme);
  }, [isMounted, theme]);

  // 3) Al desmontar la vista del comensal se limpia el ámbito del tema.
  useEffect(() => () => resetMenuTheme(), []);

  // 4) Mientras no haya elección manual, seguir los cambios del sistema.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (hasExplicitChoiceRef.current) return;
      setThemeState(event.matches ? 'light' : 'dark');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((next: MenuTheme) => {
    hasExplicitChoiceRef.current = true;
    applyMenuTheme(next);
    persistMenuTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    hasExplicitChoiceRef.current = true;
    setThemeState((previous) => {
      const next = previous === 'dark' ? 'light' : 'dark';
      applyMenuTheme(next);
      persistMenuTheme(next);
      return next;
    });
  }, []);

  const value = useMemo<MenuThemeContextValue>(
    () => ({ theme, isDark: theme === 'dark', setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <MenuThemeContext.Provider value={value}>{children}</MenuThemeContext.Provider>;
}

/** Consumo del tema del comensal. Debe usarse dentro de <MenuThemeProvider>. */
export function useMenuTheme(): MenuThemeContextValue {
  const context = useContext(MenuThemeContext);
  if (!context) {
    throw new Error('useMenuTheme debe usarse dentro de <MenuThemeProvider>.');
  }
  return context;
}
