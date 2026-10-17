'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MenuItem } from '@/types';
import { calculatePromoPricing, formatSoles } from '@/utils/promo';
import { useLanguage } from '@/hooks/useLanguage';

/**
 * CD-16 · Tira horizontal "Oferta Flash" de la pantalla principal (autoplay).
 *
 * Muestra UNA oferta a la vez y rota sola entre TODAS las ofertas activas cada
 * `rotationMs` (2000ms = 2s por defecto, el ritmo 1.8-2s del banner), nunca de
 * golpe: el bloque de datos se remonta con `key={deal.id}` y entra con un
 * desvanecido + deslizamiento vertical de 500ms (`transition-all duration-500`
 * en el nodo + clase `.promo-deal-ticker` de `globals.css`, para que la animación
 * viva junto al resto de entradas del sistema y respete `prefers-reduced-motion`).
 *
 * Por qué remontar por `key` y no animar con estado propio:
 * - La animación arranca SIEMPRE desde cero, sin comparar índices ni acumular
 *   nodos en el DOM (cero tirones, cero parpadeos a mitad de transición).
 * - El layout no se mueve: la tira conserva su alto (1 línea de nombre + 1 de
 *   precios) y los textos siguen truncándose, así que rotar no empuja la carta.
 *
 * UX (todo intencional):
 * - 🖱️ Se PAUSA al pasar el mouse encima (y al enfocar con teclado, y mientras el
 *   dedo está apoyado en móvil): nunca cambia de plato justo cuando el comensal
 *   lo está leyendo o a punto de tocar. Se reanuda sola al soltar.
 * - 🖐️ El hover se detecta sólo con puntero tipo `mouse`: en iOS el "hover"
 *   emulado del tap puede quedarse pegado (hay `mouseenter` pero no `mouseleave`)
 *   y dejaría la barra congelada para siempre.
 * - 👆 Al tocar/click, abre el pop-up detallado EN la oferta que se está viendo
 *   (no en la primera): `onOpenDeal` recibe el plato visible.
 * - ♿ Con `prefers-reduced-motion` activo NO hay rotación automática: el comensal
 *   puede seguir viendo todas las ofertas abriendo el pop-up (que sí las lista).
 * - 🌙 En segundo plano no hay giros: al volver, `visibilitychange` reinicia la
 *   rejilla desde AHORA (sin encadenar los que se perdió).
 *
 * ⏱️ TEMPORIZADOR (por qué el ritmo es firme a 2s):
 * - `setTimeout` que se reprograma solo con COMPENSACIÓN DE DERIVA: se mide con
 *   `performance.now()` cuánto se retrasó el giro real y ese atraso se descuenta
 *   del ciclo siguiente (con tope de un ciclo). Un `setInterval` no compensa:
 *   acumula ticks atrasados y los ejecuta en ráfaga (ráfaga + pausa larga = "se
 *   congeló y luego giró de golpe").
 * - El índice vive en un `useRef` (el estado sólo pinta el DOM): el efecto del
 *   timer no depende de `activeIndex` ni de `deals`, así que NO se destruye ni se
 *   recrea en cada render del padre. Ese reinicio continuo era lo que hacía que la
 *   tarjeta tardara 4-6s en girar al mover el mouse o hacer scroll.
 * - Pausa con memoria: al pausar se guarda el tiempo restante, de modo que un
 *   hover/tap corto NO reinicia los 2s (reanuda donde se quedó).
 * - 🛟 Guard de 8s: si un `touchend`/`pointerleave` se pierde, la pausa se libera
 *   sola y la tira nunca queda congelada para siempre.
 */

/** Píxeles de tolerancia de un "tap": más movimiento = scroll (se reanuda el giro). */
const TAP_MOVE_TOLERANCE_PX = 10;
/** 🛟 Si un `touchend`/`pointerleave` se pierde, la pausa se libera tras este tiempo. */
const ENGAGEMENT_SAFETY_MS = 8000;

interface PromoFlashTickerProps {
  /** Ofertas flash activas del sistema: un plato por punto de rotación. */
  deals: MenuItem[];
  /** Porcentaje de descuento aplicado a cada plato (coherente con el pop-up). */
  discountPercent: number;
  /** Milisegundos entre rotaciones. 2000 = "2s" (ritmo 1.8-2s del banner). */
  rotationMs?: number;
  /** El pop-up promocional está abierto: la tira deja de rotar (no se ve). */
  isPaused?: boolean;
  /** Abre el pop-up detallado en la oferta que el comensal tiene delante. */
  onOpenDeal: (deal: MenuItem) => void;
}

export const PromoFlashTicker = React.memo(function PromoFlashTicker({
  deals,
  discountPercent,
  rotationMs = 2000,
  isPaused = false,
  onOpenDeal
}: PromoFlashTickerProps) {
  /** CD-31 · Idioma de la carta (ES/EN): la tira se re-pinta al cambiarlo. */
  const { t } = useLanguage();
  /** Índice de la oferta visible AHORA en la tira. */
  const [activeIndex, setActiveIndex] = useState(0);
  /** Interacción en curso (hover real, foco de teclado o dedo apoyado). */
  const [isUserEngaged, setIsUserEngaged] = useState(false);

  /**
   * Accesibilidad: con la preferencia del sistema "reducir movimiento" el ticker
   * no rota. Se inicializa perezosamente en el cliente; el valor NO interviene en
   * el JSX, así que SSR e hidratación siguen pintando exactamente lo mismo.
   */
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // El comensal puede cambiar la preferencia con la carta ya abierta: al volver
  // a la app, el ticker se detiene o se reanuda solo. El `setState` vive dentro
  // de un listener (nunca en el cuerpo del efecto): sin renders en cascada.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);

    motionQuery.addEventListener('change', handleMotionChange);
    return () => motionQuery.removeEventListener('change', handleMotionChange);
  }, []);

  const totalDeals = deals.length;
  const isAutoplayEnabled = totalDeals > 1 && !isUserEngaged && !isPaused && !prefersReducedMotion;

  // ── 🔧 REFS del temporizador ────────────────────────────────────────────────
  // El timer lee y escribe AQUÍ, no en el estado: así el efecto no depende del
  // render y el ritmo no se rompe cuando el padre re-renderiza (scroll).
  /** Índice que usará el PRÓXIMO giro (el estado sólo refleja lo pintado). */
  const activeIndexRef = useRef(0);
  /** Nº de ofertas vivo (leído por el timer; NO es dependencia del efecto). */
  const totalDealsRef = useRef(totalDeals);
  /** Id del `setTimeout` en curso (`null` = no hay ciclo corriendo). */
  const rotationTimerRef = useRef<number | null>(null);
  /** Instante real (`performance.now`) en que VENCE el giro pendiente. */
  const nextRotationAtRef = useRef(0);
  /** Tiempo que FALTABA al pausar: reanudar CONTINÚA el ciclo, no lo reinicia. */
  const remainingMsRef = useRef(rotationMs);
  /** Autoplay activo, para los listeners nativos (fuera del ciclo de React). */
  const isAutoplayEnabledRef = useRef(false);
  /** Origen del toque: distingue un "tap" (pausa) de un scroll con el dedo. */
  const touchOriginRef = useRef<{ x: number; y: number } | null>(null);
  /** ¿Hay un puntero de mouse REAL encima? El guard no debe liberar ese hover. */
  const isPointerOverRef = useRef(false);

  // El menú puede cambiar en vivo (alta/baja de ofertas): el temporizador nunca
  // debe trabajar con un total obsoleto. Sólo se tocan refs: cero renders extra.
  useEffect(() => {
    totalDealsRef.current = totalDeals;
  }, [totalDeals]);

  /** 🧹 Cancela el giro pendiente y limpia el ref (sin timers huérfanos). */
  const clearRotationTimer = useCallback(() => {
    if (rotationTimerRef.current !== null) {
      window.clearTimeout(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
  }, []);

  /** ⏭️ Pasa a la siguiente oferta: actualiza el ref y pinta con el estado. */
  const advanceDeal = useCallback(() => {
    const total = totalDealsRef.current;
    if (total <= 1) return;

    const nextIndex = (activeIndexRef.current + 1) % total;
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
  }, []);

  /**
   * ⏱️ Programa el próximo giro. Se usa `setTimeout` (no `setInterval`) porque así
   * el ciclo se reprograma midiendo la DERIVA REAL con `performance.now()`: si el
   * hilo principal estuvo bloqueado (scroll pesado, ráfaga de re-render, pestaña en
   * segundo plano) no se reproduce el atraso de golpe; se descuenta del siguiente
   * ciclo (con tope de un ciclo) y el ritmo MEDIO queda clavado en `rotationMs`.
   * `setInterval` no compensa nada: acumula los ticks atrasados y los dispara en
   * ráfaga, que es justo lo que se percibía como "se congeló y giró de golpe".
   *
   * Es una función nombrada para poder reprogramarse a sí misma sin depender de la
   * identidad del callback (y sin dispararse un warning de dependencias).
   */
  const scheduleRotation = useCallback(
    function schedule(delayMs: number) {
      clearRotationTimer();
      nextRotationAtRef.current = performance.now() + delayMs;

      rotationTimerRef.current = window.setTimeout(function handleRotation() {
        rotationTimerRef.current = null;
        advanceDeal();

        // Cuánto se pasó el hilo principal de la hora prevista para este giro.
        const overdue = performance.now() - nextRotationAtRef.current;
        const nextDelay = overdue > 0 && overdue < rotationMs ? rotationMs - overdue : rotationMs;
        remainingMsRef.current = nextDelay;
        schedule(nextDelay);
      }, Math.max(0, delayMs));
    },
    [advanceDeal, clearRotationTimer, rotationMs]
  );

  // ▶️⏸️ Arranque, pausa y limpieza en un ÚNICO efecto con dependencias primitivas
  // y estables: NO se destruye ni se recrea por renders del padre ni por scroll.
  useEffect(() => {
    isAutoplayEnabledRef.current = isAutoplayEnabled;

    if (!isAutoplayEnabled) {
      clearRotationTimer();
      // ⏸️ Pausa CON memoria: se guarda lo que faltaba del ciclo, así un hover, un
      // tap o un re-render NO reinician los 2s desde cero (esa era la causa de que
      // la tarjeta tardara 4-6s en girar al mover el mouse o al hacer scroll). Si no
      // había ciclo en curso (o ya venció), se reanuda con un ciclo completo.
      const pending = nextRotationAtRef.current - performance.now();
      remainingMsRef.current = pending > 0 && pending <= rotationMs ? pending : rotationMs;
      return;
    }

    // ▶️ Reanudación: continúa desde donde se quedó (o abre un ciclo nuevo).
    scheduleRotation(remainingMsRef.current);

    return clearRotationTimer; // 🧹 limpieza al desmontar y en cada pausa
  }, [isAutoplayEnabled, rotationMs, scheduleRotation, clearRotationTimer]);

  // 🌙 Al volver de segundo plano los timers llegan estrangulados: la rejilla se
  // limpia y arranca de nuevo desde AHORA, sin ráfagas de giros perdidos.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden || !isAutoplayEnabledRef.current) return;

      remainingMsRef.current = rotationMs;
      scheduleRotation(rotationMs);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [rotationMs, scheduleRotation]);

  // 🛟 Red de seguridad anti-congelación: si el `touchend`/`pointerleave` se pierde
  // (el navegador roba el gesto, se cambia de app…), la pausa se libera sola. El
  // hover con mouse NO entra aquí: ahí la pausa es intencional y dura lo que el
  // comensal mantenga el puntero encima.
  useEffect(() => {
    if (!isUserEngaged || isPointerOverRef.current) return;

    const safetyTimer = window.setTimeout(() => setIsUserEngaged(false), ENGAGEMENT_SAFETY_MS);
    return () => window.clearTimeout(safetyTimer);
  }, [isUserEngaged]);

  // El menú puede cambiar en vivo (alta/baja de ofertas): el índice se protege
  // con módulo para no quedar nunca fuera de rango.
  const currentIndex = totalDeals > 0 ? activeIndex % totalDeals : 0;
  const deal = totalDeals > 0 ? deals[currentIndex] : undefined;
  const effectiveDiscount = deal?.promoDiscountPercent ?? discountPercent;

  const pricing = useMemo(() => {
    if (!deal) return null;
    const { promoPriceCustom, promoOriginalPriceCustom } = deal;
    if (promoPriceCustom && promoOriginalPriceCustom) {
      return {
        originalPrice: promoOriginalPriceCustom,
        promoPrice: promoPriceCustom,
        savings: promoOriginalPriceCustom - promoPriceCustom,
        discountPercent: effectiveDiscount
      };
    }
    return calculatePromoPricing(deal.price, effectiveDiscount);
  }, [deal, effectiveDiscount]);

  /** Toca/click: abre el detalle de la oferta que se está viendo en la tira. */
  const handleOpenDeal = useCallback(() => {
    if (deal) onOpenDeal(deal);
  }, [deal, onOpenDeal]);

  // 🖱️ Hover real (mouse/pen): pausa mientras el comensal lee la oferta. Al salir,
  // el ciclo continúa EXACTAMENTE donde se quedó (no vuelve a empezar los 2s).
  const handlePointerEnter = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse') return;

    isPointerOverRef.current = true;
    setIsUserEngaged(true);
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse') return;

    isPointerOverRef.current = false;
    setIsUserEngaged(false);
  };

  /** 🚫 Puntero cancelado (el navegador se queda el gesto): libera la pausa ya. */
  const handlePointerCancel = () => {
    isPointerOverRef.current = false;
    setIsUserEngaged(false);
  };

  // 👆 Móvil: el dedo puede empezar SOBRE la tira para hacer scroll de la página.
  // Se pausa al apoyar, pero si el dedo se desplaza (fue scroll, no lectura) se
  // reanuda al instante: antes ese gesto dejaba la tira "congelada".
  const handleTouchStart = (event: React.TouchEvent<HTMLButtonElement>) => {
    const touch = event.touches[0];
    touchOriginRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    setIsUserEngaged(true);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLButtonElement>) => {
    const origin = touchOriginRef.current;
    const touch = event.touches[0];
    if (!origin || !touch) return;

    const movedX = Math.abs(touch.clientX - origin.x);
    const movedY = Math.abs(touch.clientY - origin.y);
    if (movedX > TAP_MOVE_TOLERANCE_PX || movedY > TAP_MOVE_TOLERANCE_PX) {
      touchOriginRef.current = null;
      setIsUserEngaged(false);
    }
  };

  const handleTouchEnd = () => {
    touchOriginRef.current = null;
    setIsUserEngaged(false);
  };

  if (!deal || !pricing) return null;

  return (
    <button
      type="button"
      onClick={handleOpenDeal}
      aria-haspopup="dialog"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onFocus={() => setIsUserEngaged(true)}
      onBlur={() => setIsUserEngaged(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="w-full text-left relative overflow-hidden rounded-2xl border border-primary/35 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-2.5 flex items-center gap-3 shadow-[0_4px_20px] shadow-primary/12 active:scale-[0.99] transition-transform cursor-pointer"
    >
      <span className="w-11 h-11 min-w-[44px] rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-md shadow-primary/30">
        <svg className="w-5 h-5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      </span>

      {/* 🎞️ Bloque rotativo. `key={deal.id}` lo remonta en cada cambio de oferta,
          así la animación de entrada (fade + slide de 500ms) corre de cero sin
          tocar el resto de la barra: el ícono del acento, el chevron y el marco
          permanecen intactos y el layout no se desplaza. */}
      <span
        key={deal.id}
        className="promo-deal-ticker transition-all duration-500 ease-out will-change-transform flex flex-col min-w-0 flex-1"
      >
        <span className="font-mono-code text-[10px] font-bold uppercase tracking-wider text-primary">
          {t('promo.tickerLabel', { percent: Math.round(discountPercent) })}
        </span>
        <span className="text-[13px] font-semibold text-[#0f172a] dark:text-white truncate">
          {deal.name}
        </span>
        <span className="flex items-center gap-2 font-mono-code text-[11px] pt-0.5">
          <span className="text-primary font-bold">{formatSoles(pricing.promoPrice)}</span>
          <span className="text-[#64748b] dark:text-[#71717a] line-through">
            {formatSoles(pricing.originalPrice)}
          </span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
            {t('promo.savingsInline', { amount: formatSoles(pricing.savings) })}
          </span>
        </span>
      </span>

      <span className="material-symbols-outlined text-primary text-[22px] shrink-0">chevron_right</span>
    </button>
  );
});
