export type MenuTheme = 'dark' | 'light';
export const MENU_THEME_STORAGE_KEY = 'gastropulse_menu_theme';
export const MENU_THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';
const isTheme = (value: unknown): value is MenuTheme => value === 'dark' || value === 'light';

function storedTheme(): MenuTheme | null {
  try {
    const value = window.localStorage.getItem(MENU_THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch { return null; }
}

export function resolveInitialMenuTheme(): MenuTheme {
  if (typeof window === 'undefined') return 'dark';
  return storedTheme() ?? (typeof window.matchMedia === 'function'
    ? (window.matchMedia(MENU_THEME_MEDIA_QUERY).matches ? 'dark' : 'light') : 'dark');
}

function apply(theme: MenuTheme): void {
  const root = document.documentElement;
  // The admin's global overrides and a body.dark class must not override /menu.
  root.removeAttribute('data-theme');
  document.body?.removeAttribute('data-theme');
  document.body?.classList.remove('dark', 'light');
  root.setAttribute('data-menu-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.style.colorScheme = theme;
}

function adminTheme(): string {
  const current = document.documentElement.getAttribute('data-theme');
  if (current) return current;
  try {
    const config = JSON.parse(window.localStorage.getItem('gastropulse_system_config') || '{}');
    if (typeof config?.themeMode === 'string' && config.themeMode) return config.themeMode;
  } catch { /* Restore the existing default if storage is inaccessible. */ }
  return 'obsidian';
}

export interface MenuThemeController {
  setTheme(theme: MenuTheme): void;
  toggleTheme(): void;
  dispose(): void;
}

/** The system stays automatic until an explicit click, even if storage fails. */
export function createMenuThemeController(onChange: (theme: MenuTheme) => void): MenuThemeController {
  const previousAdminTheme = adminTheme();
  const media = typeof window.matchMedia === 'function' ? window.matchMedia(MENU_THEME_MEDIA_QUERY) : null;
  let manual = storedTheme();
  let current = manual ?? (media ? (media.matches ? 'dark' : 'light') : 'dark');
  const update = (theme: MenuTheme) => { current = theme; apply(theme); onChange(theme); };
  update(current);

  const handleChange = (event: MediaQueryListEvent) => {
    if (manual === null) update(event.matches ? 'dark' : 'light');
  };
  if (typeof media?.addEventListener === 'function') media.addEventListener('change', handleChange);
  else media?.addListener(handleChange); // Safari versions preceding MediaQueryList EventTarget.

  const setTheme = (theme: MenuTheme) => {
    manual = theme;
    try { window.localStorage.setItem(MENU_THEME_STORAGE_KEY, theme); } catch { /* Keep the choice in memory. */ }
    update(theme);
  };
  return {
    setTheme,
    toggleTheme: () => setTheme(current === 'dark' ? 'light' : 'dark'),
    dispose() {
      if (typeof media?.removeEventListener === 'function') media.removeEventListener('change', handleChange);
      else media?.removeListener(handleChange);
      const root = document.documentElement;
      root.removeAttribute('data-menu-theme');
      root.style.removeProperty('color-scheme');
      root.setAttribute('data-theme', previousAdminTheme);
      document.body?.setAttribute('data-theme', previousAdminTheme);
      root.classList.toggle('dark', previousAdminTheme !== 'light');
      root.classList.toggle('light', previousAdminTheme === 'light');
    },
  };
}

// Parser-blocking head script: no React, network request or storage write is
// needed before the first paint. Keep it self-contained for the inline script.
export const MENU_THEME_BOOTSTRAP = `(function(){
  var path = window.location.pathname;
  if (!(path === '/' || path === '/menu' || path.indexOf('/menu/') === 0)) return;
  var theme = null;
  try { theme = localStorage.getItem('gastropulse_menu_theme'); } catch(e) {}
  if (theme !== 'dark' && theme !== 'light') {
    theme = typeof window.matchMedia === 'function'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 'dark';
  }
  var root = document.documentElement;
  root.removeAttribute('data-theme');
  root.setAttribute('data-menu-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.style.colorScheme = theme;
})();`;
