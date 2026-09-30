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
 * Icono flotante minimalista (sin tarjeta/fondo) con microanimación fluida entre Sol y Luna.
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
        'group relative flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center',
        'bg-transparent border-0 shadow-none outline-none',
        'text-[#475569] dark:text-[#ffb59c] hover:text-[#0f172a] dark:hover:text-[#ff8c42]',
        'cursor-pointer transition-transform duration-200 active:scale-90',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5708] rounded-full',
        className
      )}
    >
      {/* Contenedor relativo para transición fluida de Sol y Luna */}
      <span className="relative flex items-center justify-center w-6 h-6">
        {/* Ícono de Sol: gira y se expande suavemente en modo oscuro */}
        <Sun
          aria-hidden="true"
          size={22}
          className={cn(
            'absolute transition-all duration-500 ease-out transform',
            'scale-0 rotate-90 opacity-0 dark:scale-100 dark:rotate-0 dark:opacity-100 text-[#ff8c42]',
            'group-hover:rotate-45 group-hover:scale-110'
          )}
        />
        {/* Ícono de Luna: gira y se expande suavemente en modo claro */}
        <Moon
          aria-hidden="true"
          size={22}
          className={cn(
            'absolute transition-all duration-500 ease-out transform',
            'scale-100 rotate-0 opacity-100 dark:scale-0 dark:-rotate-90 dark:opacity-0 text-[#475569]',
            'group-hover:-rotate-12 group-hover:scale-110'
          )}
        />
      </span>
    </button>
  );
}

export default ThemeToggle;
