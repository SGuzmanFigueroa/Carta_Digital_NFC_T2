'use client';

import React, { useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { useMenuTheme } from '@/hooks/useMenuTheme';

interface ThemeToggleProps {
  className?: string;
}

/**
 * GastroPulse OS · CD-13
 * Interruptor Claro/Oscuro de la carta digital del comensal.
 * Optimizado para alto rendimiento a 60fps con protección de clics rápidos.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useMenuTheme();
  // CD-31 · Textos accesibles del interruptor (ES/EN) según el idioma de la carta.
  const { t } = useLanguage();
  const lastClickRef = useRef<number>(0);

  const handleToggle = () => {
    const now = Date.now();
    // Protección contra micro-rebotes o spam ultrarrápido (< 120ms)
    if (now - lastClickRef.current < 120) return;
    lastClickRef.current = now;
    toggleTheme();
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={!isDark}
      aria-label={t('theme.aria')}
      title={isDark ? t('theme.toLight') : t('theme.toDark')}
      className={cn(
        'group relative flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center',
        'bg-transparent border-0 shadow-none outline-none',
        // El color de acento lo aportan los propios iconos (Sol = acento, Luna =
        // neutro), así que el botón solo necesita un estado hover legible.
        'text-[#475569] hover:text-[#0f172a] dark:text-primary',
        'cursor-pointer transition-transform duration-150 active:scale-85 select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full',
        className
      )}
    >
      {/* Contenedor relativo para transición fluida de Sol y Luna */}
      <span className="relative flex items-center justify-center w-6 h-6 pointer-events-none">
        {/* Ícono de Sol: gira y se expande suavemente en modo oscuro */}
        <Sun
          aria-hidden="true"
          size={22}
          className={cn(
            'absolute transition-all duration-300 ease-out transform',
            'scale-0 rotate-90 opacity-0 dark:scale-100 dark:rotate-0 dark:opacity-100 text-primary',
            'group-hover:rotate-45 group-hover:scale-110'
          )}
        />
        {/* Ícono de Luna: gira y se expande suavemente en modo claro */}
        <Moon
          aria-hidden="true"
          size={22}
          className={cn(
            'absolute transition-all duration-300 ease-out transform',
            'scale-100 rotate-0 opacity-100 dark:scale-0 dark:-rotate-90 dark:opacity-0 text-[#475569]',
            'group-hover:-rotate-12 group-hover:scale-110'
          )}
        />
      </span>
    </button>
  );
}

export default ThemeToggle;
