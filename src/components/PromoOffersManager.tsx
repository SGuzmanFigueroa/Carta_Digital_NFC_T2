'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActivePromoOffer, MenuItem, PromoMechanic, PromoOfferDraft } from '@/types';
import { INITIAL_MENU_ITEMS } from '@/data/mockData';
import { createPromoOffer, fetchPromoOffers, rowToPromoOffer, setPromoOfferActive } from '@/services/promoService';
import { formatSoles } from '@/utils/promo';
import {
  PROMO_DISCOUNT_TYPES,
  PROMO_MECHANICS,
  PROMO_PREVIEW_COUNTDOWN_SECONDS,
  PROMO_PRIORITY_OPTIONS,
  PROMO_WEEKDAYS,
  buildActiveOffer,
  buildPreviewDish,
  buildSuggestedFlashWindow,
  calculateDraftOfferTotals,
  createInitialOfferForm,
  describeWeekdays,
  getPromoMechanic,
  isOfferDraftValid,
  resolveDraftSubtitleCopy,
  toggleWeekday
} from '@/utils/promoOffers';
import { PromoDealModal } from './menu/PromoDealModal';

interface PromoOffersManagerProps {
  /** Tema claro del panel (tokens idénticos al resto de SystemConfig). */
  isLight: boolean;
  isHighContrast: boolean;
  /** Carta real sincronizada desde Supabase (con fallback al catálogo demo). */
  dishes: MenuItem[];
  /** Estilos del contenedor/encabezado de sección provistos por <SystemConfig />. */
  sectionBg: string;
  sectionHeaderBorder: string;
  onShowToast: (msg: string, icon?: string) => void;
}

/**
 * CD-17 · Gestión de Ofertas Flash (Panel de Administración)
 *
 * Formulario interactivo que da vida a la sección 09 de Configuración:
 *  - Las 4 pestañas de mecánica ("Descuento %/$", "2x1", "2da Unidad", "Combo")
 *    viven en `offerForm.mechanic` y muestran u ocultan campos según apliquen.
 *  - El switch "Oferta Recurrente" alterna entre vigencia exacta (modo Flash) y
 *    días aplicables + horario (modo recurrente / Happy Hour).
 *  - "Vista Previa Móvil" monta el MISMO pop-up que ve el comensal
 *    (`PromoDealModal`) con los datos reales escritos en el formulario.
 *  - Todo el estado está agrupado en un único borrador listo para Supabase.
 */
export function PromoOffersManager({
  isLight,
  isHighContrast,
  dishes,
  sectionBg,
  sectionHeaderBorder,
  onShowToast
}: PromoOffersManagerProps) {
  // 📦 Estado centralizado del formulario (listo para persistir en Supabase).
  const [offerForm, setOfferForm] = useState<PromoOfferDraft>(createInitialOfferForm);
  // 📱 Modal de vista previa con el pop-up real del comensal.
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  // 🗂️ Ofertas en curso (public.promo_offers). La carta del comensal y el
  // servidor de pedidos leen la misma tabla, así el descuento se respeta al cobrar.
  const [offerRows, setOfferRows] = useState<Awaited<ReturnType<typeof fetchPromoOffers>>>([]);
  const [isSavingOffer, setIsSavingOffer] = useState(false);
  const showToastRef = useRef(onShowToast);
  useEffect(() => {
    showToastRef.current = onShowToast;
  }, [onShowToast]);

  useEffect(() => {
    let cancelled = false;
    fetchPromoOffers()
      .then((rows) => {
        if (!cancelled) setOfferRows(rows);
      })
      .catch((err) => {
        console.warn('[promo] No se pudieron cargar las ofertas:', err);
        if (!cancelled) showToastRef.current('No se pudieron cargar las ofertas desde Supabase', 'error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Avisa a la carta abierta en esta misma pestaña para que recargue las ofertas. */
  const notifyOffersChanged = () => window.dispatchEvent(new Event('gastropulse_promo_offers_changed'));

  // Tokens de color compartidos con las demás secciones del panel.
  const cardBg = isLight ? 'bg-[#f8fafc] border-[#e2e8f0] shadow-sm' : isHighContrast ? 'bg-black border-2 border-white' : 'bg-[#1C1C1C] border-[#2A2A2A]';
  const inputBg = isLight
    ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a] focus:border-[#FF5A1F] focus:bg-white'
    : isHighContrast
    ? 'bg-black border-2 border-white text-white focus:border-[#f59e0b]'
    : 'bg-[#141414] border-[#2A2A2A] text-gray-200 focus:border-[#FF5A1F]';
  const selectBg = isLight
    ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
    : isHighContrast
    ? 'bg-black border-2 border-white text-white'
    : 'bg-[#252525] border-[#333] text-gray-200';
  const titleColor = isLight ? 'text-[#0f172a]' : 'text-white';
  const descColor = isLight ? 'text-[#64748b]' : 'text-gray-400';
  const labelColor = isLight ? 'text-[#475569]' : 'text-gray-500';
  const mutedSurface = isLight ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569]' : 'bg-[#1A1A1A] border-[#333] text-gray-300';

  // 🍽️ Carta disponible: datos reales de Supabase o catálogo demo offline.
  const dishOptions = useMemo(() => (dishes.length > 0 ? dishes : INITIAL_MENU_ITEMS), [dishes]);
  const activeOffers = useMemo<ActivePromoOffer[]>(
    () => offerRows.map((row) => rowToPromoOffer(row, dishOptions)),
    [offerRows, dishOptions]
  );
  const mainDishId = offerForm.mainDishId || dishOptions[0]?.id || '';
  const mainDish = useMemo(
    () => dishOptions.find((dish) => dish.id === mainDishId) ?? null,
    [dishOptions, mainDishId]
  );
  const complementDish = useMemo(
    () => dishOptions.find((dish) => dish.id === offerForm.complementaryDishId) ?? null,
    [dishOptions, offerForm.complementaryDishId]
  );

  const mechanic = getPromoMechanic(offerForm.mechanic);
  const liveOffersCount = activeOffers.filter((offer) => offer.isActive).length;

  // 🧮 Motor único de la matemática promocional: se recalcula automáticamente al
  // cambiar de mecánica, los platos o el valor del descuento, y es la fuente de
  // verdad tanto del texto de ayuda como del pop-up de vista previa móvil.
  const offerTotals = useMemo(
    () => calculateDraftOfferTotals(offerForm, mainDish, complementDish),
    [offerForm, mainDish, complementDish]
  );

  // 🔎 Datos derivados que alimentan el pop-up de vista previa.
  const previewDish = useMemo(
    () => buildPreviewDish(offerForm, mainDish, complementDish),
    [offerForm, mainDish, complementDish]
  );
  // El precio de lista del plato de vista previa es el ORIGINAL TOTAL del pack
  // (2x1 = 2 unidades · Combo y 2da unidad = ambos platos): así el tachado y el
  // ahorro que ve el comensal son reales.
  const previewDeals = useMemo(
    () => [{ ...previewDish, price: offerTotals.precioOriginalTotal }],
    [previewDish, offerTotals.precioOriginalTotal]
  );
  // Montos exactos del motor: el pop-up los respeta tal cual (no los re-deriva).
  const previewPricing = useMemo(
    () => ({
      originalPrice: offerTotals.precioOriginalTotal,
      promoPrice: offerTotals.precioFinalTotal,
      savings: offerTotals.ahorroTotal,
      discountPercent: Math.round(offerTotals.effectiveDiscountPercent)
    }),
    [offerTotals]
  );
  // 📣 Copy del pop-up por MECÁNICA: la 2da unidad habla de la segunda unidad, el
  // combo nombra ambos platos y el 2x1 no menciona porcentajes.
  const previewSubtitleCopy = useMemo(
    () => resolveDraftSubtitleCopy(offerForm, mainDish, complementDish, offerTotals.declaredDiscountPercent),
    [offerForm, mainDish, complementDish, offerTotals.declaredDiscountPercent]
  );

  /** Actualización genérica y tipada del borrador (mantiene valores entre pestañas). */
  const updateField = <K extends keyof PromoOfferDraft>(key: K, value: PromoOfferDraft[K]) => {
    setOfferForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleSelectMechanic = (nextMechanic: PromoMechanic) => {
    updateField('mechanic', nextMechanic);
    onShowToast(`${getPromoMechanic(nextMechanic).label} · ${getPromoMechanic(nextMechanic).hint}`, 'info');
  };

  const handleApplySuggestedFlashWindow = () => {
    const { startAt, endAt } = buildSuggestedFlashWindow();
    setOfferForm((previous) => ({ ...previous, startAt, endAt }));
    onShowToast('Vigencia sugerida cargada: hoy de 19:00 a 23:30', 'schedule');
  };

  // ==========================================================================
  // 🎬 ACCIONES DEL FORMULARIO Y DE LAS TARJETAS
  // ==========================================================================

  const handleOpenPreview = () => {
    if (!mainDish) {
      onShowToast('Selecciona el plato principal de la oferta para generar la vista previa', 'warning');
      return;
    }
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => setIsPreviewOpen(false);

  /** El CTA del pop-up de vista previa solo simula: no envía nada a la comanda. */
  const handleApplyFromPreview = () => {
    setIsPreviewOpen(false);
    onShowToast('Vista previa móvil: así verá el comensal la oferta en su celular', 'smartphone');
  };

  const handleAddOffer = async () => {
    if (isSavingOffer) return;
    if (!mainDish) {
      onShowToast('Selecciona el plato principal de la oferta', 'warning');
      return;
    }
    const validation = isOfferDraftValid(offerForm);
    if (!validation.valid) {
      onShowToast(validation.message ?? 'Completa los datos de la oferta', 'warning');
      return;
    }

    const nextOffer = buildActiveOffer(offerForm, mainDish, complementDish);
    if (!(nextOffer.discountPercent > 0 && nextOffer.discountPercent < 100)) {
      onShowToast('El descuento debe ser mayor a 0% y menor a 100%', 'warning');
      return;
    }
    // Vigencia exacta solo en modo Flash; el horario recurrente aún no lo valida el servidor.
    const toIso = (value: string) => (value ? new Date(value).toISOString() : null);
    setIsSavingOffer(true);
    try {
      const row = await createPromoOffer(nextOffer, {
        startsAt: offerForm.isRecurring ? null : toIso(offerForm.startAt),
        endsAt: offerForm.isRecurring ? null : toIso(offerForm.endAt),
        priority: Number(offerForm.priority) || 3
      });
      setOfferRows((rows) => [row, ...rows]);
      notifyOffersChanged();
      onShowToast(`Oferta añadida: ${nextOffer.title} (${nextOffer.badge})`, 'check_circle');
      setOfferForm(createInitialOfferForm());
    } catch (err) {
      console.error('[promo] No se pudo guardar la oferta:', err);
      onShowToast('No se pudo guardar la oferta en Supabase', 'error');
    } finally {
      setIsSavingOffer(false);
    }
  };

  const handleToggleOfferActive = async (offer: ActivePromoOffer) => {
    try {
      await setPromoOfferActive(offer.id, !offer.isActive);
    } catch (err) {
      console.error('[promo] No se pudo cambiar la oferta:', err);
      onShowToast('No se pudo actualizar la oferta en Supabase', 'error');
      return;
    }
    setOfferRows((rows) => rows.map((row) => (row.id === offer.id ? { ...row, is_active: !offer.isActive } : row)));
    notifyOffersChanged();
    onShowToast(
      `"${offer.title}" ${offer.isActive ? 'retirada' : 'publicada'} en la Carta Digital QR`,
      offer.isActive ? 'visibility_off' : 'visibility'
    );
  };

  const handleEditOffer = (offer: ActivePromoOffer) => {
    setOfferForm((previous) => ({
      ...previous,
      mechanic: offer.mechanic,
      mainDishId: offer.mainDishId,
      complementaryDishId: offer.complementaryDishId,
      discountType: 'percent',
      discountValue: String(Math.round(offer.discountPercent))
    }));
    onShowToast(`Oferta cargada en el formulario para editar: ${offer.title}`, 'edit');
    document.getElementById('ofertas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleShowOfferDetails = (offer: ActivePromoOffer) => {
    onShowToast(
      `${offer.kicker} · ${offer.badge} · ${offer.timingLabel} · ${formatSoles(offer.promoPrice)} (antes ${formatSoles(
        offer.originalPrice
      )})`,
      'info'
    );
  };

  const handleBroadcastOffer = (offer: ActivePromoOffer) => {
    onShowToast(`Oferta "${offer.title}" enviada en vivo a la Carta QR y al pop-up de mesa`, 'send');
  };

  // ==========================================================================
  // 🧩 RENDERIZADO CONDICIONAL (campos que aparecen según la pestaña activa)
  // ==========================================================================

  /** Pestañas superiores: Descuento %/$ · 2x1 · 2da Unidad · Combo. */
  const renderMechanicTabs = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {PROMO_MECHANICS.map((option) => {
        const isActive = option.id === offerForm.mechanic;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => handleSelectMechanic(option.id)}
            aria-pressed={isActive}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-[12.5px] font-bold transition-all duration-300 ease-in-out cursor-pointer ${
              isActive
                ? 'bg-[#FF5A1F]/10 border-[#FF5A1F] text-[#FF5A1F] shadow-sm'
                : isLight
                ? 'bg-white border-[#cbd5e1] text-[#475569] hover:border-[#FF5A1F]/60 hover:text-[#0f172a]'
                : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-[#FF5A1F]/60 hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{option.icon}</span>
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderMainDishField = () => (
    <div className="space-y-1.5">
      <label className={`text-[12px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${descColor}`}>
        <span className="material-symbols-outlined text-[15px] text-[#FF5A1F]">restaurant_menu</span>
        <span>Plato Principal de la Oferta *</span>
        <span className={`ml-auto text-[10px] font-mono normal-case tracking-normal ${labelColor}`}>Carta General</span>
      </label>
      <select
        value={mainDishId}
        onChange={(event) => updateField('mainDishId', event.target.value)}
        className={`w-full h-[42px] px-3.5 py-2.5 rounded-lg border text-[13px] focus:outline-none transition-all cursor-pointer ${selectBg}`}
      >
        <option value="" disabled>
          Selecciona un plato de la carta...
        </option>
        {dishOptions.map((dish) => (
          <option key={dish.id} value={dish.id}>
            {dish.name} — {formatSoles(dish.price)}
          </option>
        ))}
      </select>
      <span className={`text-[11px] ${labelColor}`}>
        {mainDish
          ? `Precio de carta: ${formatSoles(mainDish.price)} · ${mainDish.category.toUpperCase()}`
          : 'Sincroniza la carta para seleccionar platos reales.'}
      </span>
    </div>
  );

  /**
   * Campo "Plato / Bebida Complementaria": SOLO se monta en el DOM cuando la
   * mecánica activa necesita un segundo plato real (2da Unidad o Combo /
   * Maridaje). Con "Descuento % / $" y con "2x1 Flash" el campo desaparece por
   * completo: en el 2x1 la segunda unidad es idéntica a la primera.
   */
  const renderComplementaryDishField = () => {
    if (!mechanic.requiresComplement) return null;

    return (
      <div
        key={`complement-${offerForm.mechanic}`}
        className="space-y-1.5 animate-fadeIn transition-all duration-300 ease-in-out"
      >
        <label className={`text-[12px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${descColor}`}>
          <span className="material-symbols-outlined text-[15px] text-[#FF5A1F]">
            {offerForm.mechanic === 'combo' ? 'wine_bar' : 'add_circle'}
          </span>
          <span>{mechanic.complementLabel} *</span>
          <span className={`ml-auto text-[10px] font-mono normal-case tracking-normal ${labelColor}`}>
            Requerido por {mechanic.label}
          </span>
        </label>
        <select
          value={offerForm.complementaryDishId}
          onChange={(event) => updateField('complementaryDishId', event.target.value)}
          className={`w-full h-[42px] px-3.5 py-2.5 rounded-lg border text-[13px] focus:outline-none transition-all cursor-pointer ${selectBg}`}
        >
          <option value="" disabled>
            Selecciona el plato o bebida complementaria...
          </option>
          {dishOptions.map((dish) => (
            <option key={dish.id} value={dish.id}>
              {dish.name} — {formatSoles(dish.price)}
            </option>
          ))}
        </select>
        <span className={`text-[11px] block ${labelColor}`}>{mechanic.hint}</span>
      </div>
    );
  };

  /** Bloque "Tipo de Descuento · Valor · Límite · Prioridad" con feedback en vivo. */
  const renderDiscountConfig = () => {
    const discountTypeLabel = PROMO_DISCOUNT_TYPES.find((type) => type.id === offerForm.discountType);
    // El input puede quedar vacío: el motor lo interpreta como 0 (nunca NaN).
    const hasPrices =
      Boolean(mainDish) &&
      (mainDish?.price ?? 0) > 0 &&
      (!mechanic.requiresComplement || Boolean(complementDish));
    // Resumen en vivo con los 3 montos corregidos del motor de ofertas.
    const totalsSummary = `Precio original ${formatSoles(offerTotals.precioOriginalTotal)} · El comensal pagará ${formatSoles(
      offerTotals.precioFinalTotal
    )} y ahorra ${formatSoles(offerTotals.ahorroTotal)}.`;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5 items-start">
        {/* Tipo de Descuento */}
        <div className="flex flex-col">
          <label className={`block min-h-[34px] text-[12px] font-bold uppercase leading-tight tracking-wider mb-1.5 ${descColor}`}>Tipo de Descuento</label>
          <select
            value={offerForm.discountType}
            onChange={(event) => updateField('discountType', event.target.value as PromoOfferDraft['discountType'])}
            disabled={!mechanic.usesDiscountValue}
            className={`w-full h-[42px] px-3.5 py-2.5 rounded-lg border text-[13px] focus:outline-none transition-all cursor-pointer disabled:opacity-60 ${selectBg}`}
          >
            {PROMO_DISCOUNT_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Valor del descuento aplicado */}
        <div className="flex flex-col">
          <label className={`block min-h-[34px] text-[12px] font-bold uppercase leading-tight tracking-wider mb-1.5 ${descColor}`}>
            Valor / Descuento Aplicado
          </label>
          {/* 2x1 Flash: el descuento es automático (50%), así que el input se
              reemplaza por un chip de solo lectura de la MISMA altura (42px). */}
          {mechanic.usesDiscountValue ? (
            <div className="relative">
              <input
                type="number"
                min={0}
                inputMode="decimal"
                value={offerForm.discountValue}
                onChange={(event) => updateField('discountValue', event.target.value)}
                className={`w-full h-[42px] pl-3.5 pr-16 py-2.5 rounded-lg border text-[13px] font-mono focus:outline-none transition-all ${inputBg}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#FF5A1F]">
                {discountTypeLabel?.suffix}
              </span>
            </div>
          ) : (
            <div
              className={`w-full h-[42px] px-3.5 rounded-lg border flex items-center justify-between gap-2 font-mono text-[12px] font-bold ${mutedSurface}`}
            >
              <span>{Math.round(mechanic.fixedDiscountPercent ?? 50)}% AUTO</span>
              <span className="text-[10px] uppercase tracking-wider">
                {offerForm.mechanic === 'two_for_one' ? 'Lleva 2, paga 1' : mechanic.label}
              </span>
            </div>
          )}
          <span className={`mt-2 block text-[11px] leading-snug ${labelColor}`}>
            {hasPrices
              ? totalsSummary
              : mechanic.requiresComplement
              ? `Selecciona el ${mechanic.complementLabel.toLowerCase()} para calcular el ahorro real del ${mechanic.label}.`
              : 'Selecciona un plato con precio para calcular el ahorro real.'}
          </span>
        </div>

        {/* Límite de porciones */}
        <div className="flex flex-col">
          <label className={`block min-h-[34px] text-[12px] font-bold uppercase leading-tight tracking-wider mb-1.5 ${descColor}`}>
            Límite de Porciones
          </label>
          <input
            type="number"
            min={0}
            placeholder="Sin límite"
            value={offerForm.portionLimit}
            onChange={(event) => updateField('portionLimit', event.target.value)}
            className={`w-full h-[42px] px-3.5 py-2.5 rounded-lg border text-[13px] font-mono focus:outline-none transition-all ${inputBg}`}
          />
          <span className={`mt-2 block text-[11px] leading-snug ${labelColor}`}>
            Cupos disponibles antes de agotar la promo.
          </span>
        </div>

        {/* Prioridad en la Carta QR */}
        <div className="flex flex-col">
          <label className={`block min-h-[34px] text-[12px] font-bold uppercase leading-tight tracking-wider mb-1.5 ${descColor}`}>
            Prioridad en Carta QR <span className="normal-case font-medium">(1 = Alta)</span>
          </label>
          <select
            value={offerForm.priority}
            onChange={(event) => updateField('priority', event.target.value)}
            className={`w-full h-[42px] px-3.5 py-2.5 rounded-lg border text-[13px] focus:outline-none transition-all cursor-pointer ${selectBg}`}
          >
            {PROMO_PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className={`mt-2 block text-[11px] leading-snug ${labelColor}`}>
            Define el orden de aparición en la carta viva.
          </span>
        </div>
      </div>
    );
  };

  /** Switch "Oferta Recurrente" (Modo Flash ⇄ Modo Recurrente). */
  const renderRecurrenceToggle = () => (
    <div
      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-300 ease-in-out ${cardBg}`}
    >
      <div className="flex gap-3">
        <span className="material-symbols-outlined text-[22px] text-[#FF5A1F] mt-0.5 shrink-0">event_repeat</span>
        <div>
          <h4 className={`text-[13.5px] font-bold mb-0.5 ${titleColor}`}>Oferta Recurrente</h4>
          <p className={`text-[11.5px] leading-tight ${descColor}`}>
            Actívala para días fijos semanales o Happy Hour periódico programado
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded border uppercase tracking-wide ${
            offerForm.isRecurring ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]/40 text-[#FF5A1F]' : mutedSurface
          }`}
        >
          {offerForm.isRecurring ? 'Modo Recurrente (Días Fijos)' : 'Modo Flash (Fecha Puntual)'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={offerForm.isRecurring}
          aria-label="Alternar oferta recurrente"
          onClick={() => updateField('isRecurring', !offerForm.isRecurring)}
          className={`w-11 h-6 shrink-0 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
            offerForm.isRecurring ? 'bg-[#FF5A1F]' : isLight ? 'bg-[#cbd5e1]' : 'bg-[#333]'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full transition-transform ${
              offerForm.isRecurring ? 'translate-x-5' : 'translate-x-0'
            } ${isLight ? 'bg-white shadow-sm' : 'bg-[#0F0F0F]'}`}
          />
        </button>
      </div>
    </div>
  );

  /** Vigencia exacta (Modo Flash): se desmonta por completo al activar la recurrencia. */
  const renderFlashWindowFields = () => (
    <div
      key="flash-window"
      className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 items-start animate-fadeIn transition-all duration-300 ease-in-out"
    >
      <div className="flex flex-col">
        <label className={`flex min-h-[34px] flex-col text-[12px] font-bold uppercase leading-tight tracking-wider mb-1.5 ${descColor}`}>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#FF5A1F]">event</span>
            <span>Vigencia - Inicio (Fecha & Hora)</span>
          </span>
        </label>
        <input
          type="datetime-local"
          value={offerForm.startAt}
          onChange={(event) => updateField('startAt', event.target.value)}
          className={`w-full h-[42px] px-3.5 py-2.5 rounded-lg border text-[13px] font-mono focus:outline-none transition-all ${inputBg}`}
        />
        <button
          type="button"
          onClick={handleApplySuggestedFlashWindow}
          className={`self-start mt-2 text-[11px] font-semibold underline decoration-dotted cursor-pointer ${
            isLight ? 'text-[#c2410c]' : 'text-[#FF8A65]'
          }`}
        >
          Sugerir hoy 19:00 → 23:30
        </button>
      </div>

      <div className="flex flex-col">
        <label className={`flex min-h-[34px] flex-col text-[12px] font-bold uppercase leading-tight tracking-wider mb-1.5 ${descColor}`}>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#FF5A1F]">timer</span>
            <span>Vigencia - Fin (Flash)</span>
          </span>
        </label>
        <input
          type="datetime-local"
          value={offerForm.endAt}
          onChange={(event) => updateField('endAt', event.target.value)}
          className={`w-full h-[42px] px-3.5 py-2.5 rounded-lg border text-[13px] font-mono focus:outline-none transition-all ${inputBg}`}
        />
        <span className={`mt-2 block text-[11px] leading-snug ${labelColor}`}>
          El pop-up del comensal mostrará la cuenta regresiva hasta esta hora.
        </span>
      </div>
    </div>
  );

  /**
   * Días aplicables + horario (Modo Recurrente): reemplazan a la vigencia
   * exacta del modo Flash, evitando que el administrador llene fechas que no
   * aplican a un Happy Hour semanal.
   */
  const renderRecurrenceFields = () => (
    <div
      key="recurrence-window"
      className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 items-start animate-fadeIn transition-all duration-300 ease-in-out"
    >
      <div className="space-y-2 sm:col-span-2">
        <label className={`text-[12px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${descColor}`}>
          <span className="material-symbols-outlined text-[15px] text-[#FF5A1F]">calendar_month</span>
          <span>Días Aplicables *</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {PROMO_WEEKDAYS.map((day) => {
            const isSelected = offerForm.weekdays.includes(day.index);
            return (
              <button
                key={day.index}
                type="button"
                aria-pressed={isSelected}
                aria-label={day.full}
                title={day.full}
                onClick={() => updateField('weekdays', toggleWeekday(offerForm.weekdays, day.index))}
                className={`w-10 h-10 min-w-[40px] rounded-lg border text-[13px] font-bold flex items-center justify-center transition-all duration-200 ease-in-out cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF5A1F] border-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/25'
                    : isLight
                    ? 'bg-white border-[#cbd5e1] text-[#475569] hover:border-[#FF5A1F]/60'
                    : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-[#FF5A1F]/60'
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
        <span className={`text-[11px] block ${labelColor}`}>
          {offerForm.weekdays.length > 0
            ? `Se aplicará: ${describeWeekdays(offerForm.weekdays)}`
            : 'Selecciona al menos un día para publicar la recurrencia.'}
        </span>
      </div>

      <div className="flex flex-col">
        <label
          className={`block min-h-[34px] text-[12px] font-bold uppercase leading-tight tracking-wider mb-1.5 ${descColor}`}
        >
          Horario — Desde
        </label>
        <input
          type="time"
          value={offerForm.scheduleFrom}
          onChange={(event) => updateField('scheduleFrom', event.target.value)}
          className={`w-full h-[42px] px-3.5 py-2.5 rounded-lg border text-[13px] font-mono focus:outline-none transition-all ${inputBg}`}
        />
      </div>

      <div className="flex flex-col">
        <label
          className={`block min-h-[34px] text-[12px] font-bold uppercase leading-tight tracking-wider mb-1.5 ${descColor}`}
        >
          Horario — Hasta
        </label>
        <input
          type="time"
          value={offerForm.scheduleTo}
          onChange={(event) => updateField('scheduleTo', event.target.value)}
          className={`w-full h-[42px] px-3.5 py-2.5 rounded-lg border text-[13px] font-mono focus:outline-none transition-all ${inputBg}`}
        />
        <span className={`mt-2 block text-[11px] leading-snug ${labelColor}`}>
          Ej.: de {offerForm.scheduleFrom || '18:00'} a {offerForm.scheduleTo || '22:00'} (Happy Hour).
        </span>
      </div>
    </div>
  );

  /** Pie del formulario: publicación inmediata + validación + Vista Previa + Añadir. */
  const renderFooterActions = () => {
    const validation = isOfferDraftValid(offerForm);

    return (
      <div
        className={`pt-4 border-t flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
          isLight ? 'border-[#e2e8f0]' : 'border-gray-500/20'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={offerForm.syncToPosImmediately}
            aria-label="Activar inmediatamente en Carta QR y Pop-up de Mesa"
            onClick={() => updateField('syncToPosImmediately', !offerForm.syncToPosImmediately)}
            className={`w-11 h-6 shrink-0 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
              offerForm.syncToPosImmediately ? 'bg-[#FF5A1F]' : isLight ? 'bg-[#cbd5e1]' : 'bg-[#333]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full transition-transform ${
                offerForm.syncToPosImmediately ? 'translate-x-5' : 'translate-x-0'
              } ${isLight ? 'bg-white shadow-sm' : 'bg-[#0F0F0F]'}`}
            />
          </button>
          <div>
            <div className={`text-[12.5px] font-bold ${titleColor}`}>
              Activar inmediatamente en Carta QR y Pop-up de Mesa
            </div>
            <div className={`text-[11px] ${descColor}`}>Sincronización instantánea con el terminal POS y comandas</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          {/* Feedback de validación en vivo (se convierte en el motivo del bloqueo) */}
          <span
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border max-w-full ${
              validation.valid
                ? isLight
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : isLight
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">
              {validation.valid ? 'verified' : 'error'}
            </span>
            <span className="truncate">
              {validation.valid ? 'Validación sin conflicto de turnos' : validation.message}
            </span>
          </span>

          {/* Vista Previa: monta el pop-up REAL del comensal con la data del formulario */}
          <button
            type="button"
            onClick={handleOpenPreview}
            className={`px-4 py-2.5 min-h-[44px] rounded-lg border font-bold text-[12px] flex items-center gap-1.5 cursor-pointer transition-all duration-300 ease-in-out active:scale-95 ${
              isLight
                ? 'bg-white border-[#cbd5e1] text-[#475569] hover:border-[#FF5A1F] hover:text-[#0f172a]'
                : isHighContrast
                ? 'bg-black border-2 border-white text-white hover:border-[#f59e0b]'
                : 'bg-[#1A1A1A] border-[#333] text-gray-300 hover:border-[#FF5A1F] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">smartphone</span>
            <span>Vista Previa Móvil</span>
          </button>

          <button
            type="button"
            onClick={handleAddOffer}
            disabled={isSavingOffer}
            className="px-4 py-2.5 min-h-[44px] rounded-lg bg-[#FF5A1F] hover:bg-[#FF703D] disabled:opacity-60 disabled:cursor-wait text-white font-bold text-[12px] flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#FF5A1F]/20 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>{isSavingOffer ? 'Guardando…' : 'Añadir Oferta'}</span>
          </button>
        </div>
      </div>
    );
  };

  /** Parrilla "Ofertas Activas Actualmente" con acciones reales por tarjeta. */
  const renderActiveOffers = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className={`text-xl font-bold ${titleColor}`}>Ofertas Activas Actualmente</h2>
          <p className={`text-[13px] ${descColor}`}>
            {liveOffersCount} {liveOffersCount === 1 ? 'promoción' : 'promociones'} en curso sincronizadas con el POS y
            mesas QR
          </p>
        </div>
        <span
          className={`self-start sm:self-auto flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-wider px-2.5 py-1 rounded border ${
            isLight
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Broadcast Activo
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {activeOffers.map((offer) => (
          <div
            key={offer.id}
            className={`rounded-xl border overflow-hidden flex flex-col sm:flex-row transition-all duration-300 ease-in-out ${cardBg} ${
              offer.isActive ? '' : 'opacity-60'
            }`}
          >
            <div className="relative w-full sm:w-[148px] shrink-0 h-32 sm:h-auto bg-black/20">
              <img src={offer.image} alt={offer.title} className="w-full h-full object-cover" loading="lazy" />
              <span className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/30">
                {offer.badge}
              </span>
            </div>

            <div className="flex-1 min-w-0 flex flex-col">
              <div className="p-3.5 space-y-1.5 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FF5A1F] truncate">
                    {offer.kicker}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                      isLight ? 'bg-[#ffedd5] text-[#c2410c]' : 'bg-[#7c2d12]/30 text-[#fdba74]'
                    }`}
                  >
                    {offer.timingLabel}
                  </span>
                </div>
                <h4 className={`text-[15px] font-bold truncate ${titleColor}`}>{offer.title}</h4>
                <p className={`text-[11.5px] truncate ${descColor}`}>{offer.subtitle}</p>
                <div className="flex items-center flex-wrap gap-2 pt-0.5">
                  <span className="font-mono text-[17px] font-black text-[#FF5A1F]">{formatSoles(offer.promoPrice)}</span>
                  <span className={`font-mono text-[11.5px] line-through ${labelColor}`}>
                    {formatSoles(offer.originalPrice)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isLight ? 'bg-emerald-500/10 text-emerald-700' : 'bg-emerald-500/15 text-emerald-400'
                    }`}
                  >
                    {offer.note}
                  </span>
                </div>
              </div>

              <div
                className={`px-3.5 py-2.5 border-t flex items-center justify-between gap-2 ${
                  isLight ? 'border-[#e2e8f0]' : 'border-[#2A2A2A]'
                }`}
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={offer.isActive}
                  onClick={() => handleToggleOfferActive(offer)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span
                    className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                      offer.isActive ? 'bg-emerald-500' : isLight ? 'bg-[#cbd5e1]' : 'bg-[#333]'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        offer.isActive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </span>
                  <span className={`text-[11.5px] font-semibold ${offer.isActive ? titleColor : descColor}`}>
                    En Cartas QR
                  </span>
                </button>

                <div className="flex items-center gap-1">
                  {[
                    { icon: 'edit', label: 'Editar oferta', action: () => handleEditOffer(offer) },
                    { icon: 'info', label: 'Ver detalle de la oferta', action: () => handleShowOfferDetails(offer) },
                    { icon: 'qr_code_2', label: 'Enviar a la Carta QR', action: () => handleBroadcastOffer(offer) }
                  ].map((action) => (
                    <button
                      key={action.icon}
                      type="button"
                      title={action.label}
                      aria-label={action.label}
                      onClick={action.action}
                      className={`p-2 min-h-[36px] min-w-[36px] rounded-lg transition-colors cursor-pointer ${
                        isLight
                          ? 'text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
                          : 'text-[#a1a1aa] hover:bg-[#27272a] hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">{action.icon}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /**
   * Modal centrado de vista previa: monta el MISMO componente que ve el comensal
   * (`PromoDealModal`) con la data real del formulario. Vive en un contenedor
   * `fixed` de alto z-index, así no altera el layout del panel de administración.
   */
  const renderPreviewModal = () => {
    if (!isPreviewOpen) return null;

    return (
      <div
        className="fixed inset-0 z-[80] animate-fadeIn"
        role="dialog"
        aria-modal="true"
        aria-label="Vista previa móvil de la oferta"
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-white text-[11px] font-semibold shadow-xl whitespace-nowrap">
          <span className="material-symbols-outlined text-[16px] text-[#FF5A1F]">smartphone</span>
          <span>Vista previa móvil · así verá el comensal la oferta</span>
          <button
            type="button"
            onClick={handleClosePreview}
            aria-label="Cerrar vista previa"
            className="ml-1 p-1 rounded-full hover:bg-white/15 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <PromoDealModal
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
          deals={previewDeals}
          discountPercent={previewPricing.discountPercent}
          pricingOverride={previewPricing}
          promoCopy={previewSubtitleCopy}
          complementDishImage={mechanic.requiresComplement ? complementDish?.image ?? null : null}
          countdownSeconds={PROMO_PREVIEW_COUNTDOWN_SECONDS}
          onApply={handleApplyFromPreview}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* SEC_09: GESTIÓN DE OFERTAS FLASH */}
      <section id="ofertas" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
        <div
          className={`flex flex-col sm:flex-row justify-between items-start gap-4 p-4 sm:p-6 border-b ${sectionHeaderBorder}`}
        >
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-[#FF5A1F] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className={`text-lg font-bold ${titleColor}`}>Gestión de Ofertas Flash</h2>
              </div>
              <p className={`text-[13px] mt-0.5 ${descColor}`}>
                Configura promociones temporales, descuentos por porcentaje o monto fijo, promociones 2x1, 2da unidad
                con descuento y maridajes combo sincronizados de inmediato con cartas digitales QR y tablets en salón.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          <div className="space-y-2.5">
            <h3 className={`text-[12px] font-bold uppercase tracking-wider flex items-center gap-2 ${descColor}`}>
              <svg className="w-4 h-4 text-[#FF5A1F] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
              <span>Mecánica Promocional Gastronómica</span>
            </h3>
            {renderMechanicTabs()}
          </div>

          <div className="space-y-4">
            {renderMainDishField()}
            {/* Campo complementario: solo en 2da Unidad · Combo / Maridaje
                (el 2x1 usa la MISMA unidad duplicada, así que no se pide). */}
            {renderComplementaryDishField()}
          </div>

          {renderDiscountConfig()}

          {renderRecurrenceToggle()}

          {/* Vigencia exacta (Modo Flash) ⇄ Días aplicables + horario (Recurrente) */}
          {offerForm.isRecurring ? renderRecurrenceFields() : renderFlashWindowFields()}

          {renderFooterActions()}
        </div>
      </section>

      {renderActiveOffers()}

      {renderPreviewModal()}
    </div>
  );
}




