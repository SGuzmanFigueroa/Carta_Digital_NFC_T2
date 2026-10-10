'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * GastroPulse OS · CD-27 · Microinteracciones del carrito (1/2)
 * =============================================================================
 * Globo numérico del carrito con "badge pop": cada vez que el comensal AGREGA
 * un plato (el contador SUBE) el globo da un rebote elástico corto para llamar
 * la atención sobre el carrito.
 *
 * Decisiones de aislamiento y rendimiento:
 *
 * -  Componente HOJA y `React.memo`: la animación no obliga a re-renderizar
 *   el árbol del carrito. El padre vuelve a pintarse cuando cambia `count`
 *   (lo haría igual sin este componente), y como `CartBadge` solo depende de
 *   `count`, un render del padre con el mismo número NI siquiera lo atraviesa.
 * -  Disparo IMPERATIVO con `useAnimationControls` dentro de un `useEffect`
 *   (nada de `<motion.span animate={{...}}>` dependiente del render): así el
 *   contador NO se re-monta (no se pierde el nodo, no se resetea el layout) y
 *   tampoco se provoca un `setState` en un efecto (render en cascada). El efecto
 *   compara el valor PREVIO con el NUEVO y solo anima cuando el número sube:
 *   bajar cantidades o vaciar el carrito no debe llamar la atención.
 * -  Solo `transform: scale()`: propiedad que el navegador resuelve en el hilo
 *   de composición (GPU). No hay `width`/`height`/`top` animados, así que no hay
 *   repintados ni *layout thrashing* en cada frame.
 * -  `useReducedMotion`: con "reducir movimiento" activo el número cambia sin
 *   animación (la información se transmite igual, sin el rebote).
 * -  Sin riesgo de hidratación: el estado inicial deriva del `count` que ya
 *   viene renderizado desde el servidor y el efecto nunca anima en el montaje.
 * -  framer-motion ya viaja en el bundle de /menu (`menu/DishDetailModal`), así
 *   que esta animación no añade ni un byte a la primera carga.
 */

/** Duración del rebote, en segundos. Corto: no debe frenar el siguiente toque. */
const POP_DURATION_S = 0.32;
/** Curva con sobreimpulso (≈ easeOutBack): da el "elástico" sin ser un muelle lento. */
const POP_EASE: [number, number, number, number] = [0.34, 1.56, 0.64, 1];
/** Reparto temporal de los keyframes de escala (0% / 34% / 62% / 100%). */
const POP_TIMES: number[] = [0, 0.34, 0.62, 1];
/** Escala: crece de golpe, rebasa por debajo y vuelve a su tamaño natural. */
const POP_SCALE_KEYFRAMES: number[] = [1, 1.42, 0.94, 1];

interface CartBadgeProps {
  /** Número de platos del carrito. */
  count: number;
  /**
   * Clases del globo (posición, tamaño, color…). `cn` resuelve conflictos a
   * favor de las clases que pase el consumidor.
   */
  className?: string;
  /** Ocultar el globo cuando el carrito está vacío (por defecto: sí). */
  hideWhenEmpty?: boolean;
  /** Tope visual del globo: por encima se muestra "99+" (evita desbordarlo). */
  max?: number;
  /**
   * Marcar el globo como decorativo cuando el elemento padre YA anuncia el
   * número (p. ej. un botón con `aria-label="Ver pedido, 3 platos"`).
   */
  ariaHidden?: boolean;
}

export const CartBadge = React.memo(function CartBadge({
  count,
  className,
  hideWhenEmpty = true,
  max = 99,
  ariaHidden = false
}: CartBadgeProps) {
  const controls = useAnimationControls();
  const prefersReducedMotion = useReducedMotion();
  /** Último número pintado: la referencia para saber si el contador SUBIÓ. */
  const displayedCountRef = useRef(count);

  useEffect(() => {
    const previousCount = displayedCountRef.current;
    displayedCountRef.current = count;

    // Solo celebramos cuando el contador sube (se agregó un plato) y solo si el
    // sistema permite animaciones.
    if (count <= previousCount || prefersReducedMotion) return;

    void controls.start({
      scale: POP_SCALE_KEYFRAMES,
      transition: { duration: POP_DURATION_S, times: POP_TIMES, ease: POP_EASE }
    });
    // `controls` lo devuelve framer-motion con identidad estable (no re-dispara
    // el efecto); las dependencias reales son el contador y la preferencia.
  }, [count, controls, prefersReducedMotion]);

  if (hideWhenEmpty && count <= 0) return null;

  return (
    <motion.span
      initial={false}
      animate={controls}
      aria-hidden={ariaHidden || undefined}
      className={cn(
        // `inline-block` de base: `transform` NO se aplica a elementos inline.
        // Si el consumidor pasa `flex`/`grid`, `cn` lo deja ganar. Sin
        // `will-change` permanente: el compositor promueve la capa solo durante
        // la animación (evita una capa y un antialiasing de texto peores fijos).
        'inline-block tabular-nums',
        className
      )}
    >
      {count > max ? `${max}+` : count}
    </motion.span>
  );
});

export default CartBadge;
