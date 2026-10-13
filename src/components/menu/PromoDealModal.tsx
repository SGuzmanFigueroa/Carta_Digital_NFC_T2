'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock, Star, TrendingUp, X, Zap } from 'lucide-react';
import type { MenuItem } from '@/types';
import { calculatePromoPricing, formatPromoCountdown, formatSoles } from '@/utils/promo';
import type { PromoPricing, PromoSubtitleTextInput } from '@/utils/promo';
import { getPromoMechanic } from '@/utils/promoOffers';
import { buildMenuPromoSubtitle, buildPromoSecondDishAltText } from '@/i18n/menuContent';
import { useLanguage } from '@/hooks/useLanguage';

interface PromoDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Platos reales promocionados: una tarjeta por cada punto del carrusel inferior. */
  deals: MenuItem[];
  /**
   * Oferta que debe quedar centrada al abrir: el `id` del plato que el comensal
   * tenía delante en la tira "Oferta Flash" de la carta. Si falta (o esa oferta ya
   * no existe), el carrusel arranca en la primera.
   */
  initialDealId?: string | null;
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
 * y moviéndolo en horizontal, las tarjetas se desplazan igual que con el dedo en
 * móvil. Sin librerías externas: sólo eventos nativos de React + DOM.
 *
 * El mismo hook alimenta el carrusel de OFERTAS (riel principal del pop-up) y la
 * galería de FOTOS de cada tarjeta (mecánicas "2da Unidad %" y "Combo").
 *
 * Decisiones de UX:
 * - `startX` / `scrollLeft` viven en un `ref` (no en estado) para NO
 *   re-renderizar en cada `mousemove`; el estado sólo cambia al empezar y al
 *   terminar el arrastre (cursor "agarrando" + snap desactivado).
 * - Mientras se arrastra se quita el `scroll-snap` (`snap-none`) porque el
 *   `mandatory` "tiraría" de la tarjeta de vuelta en cada actualización; al soltar
 *   se reactiva y se remata con un `scrollTo` suave al slide más cercano, así la
 *   tarjeta siempre queda centrada y nunca a medias.
 * - Si el gesto nace dentro de OTRO riel horizontal desplazable (la galería de
 *   fotos de la tarjeta, marcada con `data-horizontal-rail`) se le cede el
 *   control: dos carruseles anidados nunca compiten por el mismo arrastre.
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

    // Riel anidado (galería de fotos de la tarjeta): si ESE riel puede
    // desplazarse, el gesto es suyo y el carrusel de ofertas se hace a un lado.
    // Con una sola foto el riel interno no scrollea y el arrastre sube aquí.
    const origin = event.target instanceof Element ? event.target : null;
    const nestedRail = origin?.closest<HTMLElement>('[data-horizontal-rail]') ?? null;
    if (nestedRail && nestedRail !== node && nestedRail.scrollWidth > nestedRail.clientWidth + 1) return;

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

    // La tarjeta sigue al cursor: más scroll a la izquierda = mover a la derecha.
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

    // Remate: la tarjeta más cercana se centra con una animación suave.
    if (node.clientWidth > 0) {
      node.scrollTo({
        left: Math.round(node.scrollLeft / node.clientWidth) * node.clientWidth,
        top: node.scrollTop, // el riel también puede scrollear en vertical: no se pierde
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
 * Galería de la cabecera de una tarjeta: imagen estática o carrusel deslizable.
 *
 * El swipe es 100% nativo del navegador (CSS Scroll Snap de Tailwind), sin
 * librerías externas: `overflow-x-auto` + `snap-x snap-mandatory` en el riel y
 * `snap-center` en cada foto. Se oculta la barra de scroll con `no-scrollbar`.
 * Se marca con `data-horizontal-rail` para que el carrusel de OFERTAS le ceda el
 * arrastre con el mouse cuando esta galería sí puede desplazarse (2 fotos).
 *
 * El componente NO se posiciona ni lleva z-index: vive en el flujo normal del
 * contenedor `relative` de la cabecera. El badge "FLASH DEAL", la cuenta
 * regresiva y el botón "X" viven en el marco del pop-up, por ENCIMA del riel de
 * ofertas: las fotos se deslizan por debajo y el clic de la "X" nunca queda
 * bloqueado.
 *
 * El estado local (dot activo) vive aquí para que el swipe no re-renderice el
 * resto del carrusel; el padre lo remonta con `key={deal.id}` al cambiar de oferta.
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
        data-horizontal-rail=""
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
                  ? 'w-4 bg-primary opacity-100'
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
 * Cuenta regresiva "¡TERMINA EN 12:35!" de la oferta flash.
 *
 * Aísla el tick de 1 segundo en este componente: el carrusel (y sus tarjetas
 * memoizadas) NO se vuelven a renderizar por el temporizador, así el swipe queda
 * libre de tirones. Se ancla al borde inferior de la foto de SU tarjeta, de modo
 * que el temporizador siempre pertenece a la oferta que se está viendo.
 */
const PromoFlashCountdown = React.memo(function PromoFlashCountdown({ seconds }: { seconds: number }) {
  // CD-31 · Cuenta regresiva localizada (ES/EN) sin dejar de ser un tick aislado.
  const { t } = useLanguage();
  // Arranca con la duración de la oferta. Si el pop-up cambiara de duración, el
  // `key={countdownSeconds}` del padre remonta este temporizador (sin efectos).
  const [remainingSeconds, setRemainingSeconds] = useState(seconds);

  useEffect(() => {
    const ticker = window.setInterval(() => {
      setRemainingSeconds((previous) => (previous <= 1 ? 0 : previous - 1));
    }, 1000);

    return () => window.clearInterval(ticker);
  }, []);

  const isUrgent = remainingSeconds <= 60;

  return (
    <span
      className={`pointer-events-none absolute bottom-2 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 font-mono-code text-[12px] font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
        isUrgent ? 'text-rose-400' : 'text-primary'
      }`}
    >
      <Clock size={13} strokeWidth={2.8} className={isUrgent ? 'text-rose-400' : 'text-primary'} />
      <span>{t('promo.endsIn', { time: formatPromoCountdown(remainingSeconds) })}</span>
    </span>
  );
});

/**
 * Modelo precalculado de una tarjeta del carrusel de ofertas.
 *
 * Se memoiza en el padre para que el deslizamiento (que actualiza el índice
 * activo varias veces por gesto) NO entregue props nuevas: las tarjetas no se
 * vuelven a renderizar y el swipe se siente fluido, sin tirones.
 */
interface PromoDealSlideModel {
  /** Plato real promocionado en esta tarjeta. */
  deal: MenuItem;
  /** Montos reales de la oferta (motor de ofertas `promo.ts`). */
  pricing: PromoPricing;
  /** Subtítulo honesto bajo "¡Oferta Especial!" según la mecánica. */
  subtitleText: string;
  /** 1 foto (Descuento %/$ y 2x1 Flash) o 2 (2da Unidad % y Combo / Maridaje). */
  images: string[];
  /** Texto alternativo de cada foto (mismo orden que `images`). */
  altTexts: string[];
  /** `id` único del <h2>: el diálogo toma su nombre de la tarjeta visible. */
  titleId: string;
  /** Etiqueta accesible de la tarjeta: "Oferta 2 de 3: Lomo Saltado". */
  positionLabel: string;
  /** Duración inicial de la cuenta regresiva de la oferta (755 = "12:35"). */
  countdownSeconds: number;
}

/**
 * Una tarjeta de oferta dentro del riel horizontal: cabecera con la foto real
 * del plato y cuerpo con el nombre de la mecánica, rating, precio promocional,
 * ahorro y reseñas.
 *
 * El ✕ y el CTA "Aplicar Descuento" viven en el MARCO del pop-up (fuera del
 * riel), así permanecen fijos y accesibles para cada tarjeta mientras el comensal
 * desliza de una oferta a otra. La cuenta regresiva, en cambio, se ancla al borde
 * inferior de la foto de SU tarjeta, de modo que viaja con la oferta.
 *
 * `React.memo`: sus props provienen de un modelo memoizado, así el swipe no
 * re-renderiza las tarjetas. El tick del temporizador queda aislado dentro de
 * `PromoFlashCountdown`, así que tampoco escala al carrusel.
 */
const PromoDealSlide = React.memo(function PromoDealSlide({
  deal,
  pricing,
  subtitleText,
  images,
  altTexts,
  titleId,
  positionLabel,
  countdownSeconds
}: PromoDealSlideModel) {
  // CD-31 · Copy de cada tarjeta (título, reseñas y ahorro) en el idioma activo.
  const { t } = useLanguage();
  return (
    <div
      role="group"
      aria-roledescription={t('promo.roledescription')}
      aria-label={positionLabel}
      className="flex w-full min-w-full shrink-0 basis-full snap-center snap-always flex-col bg-white dark:bg-[#131418]"
    >
      {/* ===================================================================== */}
      {/* 🖼️ CABECERA VISUAL DEL PLATO REAL DE ESTA OFERTA                      */}
      {/* ===================================================================== */}
      <div className="relative shrink-0 h-44 sm:h-48 w-full bg-[#e2e8f0] dark:bg-[#0e0e10]">
        {/* 🖼️ Galería: 1 foto estática, o 2 deslizables en "2da Unidad %" y
            "Combo / Maridaje". El `key={deal.id}` remonta el carrusel al
            cambiar de oferta (vuelve a la foto 1 y a su dot). */}
        <PromoPhotoGallery
          key={deal.id}
          images={images}
          altTexts={altTexts}
          ariaLabel={t('promo.photosAria', { dish: deal.name })}
        />

        

        {/* ⏱️ Cuenta regresiva del flash deal, anclada al borde inferior de SU foto */}
        <PromoFlashCountdown key={countdownSeconds} seconds={countdownSeconds} />
      </div>

      {/* ===================================================================== */}
      {/* 📝 CUERPO: TÍTULO, DESCUENTO REAL DEL PLATO, PRECIO Y RESEÑAS          */}
      {/* ===================================================================== */}
      <div className="relative z-10 flex-1 px-5 pt-7 pb-6 text-center space-y-3.5">
        <div className="space-y-2">
          <h2
            id={titleId}
            className="text-[22px] sm:text-[24px] leading-none font-black text-[#0f172a] dark:text-white uppercase tracking-tight"
          >
            {t('promo.specialOffer')}
          </h2>

          <p className="text-[12px] sm:text-[12.5px] font-black text-[#475569] dark:text-[#e5e1e4] uppercase leading-snug">
            {subtitleText}
          </p>

          <p className="inline-flex items-center justify-center gap-1.5 text-[11.5px] font-mono-code text-[#64748b] dark:text-[#a1a1aa]">
            <Star size={12} strokeWidth={2.6} className="text-amber-400" fill="currentColor" />
            <span className="text-[#0f172a] dark:text-[#e5e1e4] font-bold">{deal.rating.toFixed(1)}</span>
            <span>{t('dish.ratingsCount', { count: deal.reviewsCount })}</span>
          </p>
        </div>

        {/* Precio promocional y ahorro calculados desde el precio real del menú */}
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5">
          <span className="font-mono-code text-[30px] leading-none font-black text-primary">
            {formatSoles(pricing.promoPrice)}
          </span>
          <span className="font-mono-code text-[14px] leading-none text-[#64748b] dark:text-[#71717a] line-through">
            {formatSoles(pricing.originalPrice)}
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono-code text-[12px] font-bold">
            <TrendingUp size={13} strokeWidth={2.8} />
            <span>{t('promo.savings', { amount: formatSoles(pricing.savings) })}</span>
          </span>
        </div>

        <p className="text-[12.5px] text-[#64748b] dark:text-[#a1a1aa] leading-relaxed">{deal.description}</p>
      </div>
    </div>
  );
});

/**
 * CD-16 · Pop-up promocional "Oferta Flash" de la Carta Digital.
 *
 * Replica el diseño premium de referencia (backdrop desenfocado, tarjeta
 * redondeada, badge FLASH DEAL, cuenta regresiva, precio con ahorro real y CTA
 * del acento) pero alimentado 100% con platos reales del menú: nombre, rating,
 * reseñas, descripción y precio se calculan dinámicamente.
 *
 * 🎠 CARRUSEL DE OFERTAS: todas las ofertas activas se pintan en un riel
 * horizontal (`flex` + `overflow-x-auto` + `snap-x snap-mandatory`, con la barra
 * de scroll oculta) donde cada tarjeta ocupa el ancho completo (`shrink-0 w-full`
 * + `snap-center`). El comensal cambia de oferta deslizando el dedo en cualquier
 * punto del cuerpo del pop-up (swipe táctil nativo) o arrastrando con el mouse
 * en PC (drag-to-scroll). Los dots y el contador "(1 de 3 ofertas)" se
 * sincronizan en tiempo real con la posición del scroll (`onScroll`).
 *
 * El ✕ y el CTA "Aplicar Descuento" viven FUERA del riel, anclados al marco de
 * la tarjeta: siguen accesibles (44px) y en el mismo sitio mientras se desliza.
 *
 * CD-13 · Tema Claro/Oscuro nativo: el modo claro es la base (tarjeta blanca,
 * overlay gris translúcido y textos oscuros/grises) y el modo Obsidian previo
 * se conserva al 100% mediante la variante `dark:` (clase `.dark` en <html>).
 * Solo cambian colores: maquetación, blur, opacidades y radios quedan intactos.
 *
 * Mobile-first: se cierra con la "X" (44px), tocando el fondo, con la tecla Esc
 * o con las flechas ←/→ para pasar de oferta.
 */
export function PromoDealModal({
  isOpen,
  onClose,
  deals,
  initialDealId = null,
  discountPercent = 15,
  pricingOverride = null,
  promoCopy = null,
  complementDishImage = null,
  countdownSeconds = 755,
  onApply
}: PromoDealModalProps) {
  // CD-31 · Idioma de la carta: las tarjetas y su copy se recalculan al cambiarlo.
  const { language, t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [wasOpen, setWasOpen] = useState(isOpen);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Solo ofertas válidas: evita renderizar tarjetas sin datos reales.
  const validDeals = useMemo(
    () => (Array.isArray(deals) ? deals.filter((deal): deal is MenuItem => Boolean(deal && deal.id)) : []),
    [deals]
  );

  const totalDeals = validDeals.length;

  /**
   * Oferta en la que debe abrirse el carrusel: la que el comensal tenía delante
   * en la tira "Oferta Flash" (`initialDealId`) o la primera si falta o ya no
   * existe. Es función pura de las props: no necesita estado ni efectos.
   */
  const requestedIndex = useMemo(() => {
    if (!initialDealId) return 0;
    const found = validDeals.findIndex((deal) => deal.id === initialDealId);
    return found >= 0 ? found : 0;
  }, [initialDealId, validDeals]);

  // Al abrirse, el carrusel se posiciona en la oferta solicitada con el patrón
  // oficial de React (ajustar estado durante el render, no dentro de un efecto).
  // La cuenta regresiva se reinicia sola: cada tarjeta monta su temporizador al
  // abrirse.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setActiveIndex(requestedIndex);
    }
  }

  const currentIndex = totalDeals > 0 ? Math.min(activeIndex, totalDeals - 1) : 0;

  // 🧾 Tarjetas del carrusel: precio real, subtítulo por mecánica y fotos se
  // calculan UNA vez por juego de ofertas, no en cada frame del deslizamiento.
  const slideModels = useMemo<PromoDealSlideModel[]>(() => {
    // El copy y los montos que envía el motor de ofertas describen UNA oferta
    // concreta (vista previa del panel admin): solo se aplican cuando el carrusel
    // tiene una única tarjeta. Con varias ofertas, cada tarjeta redacta su propio
    // subtítulo con SU plato y su % real, para que el swipe muestre información
    // distinta y honesta en cada punto.
    const isSingleOffer = validDeals.length <= 1;
    const offerCopy = isSingleOffer ? promoCopy : null;
    const offerPricing = isSingleOffer ? pricingOverride : null;
    const complementImage = isSingleOffer ? complementDishImage : null;
    // 📣 El subtítulo se redacta según la MECÁNICA para que el comensal entienda
    // a qué plato aplica el descuento (el 2x1 nunca menciona un %). Sin contexto
    // de oferta (carta viva) cae al copy estándar de descuento.
    const needsSecondPhoto = offerCopy
      ? getPromoMechanic(offerCopy.mechanic).requiresComplement
      : false;

    return validDeals.map((item, index) => {
      const itemDiscount = (item as any)?.promoDiscountPercent ?? discountPercent;
      const itemPricing = (item as any)?.promoPriceCustom && (item as any)?.promoOriginalPriceCustom
        ? {
            originalPrice: (item as any).promoOriginalPriceCustom,
            promoPrice: (item as any).promoPriceCustom,
            savings: (item as any).promoOriginalPriceCustom - (item as any).promoPriceCustom,
            discountPercent: itemDiscount
          }
        : (offerPricing ?? calculatePromoPricing(item.price, itemDiscount));
      const subtitleText = buildMenuPromoSubtitle(
        offerCopy ?? {
          mechanic: 'discount',
          mainDishName: item.name,
          discountLabel: `${Math.round(itemPricing.discountPercent)}%`,
          complementDishName: null
        },
        language
      );

      // 🖼️ Galería de la cabecera: 2 fotos sólo cuando la mecánica usa un SEGUNDO
      // plato DISTINTO ("2da Unidad %" y "Combo / Maridaje"). "Descuento %/$" y
      // "2x1 Flash" conservan una única imagen (la 2ª unidad es la misma).
      const secondPhoto = needsSecondPhoto ? complementImage : null;
      // Nunca se repite la misma foto: evita un carrusel de 2 imágenes idénticas.
      const images = secondPhoto && secondPhoto !== item.image ? [item.image, secondPhoto] : [item.image];

      return {
        deal: item,
        pricing: itemPricing,
        subtitleText,
        images,
        altTexts: [
          item.name,
          buildPromoSecondDishAltText(offerCopy?.complementDishName, language)
        ],
        titleId: `promo-deal-title-${item.id}`,
        positionLabel: t('promo.offerPosition', {
          index: index + 1,
          total: validDeals.length,
          dish: item.name
        }),
        countdownSeconds
      };
    });
  }, [
    validDeals,
    pricingOverride,
    promoCopy,
    complementDishImage,
    discountPercent,
    countdownSeconds,
    language,
    t
  ]);

  /** Tarjeta centrada AHORA: gobierna el CTA del pie y el título del diálogo. */
  const currentSlide: PromoDealSlideModel | null =
    totalDeals > 0 ? slideModels[currentIndex] ?? null : null;

  // 🎠 Riel de ofertas: swipe táctil nativo (móvil) + arrastre con mouse (PC).
  const { railRef, isDragging, dragHandlers } = useDraggableScroll(totalDeals > 1);

  // 📌 Al abrir el pop-up desde la tira "Oferta Flash", el riel arranca YA
  // posicionado en la oferta que el comensal tenía delante: el salto va sin
  // animación porque es el estado inicial, no un swipe. Solo toca el DOM (nada de
  // setState), así que no provoca renders en cascada; los cambios posteriores de
  // oferta siguen gobernados por el swipe, los dots y las flechas.
  useEffect(() => {
    if (!isOpen || requestedIndex <= 0) return;

    const node = railRef.current;
    if (!node || node.clientWidth <= 0) return;

    node.scrollTo({ left: requestedIndex * node.clientWidth, behavior: 'auto' });
  }, [isOpen, requestedIndex, railRef]);

  /** Lleva el carrusel a una oferta concreta (dots, teclado o atajos). */
  const goToOffer = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(index, totalDeals - 1));
      setActiveIndex(target); // respuesta inmediata en dots y contador
      const node = railRef.current;
      if (node && node.clientWidth > 0) {
        node.scrollTo({ left: target * node.clientWidth, behavior: 'smooth' });
      }
    },
    [totalDeals, railRef]
  );

  /** Avanza/retrocede una tarjeta leyendo la posición REAL del scroll. */
  const stepOffer = useCallback(
    (delta: number) => {
      const node = railRef.current;
      if (!node || node.clientWidth <= 0) return;

      goToOffer(Math.round(node.scrollLeft / node.clientWidth) + delta);
    },
    [goToOffer, railRef]
  );

  /**
   * Sincroniza dots + contador con la posición del scroll: funciona igual con el
   * swipe táctil, con el arrastre de mouse y con el remate animado del snap.
   * Sólo re-renderiza el marco (las tarjetas están memoizadas).
   */
  const handleRailScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    if (!node.clientWidth) return;

    const nextIndex = Math.max(0, Math.min(Math.round(node.scrollLeft / node.clientWidth), totalDeals - 1));
    setActiveIndex((previous) => (previous === nextIndex ? previous : nextIndex));
  };

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

  // ⌨️ Flechas ←/→: pasan de oferta sin soltar el teclado. Efecto independiente
  // del de apertura para que cambiar de oferta no vuelva a robar el foco al ✕.
  useEffect(() => {
    if (!isOpen || totalDeals <= 1) return;

    const handleArrowKeys = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

      event.preventDefault();
      stepOffer(event.key === 'ArrowRight' ? 1 : -1);
    };

    window.addEventListener('keydown', handleArrowKeys);
    return () => window.removeEventListener('keydown', handleArrowKeys);
  }, [isOpen, totalDeals, stepOffer]);

  if (!isOpen || !currentSlide) return null;

  const { deal, pricing, titleId } = currentSlide;

  // 🎠 Clases del riel: `flex` + `overflow-x-auto` (deslizamiento nativo) +
  // `snap-x snap-mandatory` (la tarjeta siempre queda centrada) + `no-scrollbar`
  // (la barra se oculta: la paginación del pie ya indica la página). Mientras se
  // arrastra con el mouse el snap se apaga para que no salte de vuelta, y el
  // `overflow-y-auto` interno evita que el pop-up se recorte en móviles bajos.
  const railClassName = [
    'relative z-0 flex w-full min-h-0 flex-1 overflow-auto overscroll-contain no-scrollbar',
    totalDeals > 1 ? 'select-none' : '',
    totalDeals > 1 ? (isDragging ? 'snap-none cursor-grabbing' : 'snap-x snap-mandatory cursor-grab') : ''
  ].join(' ');

  // El pop-up se pinta SIEMPRE (320px → escritorio): `fixed inset-0` + `flex`
  // universales, sin clases de ocultamiento por breakpoint. `z-[9999]` queda por
  // encima de la top bar sticky (z-40), la barra inferior del comensal (z-40) y
  // cualquier toast/overlay móvil. `overflow-y-auto` + `my-auto` en la tarjeta:
  // si el contenido supera la pantalla, el pop-up hace scroll en lugar de
  // recortarse (clave en móvil).
  //
  // Estructura del carrusel:
  //   [ marco ] ─ chrome FIJO (badge FLASH DEAL · ✕ de cierre)
  //             ─ riel horizontal (todas las ofertas activas, una por tarjeta,
  //               cada una con su foto, su cuenta regresiva y sus datos)
  //             ─ pie FIJO (CTA "Aplicar Descuento" + dots + contador)
  // El chrome y el pie viven FUERA del riel: por eso nada se desplaza ni se
  // recorta mientras el comensal desliza de una oferta a otra.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-400/45 dark:bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain animate-fadeIn"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-fadeIn relative my-auto flex w-full max-w-[384px] max-h-[92dvh] flex-col rounded-[28px] overflow-hidden bg-white dark:bg-[#131418] border border-primary/35 shadow-[0_25px_60px_-15px] shadow-primary/25 dark:shadow-[0_25px_60px_-15px] dark:shadow-primary/45"
      >
        {/* ===================================================================== */}
        {/* 🎬 CHROME FIJO · BADGE FLASH DEAL Y CIERRE (✕)                        */}
        {/* ===================================================================== */}
        {/* Badge FLASH DEAL removido a pedido del usuario */}

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={t('promo.close')}
          className="absolute top-2.5 right-2.5 z-40 w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all cursor-pointer"
        >
          <X size={18} strokeWidth={2.8} />
        </button>

        {/* ⏱️ La cuenta regresiva vive dentro de cada tarjeta, anclada al borde
            inferior de su propia foto: así el temporizador viaja con la oferta y
            nunca se desalinea, por corto que sea el alto de la pantalla. */}

        {/* ===================================================================== */}
        {/* 🎠 RIEL HORIZONTAL · UNA TARJETA DESLIZABLE POR OFERTA ACTIVA          */}
        {/* ===================================================================== */}
        {/* `flex` + `overflow-x-auto` + `snap-x snap-mandatory`: swipe táctil
            nativo en móvil y arrastre con mouse en escritorio (drag-to-scroll).
            Cada tarjeta es `shrink-0 w-full` + `snap-center`: el scroll siempre
            remata con una oferta completa y centrada, nunca a medias. La barra
            de scroll va oculta (`no-scrollbar`) porque los dots del pie ya
            indican la página. `onScroll` actualiza dots y contador en vivo. */}
        <div
          ref={railRef}
          {...dragHandlers}
          onScroll={totalDeals > 1 ? handleRailScroll : undefined}
          role="group"
          aria-label={
            totalDeals > 1
              ? t('promo.carouselAria', { count: totalDeals })
              : t('promo.activeAria', { dish: deal.name })
          }
          className={railClassName}
        >
          {slideModels.map((slide) => (
            <PromoDealSlide key={slide.deal.id} {...slide} />
          ))}
        </div>

        {/* ===================================================================== */}
        {/* 🎬 PIE FIJO · "APLICAR DESCUENTO" + PAGINACIÓN (DOTS Y CONTADOR)        */}
        {/* ===================================================================== */}
        {/* Vive fuera del riel: el botón de acción y la paginación quedan anclados
            al pie de la tarjeta y siguen accesibles (44px de alto) en CADA
            oferta, incluso a mitad del deslizamiento. `shrink-0` evita que el pie
            se comprima cuando el cuerpo del pop-up necesita scroll vertical.
            Los dots y el contador reflejan la oferta centrada: se actualizan en
            vivo desde `onScroll`. */}
        <div className="relative z-20 shrink-0 space-y-3 border-t border-[#0f172a]/5 dark:border-white/5 bg-white dark:bg-[#131418] px-5 pt-3.5 pb-4 text-center">
          <button
            type="button"
            onClick={() => onApply(deal, pricing.promoPrice)}
            className="w-full h-12 min-h-[48px] rounded-2xl bg-primary hover:brightness-110 text-white font-black text-[13.5px] uppercase tracking-[0.04em] flex items-center justify-center gap-2 shadow-[0_10px_30px_-8px] shadow-primary/75 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>{t('promo.applyDiscount')}</span>
            <ArrowRight size={17} strokeWidth={3} />
          </button>

          {/* Carrusel de ofertas reales (puntos + contador) */}
          {totalDeals > 1 && (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-0.5">
                {slideModels.map((slide, index) => (
                  <button
                    key={`promo-dot-${slide.deal.id}`}
                    type="button"
                    onClick={() => goToOffer(index)}
                    aria-label={t('promo.viewOffer', { index: index + 1, total: totalDeals, dish: slide.deal.name })}
                    aria-current={index === currentIndex}
                    className="group flex h-9 w-7 items-center justify-center cursor-pointer"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-all ${
                        index === currentIndex ? 'w-5 bg-primary' : 'w-1.5 bg-[#0f172a]/15 group-hover:bg-[#0f172a]/30 dark:bg-white/25 dark:group-hover:bg-white/50'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="font-mono-code text-[10.5px] text-[#64748b] dark:text-[#71717a]">
                {t('promo.counter', { index: currentIndex + 1, total: totalDeals })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
