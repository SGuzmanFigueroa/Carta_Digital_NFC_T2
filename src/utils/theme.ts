/**
 * GastroPulse OS - Dynamic Theme & Ergonomics Controller
 * Controls live switching between Obsidian Dark, Claro Minimal, and Alto Contraste KDS.
 */

export function applyTheme(
  themeMode: 'obsidian' | 'light' | 'kds-high-contrast' | string = 'obsidian',
  colorAccent: 'amber' | 'emerald' | 'cyan' | string = 'amber',
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

  // 2. Color Accent (Amber / Emerald / Cyan)
  root.setAttribute('data-accent', colorAccent);
  if (body) {
    body.setAttribute('data-accent', colorAccent);
  }

  // 3. Interface Density (Compact Desktop / Touch Amplified)
  root.setAttribute('data-density', density);
  if (body) {
    body.setAttribute('data-density', density);
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
