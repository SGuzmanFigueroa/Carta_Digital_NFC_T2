'use client';

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

interface LanguageToggleProps {
  className?: string;
}

/**
 * GastroPulse OS · CD-31
 * Pastilla compacta [ES | EN] para alternar el idioma de la carta del comensal.
 *
 * Reglas de diseño (críticas, gemelas del toggle Sol/Luna `ThemeToggle`):
 *  - CERO contenedores: sin fondo, sin borde, sin sombra y sin "card" detrás.
 *  - Solo texto + un separador fino; el idioma activo se distingue por color
 *    (ámbar de acento) y peso, no por recuadros.
 *  - Touch target de 44x44 px (regla de ergonomía del proyecto), transparente.
 *  - Tipografía Space Mono (`font-mono-code`), la misma del badge de mesa y del
 *    tracker, para no inyectar clases globales ni alterar las fuentes existentes.
 */
export function LanguageToggle({ className }: LanguageToggleProps) {
  const { language, toggleLanguage, t } = useLanguage();
  const lastClickRef = useRef<number>(0);

  const isSpanish = language === 'es';

  const handleToggle = () => {
    const now = Date.now();
    // Protección contra micro-rebotes o spam ultrarrápido (< 120ms), igual que el tema.
    if (now - lastClickRef.current < 120) return;
    lastClickRef.current = now;
    toggleLanguage();
  };

  /** Idioma ACTIVO: color de acento de la carta. */
  const activeClass = 'text-[#c2410c] dark:text-[#ff8c42]';
  /** Idioma INACTIVO: gris del sistema, se ilumina al pasar el cursor. */
  const idleClass =
    'text-[#94a3b8] dark:text-[#71717a] group-hover:text-[#64748b] dark:group-hover:text-[#a1a1aa]';

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={t('lang.aria')}
      title={isSpanish ? t('lang.toEnglish') : t('lang.toSpanish')}
      className={cn(
        'group relative flex h-11 min-h-[44px] min-w-[44px] items-center justify-center',
        'bg-transparent border-0 shadow-none outline-none rounded-full',
        'cursor-pointer transition-transform duration-150 active:scale-95 select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5708]',
        className
      )}
    >
      {/* Contenido puramente decorativo para lectores: el `aria-label` ya lo anuncia. */}
      <span
        aria-hidden="true"
        className="pointer-events-none flex items-center gap-0.5 font-mono-code text-[11px] font-bold tracking-tight"
      >
        <span
          lang="es"
          className={cn('transition-colors duration-200', isSpanish ? activeClass : idleClass)}
        >
          ES
        </span>
        <span className="text-[#cbd5e1] dark:text-[#3f3f46] font-normal">|</span>
        <span
          lang="en"
          className={cn('transition-colors duration-200', isSpanish ? idleClass : activeClass)}
        >
          EN
        </span>
      </span>
    </button>
  );
}

export default LanguageToggle;
