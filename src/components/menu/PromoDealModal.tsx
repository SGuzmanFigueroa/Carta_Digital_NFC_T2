'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock, Star, TrendingUp, X, Zap } from 'lucide-react';
import type { MenuItem } from '@/types';
import { buildPromoSubtitleText, calculatePromoPricing, formatPromoCountdown, formatSoles } from '@/utils/promo';
import type { PromoPricing, PromoSubtitleTextInput } from '@/utils/promo';
import { getPromoMechanic } from '@/utils/promoOffers';

interface PromoDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Platos reales promocionados: uno por cada punto del carrusel inferior. */
  deals: MenuItem[];
  /** Porcentaje de descuento aplicado a cada plato (por defecto 15%). */
  discountPercent?: number;
  /**
   * Montos exactos ya calculados por el motor de ofertas (`promo.ts`). Cuando se
   * envían, el pop-up respeta el precio original total, el precio final y el
   * ahorro reales del pack (2x1 = 2 unidades, combo = ambos platos) en lugar de
   * re-derivarlos del precio del plato.
   */
  pricingOverride?: PromoPricing | null;
  /**
   * Contexto de la mecánica para redactar el subtítulo honesto bajo "¡Oferta
   * Especial!": el Plato 1, el complemento y el valor pactado. Cada mecánica
   * genera un mensaje distinto (el 2x1 nunca menciona un porcentaje). Sin este
   * contexto el pop-up usa el copy estándar de descuento sobre el plato.
   */
  promoCopy?: PromoSubtitleTextInput | null;
  /**
   * URL real de la foto del Plato Complementario (2ª unidad / maridaje). Cuando
   * llega, la cabecera del pop-up se vuelve un carrusel deslizable con la foto
   * del Plato 1 y la del Plato 2; si falta, se mantiene la imagen estática.
   */
  complementDishImage?: string | null;
  /** Duración de la cuenta regresiva en segundos (755 = "12:35"). */
  countdownSeconds?: number;
  /** Confirma la oferta: entrega el plato real y su precio promocional ya calculado. */
  onApply: (dish: MenuItem, promoPrice: number) => void;
}

/** Handlers de mouse que emulan el gesto de swipe sobre un riel `overflow-x-auto`. */
interface DraggableScrollHandlers {
  onMouseDown: React.MouseEventHandler<HTMLDivElement>;
  onMouseMove: React.MouseEventHandler<HTMLDivElement>;
  onMouseUp: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave: React.MouseEventHandler<HTMLDivElement>;
}

/**
 * Drag-to-scroll para escritorio: manteniendo el mouse presionado sobre el riel
 * y moviéndolo en horizontal, las fotos se desplazan igual que con el dedo en
 * móvil. Sin librerías externas: sólo eventos nativos de React + DOM.
 *
 * Decisiones de UX:
 * - `startX` / `scrollLeft` viven en un `ref` (no en estado) para NO
 *   re-renderizar en cada `mousemove`; el estado sólo cambia al empezar y al
 *   terminar el arrastre (cursor "agarrando" + snap desactivado).
 * - Mientras se arrastra se quita el `scroll-snap` (`snap-none`) porque el
 *   `mandatory` "tiraría" de la foto de vuelta en cada actualización; al soltar
 *   se reactiva y se remata con un `scrollTo` suave al slide más cercano, así la
 *   foto siempre queda centrada y nunca a medias.
 * - En táctil no se interviene: el navegador conserva el swipe nativo.
 * - Un arrastre deja un `click` "fantasma" en el ancestro común de mousedown y
 *   mouseup: se anula sólo durante 150 ms (fase de captura) para que soltar el
 *   mouse fuera de la tarjeta no cierre el pop-up, sin bloquear clics legítimos.
 */
function useDraggableScroll(enabled: boolean): {
  railRef: React.RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  dragHandlers: DraggableScrollHandlers;
} {
  const railRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDown: false, startX: 0, startScrollLeft: 0, moved: false });
  const [isDragging, setIsDragging] = useState(false);
  // Un arrastre deja un `click` "fantasma" en el ancestro común de mousedown y
  // mouseup: si ese ancestro es el fondo del modal, la oferta se cerraría sola.
  const suppressClickRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const suppressGhostClick = (event: MouseEvent) => {
      if (!suppressClickRef.current) return;

      event.stopPropagation();
      event.preventDefault();
    };

    // Fase de captura: gana la partida a los handlers de React del fondo.
    window.addEventListener('click', suppressGhostClick, true);

    return () => {
      window.removeEventListener('click', suppressGhostClick, true);
      if (suppressTimerRef.current !== null) window.clearTimeout(suppressTimerRef.current);
    };
  }, []);

  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (event) => {
    const node = railRef.current;
    if (!enabled || !node || event.button !== 0) return; // sólo botón principal

    event.preventDefault(); // sin selección de texto ni drag nativo de la foto
    dragState.current = {
      isDown: true,
      startX: event.clientX,
      startScrollLeft: node.scrollLeft,
      moved: false
    };
    setIsDragging(true);
  };

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    const node = railRef.current;
    if (!node || !dragState.current.isDown) return;

    const distance = event.clientX - dragState.current.startX;
    if (Math.abs(distance) > 3) dragState.current.moved = true;

    // La imagen sigue al cursor: más scroll a la izquierda = mover la foto a la derecha.
    node.scrollLeft = dragState.current.startScrollLeft - distance;
  };

  const handleDragEnd: React.MouseEventHandler<HTMLDivElement> = () => {
    const node = railRef.current;
    if (!node || !dragState.current.isDown) return;

    const { moved } = dragState.current;
    dragState.current.isDown = false;
    setIsDragging(false);

    if (!moved) return; // fue un clic normal: se respeta tal cual

    // Anula el clic que dispara el navegador al soltar tras arrastrar (una sola
    // vez y sólo durante un instante, para no bloquear clics legítimos después).
    suppressClickRef.current = true;
    if (suppressTimerRef.current !== null) window.clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 150);

    // Remate: la foto más cercana se centra con una animación suave.
    if (node.clientWidth > 0) {
      node.scrollTo({
        left: Math.round(node.scrollLeft / node.clientWidth) * node.clientWidth,
        behavior: 'smooth'
      });
    }
  };

  return {
    railRef,
    isDragging,
    dragHandlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleDragEnd,
      onMouseLeave: handleDragEnd
    }
  };
}

/**
 * Galería de la cabecera del pop-up: imagen estática o carrusel deslizable.
 *
 * El swipe es 100% nativo del navegador (CSS Scroll Snap de Tailwind), sin
 * librerías externas: `overflow-x-auto` + `snap-x snap-mandatory` en el riel y
 * `snap-center` en cada foto. Se oculta la barra de scroll con `no-scrollbar`.
 *
 * El componente NO se posiciona ni lleva z-index: vive en el flujo normal del
 * contenedor `relative` de la cabecera, de modo que los overlays flotantes que
 * vienen después en el DOM (badge "FLASH DEAL", temporizador y botón "X" con
 * z-20) quedan siempre ENCIMA: las fotos se deslizan por debajo y el clic de la
 * "X" nunca queda bloqueado por el riel.
 *
 * El estado local (dot activo) vive aquí para que el swipe no re-renderice el
 * resto del modal; el padre lo remonta con `key={deal.id}` al cambiar de oferta.
 */
interface PromoPhotoGalleryProps {
  /** 1 foto (Descuento %/$ y 2x1 Flash) o 2 (2da Unidad % y Combo / Maridaje). */
  images: string[];
  /** Texto alternativo de cada foto (mismo orden que `images`). */
  altTexts: string[];
  /** Etiqueta accesible del grupo cuando hay carrusel. */
  ariaLabel: string;
}

function PromoPhotoGallery({ images, altTexts, ariaLabel }: PromoPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const isCarousel = images.length > 1;
  // Arrastre con mouse en escritorio: emula el swipe táctil del móvil.
  const { railRef, isDragging, dragHandlers } = useDraggableScroll(isCarousel);

  /** Enciende el dot de la foto visible (cálculo puro sobre el scroll nativo). */
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    if (!node.clientWidth) return;

    const nextIndex = Math.round(node.scrollLeft / node.clientWidth);
    setActiveIndex((previous) => (previous === nextIndex ? previous : nextIndex));
  };

  return (
    <>
      <div
        ref={railRef}
        {...dragHandlers}
        onScroll={isCarousel ? handleScroll : undefined}
        role={isCarousel ? 'group' : undefined}
        aria-label={isCarousel ? ariaLabel : undefined}
        className={[
          'flex h-full w-full select-none',
          isCarousel
            ? 'overflow-x-auto overscroll-x-contain no-scrollbar'
            : 'overflow-hidden',
          // El snap se apaga mientras se arrastra con el mouse para que la foto
          // no salte de vuelta; al soltar se reactiva y se remata centrada.
          isCarousel ? (isDragging ? 'snap-none cursor-grabbing' : 'snap-x snap-mandatory cursor-grab') : ''
        ].join(' ')}
      >
        {images.map((image, index) => (
          <div
            key={`${image}-${index}`}
            className="h-full w-full min-w-full shrink-0 basis-full snap-center snap-always"
          >
            <img
              src={image}
              alt={altTexts[index] ?? altTexts[0] ?? ''}
              draggable={false}
              className="h-full w-full object-cover select-none"
            />
          </div>
        ))}
      </div>

      {/* Dots de la GALERÍA: centrados y por encima del temporizador (que ocupa
          el centro del borde inferior). Son "puedes deslizar" y no la paginación
          de ofertas del pie. Decorativos y sin eventos: no bloquean el swipe con
          el dedo ni el arrastre con el mouse, tampoco el clic de la "X". */}
      {isCarousel && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-6 left-0 right-0 z-10 flex items-center justify-center gap-2"
        >
          {images.map((image, index) => (
            <span
              key={`gallery-dot-${image}-${index}`}
              className={`h-1.5 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.35)] dark:shadow-[0_0_0_1px_rgba(0,0,0,0.4)] transition-all duration-200 ${
                index === activeIndex
                  ? 'w-4 bg-[#ff5708] opacity-100'
                  : 'w-1.5 bg-[#0f172a]/35 opacity-60 dark:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * CD-16 · Pop-up promocional "Oferta Flash" de la Carta Digital.
 *
 * Replica el diseño premium de referencia (backdrop desenfocado, tarjeta
 * redondeada, badge FLASH DEAL, cuenta regresiva, precio con ahorro real y CTA
 * naranja) pero alimentado 100% con platos reales del menú: nombre, rating,
 * reseñas, descripción y precio se calculan dinámicamente.
 *
 * CD-13 · Tema Claro/Oscuro nativo: el modo claro es la base (tarjeta blanca,
 * overlay gris translúcido y textos oscuros/grises) y el modo Obsidian previo
 * se conserva al 100% mediante la variante `dark:` (clase `.dark` en <html>).
 * Solo cambian colores: maquetación, blur, opacidades y radios quedan intactos.
 *
 * Mobile-first: se cierra con la "X" (44px), tocando el fondo o con la tecla Esc.
 */
export function PromoDealModal({
  isOpen,
  onClose,
  deals,
  discountPercent = 15,
  pricingOverride = null,
  promoCopy = null,
  complementDishImage = null,
  countdownSeconds = 755,
  onApply
}: PromoDealModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(countdownSeconds);
  const [wasOpen, setWasOpen] = useState(isOpen);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Al abrirse, reinicia el carrusel y la cuenta regresiva usando el patrón
  // oficial de React (ajustar estado durante el render, no dentro de un efecto).
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setActiveIndex(0);
      setRemainingSeconds(countdownSeconds);
    }
  }

  // Solo ofertas válidas: evita renderizar tarjetas sin datos reales.
  const validDeals = useMemo(
    () => (Array.isArray(deals) ? deals.filter((deal): deal is MenuItem => Boolean(deal && deal.id)) : []),
    [deals]
  );

  const totalDeals = validDeals.length;
  const currentIndex = totalDeals > 0 ? Math.min(activeIndex, totalDeals - 1) : 0;
  const deal = totalDeals > 0 ? validDeals[currentIndex] : null;
  // Montos del motor de ofertas (2x1, 2da unidad y combos) o, en su defecto, los
  // derivados del precio del plato y el porcentaje de descuento.
  const pricing = deal ? pricingOverride ?? calculatePromoPricing(deal.price, discountPercent) : null;

  // 📣 Subtítulo bajo "¡OFERTA ESPECIAL!": se redacta según la MECÁNICA para que el
  // comensal entienda a qué plato aplica el descuento (el 2x1 nunca menciona un %).
  // Sin contexto de oferta (carta viva) cae al copy estándar de descuento.
  const subtitleText = deal
    ? buildPromoSubtitleText(
        promoCopy ?? {
          mechanic: 'discount',
          mainDishName: deal.name,
          discountLabel: `${Math.round(pricing?.discountPercent ?? discountPercent)}%`,
          complementDishName: null
        }
      )
    : '';

  // 🖼️ Galería de la cabecera: 2 fotos sólo cuando la mecánica usa un SEGUNDO
  // plato DISTINTO ("2da Unidad %" y "Combo / Maridaje"). "Descuento %/$" y
  // "2x1 Flash" conservan una única imagen estática (la 2ª unidad es la misma).
  const galleryImages = useMemo((): string[] => {
    if (!deal) return [];

    const needsSecondPhoto = promoCopy
      ? getPromoMechanic(promoCopy.mechanic).requiresComplement
      : false;
    const secondPhoto = needsSecondPhoto ? complementDishImage : null;

    // Nunca se repite la misma foto: evita un carrusel de 2 imágenes idénticas.
    return secondPhoto && secondPhoto !== deal.image ? [deal.image, secondPhoto] : [deal.image];
  }, [deal, promoCopy, complementDishImage]);

  // Al abrir: bloquea el scroll de fondo, habilita el cierre con Esc y lleva el
  // foco al botón de cierre (garantiza usabilidad táctil y de teclado).
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 140);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, onClose]);

  // Cuenta regresiva viva de la oferta flash ("¡TERMINA EN 12:35!").
  useEffect(() => {
    if (!isOpen) return;

    const ticker = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(ticker);
  }, [isOpen]);

  if (!isOpen || !deal || !pricing) return null;

  const isUrgent = remainingSeconds <= 60;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-deal-title"
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-slate-400/45 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-fadeIn relative w-full max-w-[384px] max-h-[92vh] flex flex-col rounded-[28px] overflow-hidden bg-white dark:bg-[#131418] border border-[#ff5708]/35 shadow-[0_25px_60px_-15px_rgba(255,87,8,0.25)] dark:shadow-[0_25px_60px_-15px_rgba(255,87,8,0.45)]"
      >
        {/* ===================================================================== */}
        {/* 🖼️ CABECERA VISUAL DEL PLATO REAL + BADGE FLASH DEAL + CIERRE         */}
        {/* ===================================================================== */}
        <div className="relative shrink-0 h-44 sm:h-48 w-full bg-[#e2e8f0] dark:bg-[#0e0e10]">
          {/* 🖼️ Galería: 1 foto estática, o 2 deslizables en "2da Unidad %" y
              "Combo / Maridaje". El `key={deal.id}` remonta el carrusel al
              cambiar de oferta (vuelve a la foto 1 y a su dot). */}
          <PromoPhotoGallery
            key={deal.id}
            images={galleryImages}
            altTexts={[
              deal.name,
              promoCopy?.complementDishName
                ? `${promoCopy.complementDishName} (segundo plato de la oferta)`
                : 'Segundo plato de la oferta'
            ]}
            ariaLabel={`Fotos de la oferta: ${deal.name}`}
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/25 to-black/45 dark:from-[#131418] dark:via-[#131418]/25 dark:to-black/45" />

          <span className="pointer-events-none absolute top-3.5 left-3.5 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ff5708] text-white text-[10px] font-black uppercase tracking-[0.08em] shadow-lg shadow-[#ff5708]/40">
            <Zap size={11} strokeWidth={3} fill="currentColor" />
            <span>Flash Deal</span>
          </span>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar oferta flash"
            className="absolute top-2.5 right-2.5 z-20 w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all cursor-pointer"
          >
            <X size={18} strokeWidth={2.8} />
          </button>

          {/* Cuenta regresiva centrada sobre el borde de la imagen */}
          <span
            className={`pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0b0c0e] border font-mono-code text-[11px] font-bold whitespace-nowrap shadow-xl ${
              isUrgent ? 'border-rose-500/60 text-rose-300' : 'border-[#ff5708]/45 text-[#ffb59c]'
            }`}
          >
            <Clock size={12} strokeWidth={2.8} className={isUrgent ? 'text-rose-400' : 'text-[#ff5708]'} />
            <span>¡Termina en {formatPromoCountdown(remainingSeconds)}!</span>
          </span>
        </div>

        {/* ===================================================================== */}
        {/* 📝 CUERPO: TÍTULO, DESCUENTO REAL DEL PLATO, PRECIO Y CTA             */}
        {/* ===================================================================== */}
        <div className="relative z-10 flex-1 px-5 pt-7 pb-6 text-center space-y-3.5 overflow-y-auto overscroll-contain no-scrollbar">
          <div className="space-y-2">
            <h2
              id="promo-deal-title"
              className="text-[22px] sm:text-[24px] leading-none font-black text-[#0f172a] dark:text-white uppercase tracking-tight"
            >
              ¡Oferta Especial!
            </h2>

            <p className="text-[12px] sm:text-[12.5px] font-black text-[#475569] dark:text-[#e5e1e4] uppercase leading-snug">
              {subtitleText}
            </p>

            <p className="inline-flex items-center justify-center gap-1.5 text-[11.5px] font-mono-code text-[#64748b] dark:text-[#a1a1aa]">
              <Star size={12} strokeWidth={2.6} className="text-amber-400" fill="currentColor" />
              <span className="text-[#0f172a] dark:text-[#e5e1e4] font-bold">{deal.rating.toFixed(1)}</span>
              <span>({deal.reviewsCount} valoraciones)</span>
            </p>
          </div>

          {/* Precio promocional y ahorro calculados desde el precio real del menú */}
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5">
            <span className="font-mono-code text-[30px] leading-none font-black text-[#ff5708]">
              {formatSoles(pricing.promoPrice)}
            </span>
            <span className="font-mono-code text-[14px] leading-none text-[#64748b] dark:text-[#71717a] line-through">
              {formatSoles(pricing.originalPrice)}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 dark:text-emerald-400 text-[10.5px] font-black uppercase tracking-wide">
              <TrendingUp size={11} strokeWidth={3} />
              <span>Ahorra {formatSoles(pricing.savings)}</span>
            </span>
          </div>

          <p className="text-[12.5px] text-[#64748b] dark:text-[#a1a1aa] leading-relaxed">{deal.description}</p>

          <button
            type="button"
            onClick={() => onApply(deal, pricing.promoPrice)}
            className="w-full h-12 min-h-[48px] rounded-2xl bg-[#ff5708] hover:bg-[#ff6924] text-white font-black text-[13.5px] uppercase tracking-[0.04em] flex items-center justify-center gap-2 shadow-[0_10px_30px_-8px_rgba(255,87,8,0.75)] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Aplicar Descuento</span>
            <ArrowRight size={17} strokeWidth={3} />
          </button>

          {/* Carrusel de ofertas reales (puntos + contador) */}
          {totalDeals > 1 && (
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-center gap-0.5">
                {validDeals.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Ver oferta ${index + 1} de ${totalDeals}: ${item.name}`}
                    aria-current={index === currentIndex}
                    className="group flex h-9 w-7 items-center justify-center cursor-pointer"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-all ${
                        index === currentIndex ? 'w-5 bg-[#ff5708]' : 'w-1.5 bg-[#0f172a]/15 group-hover:bg-[#0f172a]/30 dark:bg-white/25 dark:group-hover:bg-white/50'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="font-mono-code text-[10.5px] text-[#64748b] dark:text-[#71717a]">
                ({currentIndex + 1} de {totalDeals} ofertas)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
