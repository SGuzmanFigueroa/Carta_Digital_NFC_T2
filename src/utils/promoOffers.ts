/**
 * GastroPulse OS - CD-17 · Motor del formulario "Gestión de Ofertas Flash"
 *
 * Lógica PURA (sin React) que da vida al formulario del panel de
 * administración: mecánicas promocionales, campos condicionales, validación,
 * armado del plato de vista previa y composición de la tarjeta de oferta.
 * Separar esta lógica deja el componente enfocado en la interactividad y el
 * borrador listo para enviarse a Supabase.
 */

import type {
  ActivePromoOffer,
  MenuItem,
  PromoDiscountType,
  PromoMechanic,
  PromoOfferDraft
} from '@/types';
import { calculateOfferTotals, formatPromoDiscountLabel, formatSoles } from '@/utils/promo';
import type { PromoOfferTotals, PromoSubtitleTextInput } from '@/utils/promo';

/** Cuenta regresiva del pop-up de vista previa (12:35, igual que la carta viva). */
export const PROMO_PREVIEW_COUNTDOWN_SECONDS = 755;

export interface PromoMechanicOption {
  id: PromoMechanic;
  /** Etiqueta de la pestaña superior. */
  label: string;
  /** Ícono Material Symbols de la pestaña. */
  icon: string;
  /** Título corto que aparece sobre el plato en la tarjeta de oferta. */
  kicker: string;
  /** Ayuda contextual bajo la pestaña activa. */
  hint: string;
  /** Prefijo del campo complementario (solo cuando aplica). */
  complementLabel: string;
  /**
   * ¿Necesita un segundo plato / bebida del selector para funcionar?
   * `false` en "Descuento %/$" (solo usa el Plato 1) y en "2x1 Flash" (la 2ª
   * unidad es idéntica a la primera, así que el selector se oculta en la UI).
   */
  requiresComplement: boolean;
  /** ¿El usuario define el valor del descuento en el formulario? */
  usesDiscountValue: boolean;
  /** Descuento fijo implícito (%), p. ej. un 2x1 equivale a 50%. */
  fixedDiscountPercent?: number;
}

/** Las 4 pestañas de mecánica promocional del formulario. */
export const PROMO_MECHANICS: PromoMechanicOption[] = [
  {
    id: 'discount',
    label: 'Descuento % / $',
    icon: 'percent',
    kicker: 'PLATO DEL CHEF',
    hint: 'Descuento directo sobre el precio de carta del plato seleccionado.',
    complementLabel: 'Plato / Bebida Complementaria',
    requiresComplement: false,
    usesDiscountValue: true
  },
  {
    id: 'two_for_one',
    label: '2x1 Flash',
    icon: 'bar_chart',
    kicker: 'HAPPY HOUR BAR',
    hint: 'Lleva 2 unidades idénticas y paga 1: el sistema duplica el plato y aplica 50% automático.',
    complementLabel: 'Plato / Bebida Complementaria',
    // El 2x1 asume que la 2ª unidad es la MISMA: no pide complemento ni valor.
    requiresComplement: false,
    usesDiscountValue: false,
    fixedDiscountPercent: 50
  },
  {
    id: 'second_unit',
    label: '2da Unidad %',
    icon: 'view_module',
    kicker: '2DA UNIDAD',
    hint: 'La segunda unidad (o el plato complementario) sale con el porcentaje indicado.',
    complementLabel: 'Plato / Bebida Complementaria',
    requiresComplement: true,
    usesDiscountValue: true
  },
  {
    id: 'combo',
    label: 'Combo / Maridaje',
    icon: 'local_offer',
    kicker: 'COMBO + MARIDAJE',
    hint: 'Pack plato + complemento con un descuento cerrado sobre el conjunto.',
    complementLabel: 'Maridaje / Complemento del Combo',
    requiresComplement: true,
    usesDiscountValue: true
  }
];

/** Opciones del selector "Tipo de Descuento". */
export const PROMO_DISCOUNT_TYPES: { id: PromoDiscountType; label: string; suffix: string }[] = [
  { id: 'percent', label: 'Porcentaje Directo (%)', suffix: '% OFF' },
  { id: 'fixed', label: 'Monto Fijo Descontado (S/)', suffix: 'S/ OFF' }
];

/** Prioridad de aparición en la Carta QR (1 = máxima). */
export const PROMO_PRIORITY_OPTIONS = [
  { value: '1', label: '1 - Prioridad Máxima' },
  { value: '2', label: '2 - Prioridad Alta' },
  { value: '3', label: '3 - Prioridad Med.' },
  { value: '4', label: '4 - Prioridad Baja' },
  { value: '5', label: '5 - Prioridad Mín.' }
];

/** Días aplicables de la oferta recurrente (orden L M X J V S D / ISO). */
export const PROMO_WEEKDAYS = [
  { index: 1, label: 'L', full: 'Lunes' },
  { index: 2, label: 'M', full: 'Martes' },
  { index: 3, label: 'X', full: 'Miércoles' },
  { index: 4, label: 'J', full: 'Jueves' },
  { index: 5, label: 'V', full: 'Viernes' },
  { index: 6, label: 'S', full: 'Sábado' },
  { index: 0, label: 'D', full: 'Domingo' }
] as const;

/** Resuelve la definición de una mecánica (con fallback seguro). */
export function getPromoMechanic(mechanic: PromoMechanic): PromoMechanicOption {
  return PROMO_MECHANICS.find((option) => option.id === mechanic) ?? PROMO_MECHANICS[0];
}

/**
 * Borrador inicial del formulario.
 * Las fechas del modo Flash arrancan vacías a propósito (se rellenan con el
 * asistente de sugerencia o con el selector nativo) para que el render del
 * servidor y del cliente sean idénticos y la hidratación no se rompa.
 */
export function createInitialOfferForm(): PromoOfferDraft {
  return {
    mechanic: 'discount',
    mainDishId: '',
    complementaryDishId: '',
    discountType: 'percent',
    discountValue: '15',
    portionLimit: '25',
    priority: '3',
    isRecurring: false,
    startAt: '',
    endAt: '',
    weekdays: [1, 2, 3, 4, 5],
    scheduleFrom: '18:00',
    scheduleTo: '22:00',
    syncToPosImmediately: true
  };
}

/** Formatea una fecha local para el input `datetime-local` (`YYYY-MM-DDTHH:mm`). */
function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** Ventana Flash sugerida (hoy de 19:00 a 23:30) calculada en tiempo de clic. */
export function buildSuggestedFlashWindow(now: Date = new Date()): { startAt: string; endAt: string } {
  const start = new Date(now);
  start.setHours(19, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 30, 0, 0);
  return { startAt: toDateTimeLocalValue(start), endAt: toDateTimeLocalValue(end) };
}

/** Marca / desmarca un día de la semana sin duplicados. */
export function toggleWeekday(weekdays: number[], dayIndex: number): number[] {
  return weekdays.includes(dayIndex)
    ? weekdays.filter((day) => day !== dayIndex)
    : [...weekdays, dayIndex].sort((a, b) => a - b);
}

/** "Lun, Mié, Vie" a partir de los índices ISO seleccionados. */
export function describeWeekdays(weekdays: number[]): string {
  const labels: Record<number, string> = {
    1: 'Lun',
    2: 'Mar',
    3: 'Mié',
    4: 'Jue',
    5: 'Vie',
    6: 'Sáb',
    0: 'Dom'
  };
  return PROMO_WEEKDAYS.filter((day) => weekdays.includes(day.index))
    .map((day) => labels[day.index])
    .join(', ');
}

/**
 * Traduce el borrador del formulario a los 3 montos REALES de la oferta:
 * `precioOriginalTotal`, `precioFinalTotal` y `ahorroTotal` (motor único que
 * consumen el texto de ayuda del formulario, el pop-up móvil de vista previa y
 * las tarjetas de "Ofertas Activas").
 *
 * Resuelve los precios de carta antes de calcular con el plato principal y el
 * complementario. En un 2x1 el complemento NO existe en el formulario: la
 * segunda unidad se asume idéntica a la primera (multiplica el precio por 2).
 */
export function calculateDraftOfferTotals(
  form: PromoOfferDraft,
  mainDish: MenuItem | null,
  complementDish: MenuItem | null
): PromoOfferTotals {
  const mechanic = getPromoMechanic(form.mechanic);
  const mainPrice = mainDish?.price ?? 0;

  const complementPrice = mechanic.requiresComplement
    ? complementDish?.price ?? 0
    : form.mechanic === 'two_for_one'
    ? mainPrice
    : 0;

  return calculateOfferTotals({
    mechanic: form.mechanic,
    discountType: form.discountType,
    discountValue: form.discountValue,
    mainPrice,
    complementPrice
  });
}

/** Validación del borrador con mensajes accionables para el administrador. */
export function isOfferDraftValid(form: PromoOfferDraft): { valid: boolean; message?: string } {
  const mechanic = getPromoMechanic(form.mechanic);

  if (mechanic.requiresComplement && !form.complementaryDishId) {
    return {
      valid: false,
      message: `Selecciona el ${mechanic.complementLabel.toLowerCase()} para la mecánica ${mechanic.label}`
    };
  }

  if (mechanic.usesDiscountValue) {
    const value = Number(form.discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      return { valid: false, message: 'Ingresa un valor de descuento válido (mayor a 0)' };
    }
  }

  if (form.isRecurring) {
    if (form.weekdays.length === 0) {
      return { valid: false, message: 'Selecciona al menos un día aplicable para la oferta recurrente' };
    }
    if (!form.scheduleFrom || !form.scheduleTo) {
      return { valid: false, message: 'Define el horario de la oferta recurrente (ej. de 18:00 a 22:00)' };
    }
  } else if (!form.startAt || !form.endAt) {
    return { valid: false, message: 'Define la fecha y hora de inicio y fin de la oferta Flash' };
  }

  return { valid: true };
}

// =============================================================================
// COMPOSICIÓN REAL DE LA OFERTA (previa + tarjeta de "Ofertas Activas")
// =============================================================================

/** Plato neutro de seguridad: la vista previa nunca se rompe sin datos. */
const FALLBACK_PREVIEW_DISH: MenuItem = {
  id: 'promo-preview',
  name: 'Plato de la oferta',
  description: 'Selecciona el plato principal de la carta para generar la vista previa real.',
  price: 0,
  category: 'fondos',
  image: '/logo.png',
  rating: 5,
  reviewsCount: 0
};

/** Nombre comercial de la oferta según la mecánica elegida. */
export function composeOfferName(
  form: PromoOfferDraft,
  mainDish: MenuItem | null,
  complementDish: MenuItem | null
): string {
  const mainName = mainDish?.name ?? FALLBACK_PREVIEW_DISH.name;
  const complementName = complementDish?.name;

  switch (form.mechanic) {
    case 'two_for_one':
      return complementName ? `2x1 ${mainName} & ${complementName}` : `2x1 ${mainName}`;
    case 'second_unit':
    case 'combo':
      return complementName ? `${mainName} + ${complementName}` : mainName;
    default:
      return mainName;
  }
}

/** Descripción que verá el comensal en el pop-up promocional. */
export function composeOfferDescription(
  form: PromoOfferDraft,
  mainDish: MenuItem | null,
  complementDish: MenuItem | null
): string {
  const base = mainDish?.description?.trim() || FALLBACK_PREVIEW_DISH.description;

  // 2x1: el formulario no pide complemento porque la 2ª unidad es la misma.
  if (form.mechanic === 'two_for_one') {
    return `${base} Promoción 2x1: lleva 2 unidades y paga 1 (la segunda es idéntica).`;
  }
  if (!complementDish) return base;
  if (form.mechanic === 'combo') {
    return `${base} Combo con maridaje: incluye ${complementDish.name}.`;
  }
  return `${base} Incluye ${complementDish.name} como segunda unidad.`;
}

/**
 * Convierte el borrador del formulario en el `MenuItem` real que consume
 * `PromoDealModal` (el mismo pop-up que ve el comensal en su celular).
 */
export function buildPreviewDish(
  form: PromoOfferDraft,
  mainDish: MenuItem | null,
  complementDish: MenuItem | null
): MenuItem {
  const base = mainDish ?? FALLBACK_PREVIEW_DISH;
  const mechanic = getPromoMechanic(form.mechanic);
  const complement = mechanic.requiresComplement ? complementDish : null;

  return {
    ...base,
    id: `preview-${base.id}`,
    name: composeOfferName(form, base, complement),
    description: composeOfferDescription(form, base, complement)
  };
}

/**
 * Contexto del copy del pop-up para el borrador actual: traduce la mecánica, los
 * platos elegidos y el valor pactado al `switch` de `buildPromoSubtitleText`.
 * El panel nunca redacta el subtítulo a mano ni duplica reglas de negocio.
 */
export function resolveDraftSubtitleCopy(
  form: PromoOfferDraft,
  mainDish: MenuItem | null,
  complementDish: MenuItem | null,
  fallbackPercent: number
): PromoSubtitleTextInput {
  const mechanic = getPromoMechanic(form.mechanic);

  return {
    mechanic: form.mechanic,
    mainDishName: mainDish?.name ?? FALLBACK_PREVIEW_DISH.name,
    discountLabel: formatPromoDiscountLabel(form.discountType, form.discountValue, fallbackPercent),
    complementDishName: mechanic.requiresComplement ? complementDish?.name ?? null : null
  };
}

/** Etiqueta de vigencia que se muestra en la tarjeta de la oferta. */
export function describeOfferTiming(form: PromoOfferDraft, now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');

  if (form.isRecurring) {
    const days = describeWeekdays(form.weekdays);
    const from = form.scheduleFrom || '--:--';
    const to = form.scheduleTo || '--:--';
    return days ? `${days} · ${from} a ${to}` : `Recurrente · ${from} a ${to}`;
  }

  const end = new Date(form.endAt);
  if (Number.isNaN(end.getTime())) return 'Oferta Flash activa';

  const isToday =
    end.getDate() === now.getDate() &&
    end.getMonth() === now.getMonth() &&
    end.getFullYear() === now.getFullYear();

  const time = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  return isToday ? `Termina en ${time} (Hoy)` : `Termina el ${pad(end.getDate())}/${pad(end.getMonth() + 1)} a las ${time}`;
}

/** Badge superior de la tarjeta ('-15% OFF', '2x1 FLASH', '2da -50%', 'MARIDAJE'). */
export function describeOfferBadge(form: PromoOfferDraft, discountPercent: number): string {
  const percent = Math.round(discountPercent);
  switch (form.mechanic) {
    case 'two_for_one':
      return '2x1 FLASH';
    case 'second_unit':
      return `2da -${percent}%`;
    case 'combo':
      return 'MARIDAJE';
    default:
      return `-${percent}% OFF`;
  }
}

/** Nota corta de ahorro/mecánica ('Ahorro S/ 17.25', 'Lleva 2 x 1', '-25% Pack'). */
export function describeOfferNote(
  form: PromoOfferDraft,
  savings: number,
  discountPercent: number
): string {
  const percent = Math.round(discountPercent);
  switch (form.mechanic) {
    case 'two_for_one':
      return 'Lleva 2 x 1';
    case 'second_unit':
      return `2da al ${percent}%`;
    case 'combo':
      return `-${percent}% Pack`;
    default:
      return `Ahorro ${formatSoles(savings)}`;
  }
}

/** Subtítulo corto y real de la tarjeta (maridaje, complemento o tiempo de pase). */
export function composeOfferSubtitle(
  mainDish: MenuItem | null,
  complementDish: MenuItem | null
): string {
  const parts = [
    complementDish
      ? `Incluye ${complementDish.name}`
      : mainDish?.pairing
      ? `Maridaje: ${mainDish.pairing}`
      : '',
    mainDish?.prepTime ?? '',
    mainDish?.dietary ?? ''
  ].filter((part): part is string => Boolean(part));

  return parts.join(' · ') || mainDish?.description || 'Promoción sincronizada con la Carta Digital QR';
}

/** Oferta lista para la lista de "Ofertas Activas Actualmente" (y para Supabase). */
export function buildActiveOffer(
  form: PromoOfferDraft,
  mainDish: MenuItem | null,
  complementDish: MenuItem | null
): ActivePromoOffer {
  const totals = calculateDraftOfferTotals(form, mainDish, complementDish);
  const mechanic = getPromoMechanic(form.mechanic);
  // Badges y notas del panel reflejan el % pactado ("2da -50%", "-25% Pack").
  const declaredPercent = totals.declaredDiscountPercent;

  return {
    id: `promo-${form.mechanic}-${mainDish?.id ?? 'sin-plato'}-${Date.now()}`,
    mechanic: form.mechanic,
    mainDishId: mainDish?.id ?? '',
    complementaryDishId: mechanic.requiresComplement ? complementDish?.id ?? '' : '',
    badge: describeOfferBadge(form, declaredPercent),
    kicker: mechanic.kicker,
    timingLabel: describeOfferTiming(form),
    title: composeOfferName(form, mainDish, complementDish),
    subtitle: composeOfferSubtitle(mainDish, complementDish),
    image: mainDish?.image ?? FALLBACK_PREVIEW_DISH.image,
    originalPrice: totals.precioOriginalTotal,
    promoPrice: totals.precioFinalTotal,
    discountPercent: declaredPercent,
    note: describeOfferNote(form, totals.ahorroTotal, declaredPercent),
    isActive: true
  };
}

