'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMenuTheme } from '@/hooks/useMenuTheme';

interface ThemeToggleProps {
  className?: string;
}

/**
 * GastroPulse OS · CD-13
 * Interruptor Claro/Oscuro de la carta digital del comensal.
 *
 * Accesibilidad y rendimiento:
 *  - Touch target de 44x44 px (WCAG 2.5.5) en cualquier tamaño de pantalla.
 *  - Los iconos se alternan por CSS (`dark:hidden` / `hidden dark:block`), no
 *    por estado de React: así el HTML del servidor coincide con el del cliente
 *    y no se produce error de hidratación ni parpadeo del icono.
 *  - `aria-label` estático y descriptivo para lectores de pantalla.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useMenuTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={!isDark}
      aria-label="Alternar tema claro u oscuro de la carta"
      title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className={cn(
        'relative flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center',
        'rounded-xl border border-[#cbd5e1] bg-[#f1f5f9] text-[#334155]',
        'hover:bg-[#e2e8f0] hover:text-[#0f172a]',
        'dark:border-[#353642] dark:bg-[#1c1d23] dark:text-[#ffb59c] dark:hover:bg-[#282932] dark:hover:text-white',
        'cursor-pointer transition-colors active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5708] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        className
      )}
    >
      <Sun aria-hidden="true" size={18} className="hidden dark:block" />
      <Moon aria-hidden="true" size={18} className="block dark:hidden" />
    </button>
  );
}

export default ThemeToggle;
