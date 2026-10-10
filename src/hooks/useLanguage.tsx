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
import {
  translate,
  type MenuLanguage,
  type TranslationKey,
  type TranslationParams
} from '@/i18n/translations';

/**
 * GastroPulse OS · CD-31
 * Estado del idioma (ES / EN) EXCLUSIVO de la vista pública del comensal (/menu).
 * Sin librerías externas: React Context + Hooks + localStorage.
 *
 * Decisiones de arquitectura (espejo de `useMenuTheme`):
 *  - La preferencia se resuelve desde `localStorage` y, si el comensal nunca eligió,
 *    desde el idioma del navegador (`navigator.language`).
 *  - El primer render del cliente es SIEMPRE 'es' para coincidir con el HTML del
 *    servidor (el layout raíz declara `lang="es"`), evitando desajustes de hidratación;
 *    la lectura real de localStorage/navegador ocurre en un efecto tras el montaje.
 *  - Se sincroniza el atributo `lang` de <html> (accesibilidad + lectores de pantalla)
 *    y un `data-menu-lang` propio, sin tocar clases globales ni el tema claro/oscuro.
 */

/** Clave de persistencia exclusiva del comensal. */
export const MENU_LANGUAGE_STORAGE_KEY = 'gastropulse_menu_lang';

const isMenuLanguage = (value: unknown): value is MenuLanguage => value === 'es' || value === 'en';

/** Elección explícita guardada por el comensal, o `null` si nunca eligió. */
function getStoredLanguage(): MenuLanguage | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MENU_LANGUAGE_STORAGE_KEY);
    return isMenuLanguage(raw) ? raw : null;
  } catch {
    // localStorage inaccesible (modo privado / permisos): se usa el navegador.
    return null;
  }
}

/** Idioma preferido del dispositivo, como fallback inicial ('en' → inglés, resto → español). */
function getBrowserLanguage(): MenuLanguage {
  if (typeof navigator === 'undefined') return 'es';
  const preferred = navigator.languages?.[0] || navigator.language || 'es';
  return preferred.toLowerCase().startsWith('en') ? 'en' : 'es';
}

/** Prioridad: elección del comensal > idioma del navegador > Español. */
export function resolveInitialMenuLanguage(): MenuLanguage {
  return getStoredLanguage() ?? getBrowserLanguage();
}

/** Refleja el idioma en <html> para accesibilidad (lectores) y SEO. */
function applyDocumentLanguage(language: MenuLanguage): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-menu-lang', language);
  root.setAttribute('lang', language);
}

/** Restaura el estado base (Español) al salir de la vista del comensal. */
function resetDocumentLanguage(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.removeAttribute('data-menu-lang');
  root.setAttribute('lang', 'es');
}

function persistMenuLanguage(language: MenuLanguage): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MENU_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Sin persistencia disponible: el idioma sigue funcionando en memoria.
  }
}

interface LanguageContextValue {
  /** Idioma activo. */
  language: MenuLanguage;
  /** Atajo booleano para condicionales de UI. */
  isEnglish: boolean;
  /** Fija el idioma y lo persiste (elección explícita del comensal). */
  setLanguage: (next: MenuLanguage) => void;
  /** Alterna ES <-> EN. */
  toggleLanguage: () => void;
  /** Traduce una clave del diccionario, con `{placeholders}` opcionales. */
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Valor determinista en servidor y en el primer render del cliente (evita
  // desajustes de hidratación, igual que el provider del tema).
  const [language, setLanguageState] = useState<MenuLanguage>('es');
  const [isMounted, setIsMounted] = useState(false);
  const hasExplicitChoiceRef = useRef(false);

  // 1) Hidratación: resolver la preferencia real (localStorage -> navegador).
  useEffect(() => {
    hasExplicitChoiceRef.current = getStoredLanguage() !== null;
    /* eslint-disable react-hooks/set-state-in-effect -- hidratación de un store externo (localStorage/navigator) */
    setLanguageState(resolveInitialMenuLanguage());
    setIsMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // 2) Sincronizar <html lang> y persistir si fue elección manual.
  useEffect(() => {
    if (!isMounted) return;
    applyDocumentLanguage(language);
    if (hasExplicitChoiceRef.current) persistMenuLanguage(language);
  }, [isMounted, language]);

  // 3) Al desmontar la vista del comensal se limpia el ámbito del idioma.
  useEffect(() => () => resetDocumentLanguage(), []);

  const setLanguage = useCallback((next: MenuLanguage) => {
    hasExplicitChoiceRef.current = true;
    applyDocumentLanguage(next);
    persistMenuLanguage(next);
    setLanguageState(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    hasExplicitChoiceRef.current = true;
    setLanguageState((previous) => {
      const next: MenuLanguage = previous === 'es' ? 'en' : 'es';
      applyDocumentLanguage(next);
      persistMenuLanguage(next);
      return next;
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams): string => translate(language, key, params),
    [language]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ language, isEnglish: language === 'en', setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** Consumo del idioma del comensal. Debe usarse dentro de <LanguageProvider>. */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage debe usarse dentro de <LanguageProvider>.');
  }
  return context;
}
