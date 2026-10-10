'use client';

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * GastroPulse OS · CD-27 · Microinteracciones del carrito (2/2)
 * =============================================================================
 * Monto en Soles que CUENTA hasta su nuevo valor en lugar de saltar de golpe
 * (el "Total (2 platos): S/ 48.00" que pasa a "S/ 72.00").
 *
 * Cómo consigue 60 FPS sin re-renderizar nada:
 *
 * -  `requestAnimationFrame` escribe el texto DIRECTO en el nodo
 *   (`node.textContent`) dentro de un `useRef`. React no participa en ningún
 *   frame: cero renders, cero reconciliación, cero trabajo del árbol del
 *   carrito mientras corre el conteo. Es el mismo mecanismo que usan por dentro
 *   los `MotionValue` de framer-motion, sin traer el runtime de la librería a
 *   este punto de la pantalla.
 * -  `easeOutCubic` (monótono): el importe acelera al principio y frena al
 *   final, pero NUNCA sobrepasa el valor real. Un muelle/spring mostraría
 *   momentáneamente un precio más alto que el verdadero, que en dinero es un
 *   dato incorrecto en pantalla.
 * -  Ráfaga de toques: al cambiar el importe se cancela el frame pendiente y
 *   el nuevo conteo arranca desde el valor que el comensal está viendo
 *   (`displayedRef`), no desde el último prop, así que varios "+" seguidos se
 *   encadenan con suavidad en lugar de reiniciarse al valor viejo.
 * -  Sin parpadeo: `useLayoutEffect` (isomorfo) deja el nodo en el valor de
 *   PARTIDA antes de que el navegador pinte el commit de React. Sin ese paso se
 *   vería un frame con el total final ya saltado.
 * - ️ SSR: el primer render pinta el importe real desde el servidor (el texto
 *   va como hijo de JSX), así que no hay parpadeo ni desajuste de hidratación;
 *   al montar, `from === to` y no se anima.
 * -  `prefers-reduced-motion`: el número aparece ya en su valor final.
 */

/** Duración por defecto del conteo (ms), en sintonía con el pop del badge. */
const DEFAULT_DURATION_MS = 420;
const DEFAULT_PREFIX = 'S/ ';
const DEFAULT_DECIMALS = 2;

/**
 * `useLayoutEffect` en cliente / `useEffect` en servidor: evita el aviso de
 * React ("useLayoutEffect does nothing on the server") sin perder la garantía de
 * "escribir antes del pintado" en el navegador.
 */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Desaceleración monótona: arranca rápido y frena, sin sobrepasar el importe. */
function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

/** Formato exacto que ya usa la carta (`S/ 48.00`, dos decimales). */
function formatAmount(amount: number, prefix: string, decimals: number): string {
  return `${prefix}${amount.toFixed(decimals)}`;
}

/** Lectura defensiva de la preferencia del sistema (SSR-safe). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

interface AnimatedSolesProps {
  /** Monto objetivo, sin formatear (en Soles). */
  value: number;
  /** Duración del conteo en ms. `0` = cambio instantáneo. */
  duration?: number;
  /** Clases del nodo de texto (tipografía, color…). */
  className?: string;
  /** Prefijo del monto. Por defecto `'S/ '`. */
  prefix?: string;
  /** Decimales. Por defecto 2 (céntimos). */
  decimals?: number;
}

export const AnimatedSoles = React.memo(function AnimatedSoles({
  value,
  duration = DEFAULT_DURATION_MS,
  className,
  prefix = DEFAULT_PREFIX,
  decimals = DEFAULT_DECIMALS
}: AnimatedSolesProps) {
  const nodeRef = useRef<HTMLSpanElement | null>(null);
  /** Último monto REALMENTE pintado (no el prop): origen del próximo conteo. */
  const displayedRef = useRef(value);
  /** `requestAnimationFrame` en curso (`null` = reposo). */
  const frameRef = useRef<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const from = displayedRef.current;
    const to = value;

    // Cancela un conteo a medias: el nuevo arranca desde lo que está en pantalla.
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (from === to || duration <= 0 || prefersReducedMotion()) {
      displayedRef.current = to;
      node.textContent = formatAmount(to, prefix, decimals);
      return;
    }

    // Punto de partida ANTES del pintado: el commit de React ya dejó el importe
    // final en el nodo, y este es el frame en que se puede revertir sin que se vea.
    node.textContent = formatAmount(from, prefix, decimals);

    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const settled = progress >= 1;
      displayedRef.current = settled ? to : from + (to - from) * easeOutCubic(progress);
      node.textContent = formatAmount(displayedRef.current, prefix, decimals);
      frameRef.current = settled ? null : requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value, duration, prefix, decimals]);

  return (
    <span ref={nodeRef} className={cn('tabular-nums', className)}>
      {formatAmount(value, prefix, decimals)}
    </span>
  );
});

export default AnimatedSoles;
