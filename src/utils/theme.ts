/**
 * GastroPulse OS - Dynamic Theme & Ergonomics Controller
 * Controls live switching between Obsidian Dark, Claro Minimal, and Alto Contraste KDS,
 * plus 9 restaurant chromatic brand accents.
 */

export interface AccentDefinition {
  id: string;
  name: string;
  hex: string;
  lightBg: string;
  darkBg: string;
  textLight: string;
}

export const ACCENT_PALETTE: Record<string, AccentDefinition> = {
  amber: {
    id: 'amber',
    name: 'Kinetic Amber',
    hex: '#ff5708',
    lightBg: '#fff7ed',
    darkBg: '#221A15',
    textLight: '#c2410c'
  },
  emerald: {
    id: 'emerald',
    name: 'Esmeralda',
    hex: '#10b981',
    lightBg: '#f0fdf4',
    darkBg: '#10221A',
    textLight: '#15803d'
  },
  cyan: {
    id: 'cyan',
    name: 'Cibernético',
    hex: '#00b4d8',
    lightBg: '#f0f9ff',
    darkBg: '#102028',
    textLight: '#0369a1'
  },
  ruby: {
    id: 'ruby',
    name: 'Rubí Borgoña',
    hex: '#e11d48',
    lightBg: '#fff1f2',
    darkBg: '#251217',
    textLight: '#be123c'
  },
  champagne: {
    id: 'champagne',
    name: 'Dorado Champagne',
    hex: '#eab308',
    lightBg: '#fefce8',
    darkBg: '#231e0f',
    textLight: '#a16207'
  },
  indigo: {
    id: 'indigo',
    name: 'Zafiro Índigo',
    hex: '#6366f1',
    lightBg: '#eef2ff',
    darkBg: '#16182a',
    textLight: '#4338ca'
  },
  terracotta: {
    id: 'terracotta',
    name: 'Terracota Rústico',
    hex: '#ea580c',
    lightBg: '#fff7ed',
    darkBg: '#231711',
    textLight: '#c2410c'
  },
  lavender: {
    id: 'lavender',
    name: 'Lavanda Bistro',
    hex: '#a855f7',
    lightBg: '#faf5ff',
    darkBg: '#1f132a',
    textLight: '#7e22ce'
  },
  titanium: {
    id: 'titanium',
    name: 'Titanio Minimal',
    hex: '#94a3b8',
    lightBg: '#f8fafc',
    darkBg: '#181b20',
    textLight: '#475569'
  }
};

export function applyTheme(
  themeMode: 'obsidian' | 'light' | 'kds-high-contrast' | string = 'obsidian',
  colorAccent: string = 'amber',
  density: 'compact' | 'touch' | string = 'compact'
) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // 1. Screen Mode (Obsidian / Light / KDS High-Contrast)
  root.setAttribute('data-theme', themeMode);
  if (body) {
    body.setAttribute('data-theme', themeMode);
  }

  if (themeMode === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    if (body) {
      body.classList.remove('dark');
      body.classList.add('light');
    }
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    if (body) {
      body.classList.remove('light');
      body.classList.add('dark');
    }
  }

  // 2. Color Accent (9 Curated Restaurant Palettes)
  const accentConfig = ACCENT_PALETTE[colorAccent] || ACCENT_PALETTE.amber;
  root.setAttribute('data-accent', colorAccent);
  if (body) {
    body.setAttribute('data-accent', colorAccent);
  }

  // Inject CSS Custom Properties for live reactivity in QR menu and admin
  root.style.setProperty('--primary-accent', accentConfig.hex);
  root.style.setProperty('--color-primary', accentConfig.hex);
  root.style.setProperty('--color-kinetic-amber', accentConfig.hex);

  // 3. Interface Density (Compact Desktop / Touch Amplified)
  root.setAttribute('data-density', density);
  if (body) {
    body.setAttribute('data-density', density);
  }

  // Persist locally for immediate reload restore
  try {
    const raw = localStorage.getItem('gastropulse_system_config');
    const existing = raw ? JSON.parse(raw) : {};
    existing.themeMode = themeMode;
    existing.colorAccent = colorAccent;
    existing.density = density;
    localStorage.setItem('gastropulse_system_config', JSON.stringify(existing));
    localStorage.setItem('gp_color_accent', colorAccent);
    localStorage.setItem('gp_accent_hex', accentConfig.hex);
  } catch (e) {
    console.warn('Could not save theme to local storage:', e);
  }
}

export function initGlobalTheme() {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem('gastropulse_system_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      applyTheme(
        parsed.themeMode || 'obsidian',
        parsed.colorAccent || 'amber',
        parsed.density || 'compact'
      );
      return;
    }
  } catch (e) {
    console.error('Error loading initial theme:', e);
  }

  applyTheme('obsidian', 'amber', 'compact');
}
