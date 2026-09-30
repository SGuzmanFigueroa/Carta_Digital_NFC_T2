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
 * Incluye microanimación fluida de rotación y escala 3D entre Sol y Luna.
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
        'group relative flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center overflow-hidden',
        'rounded-xl border transition-all duration-300 active:scale-95 shadow-sm hover:shadow-md cursor-pointer',
        'border-[#cbd5e1] bg-[#f8fafc] text-[#334155] hover:bg-[#e2e8f0] hover:text-[#0f172a] hover:border-[#94a3b8]',
        'dark:border-[#353642] dark:bg-[#1c1d23] dark:text-[#ffb59c] dark:hover:bg-[#282932] dark:hover:text-white dark:hover:border-[#ff5708]/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5708] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        className
      )}
    >
      {/* Sutil halo interactivo */}
      <span className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#ff5708]/0 via-transparent to-[#ff5708]/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Contenedor relativo para transición fluida de Sol y Luna */}
      <span className="relative flex items-center justify-center w-5 h-5">
        {/* Ícono de Sol: gira y se expande suavemente en modo oscuro */}
        <Sun
          aria-hidden="true"
          size={19}
          className={cn(
            'absolute transition-all duration-500 ease-out transform',
            'scale-0 rotate-90 opacity-0 dark:scale-100 dark:rotate-0 dark:opacity-100 text-[#ff8c42]',
            'group-hover:rotate-45'
          )}
        />
        {/* Ícono de Luna: gira y se expande suavemente en modo claro */}
        <Moon
          aria-hidden="true"
          size={19}
          className={cn(
            'absolute transition-all duration-500 ease-out transform',
            'scale-100 rotate-0 opacity-100 dark:scale-0 dark:-rotate-90 dark:opacity-0 text-[#475569]',
            'group-hover:-rotate-12'
          )}
        />
      </span>
    </button>
  );
}

export default ThemeToggle;
