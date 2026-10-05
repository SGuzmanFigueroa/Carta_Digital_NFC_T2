/**
 * GastroPulse OS - Promo Engine (Ofertas Flash de la Carta Digital QR)
 * Cálculo puro y determinista de descuentos, ahorro real y cuenta regresiva
 * para el pop-up promocional del comensal. Sin dependencias de React.
 */

import type { PromoDiscountType, PromoMechanic } from '@/types';

export interface PromoPricing {
  /** Precio de lista original del plato (S/). */
  originalPrice: number;
  /** Precio final con el descuento aplicado (S/). */
  promoPrice: number;
  /** Ahorro absoluto real para el comensal (S/). */
  savings: number;
  /** Porcentaje de descuento efectivo aplicado (0 - 100). */
  discountPercent: number;
}

/** Redondeo financiero a 2 decimales (evita 97.75000000000001). */
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Normaliza un precio a céntimos enteros (NaN, Infinity y negativos ⇒ 0). */
const toCents = (value: number) => (Number.isFinite(value) ? Math.round(Math.max(0, value) * 100) : 0);

/**
 * Calcula el precio promocional y el ahorro real de un plato.
 * Blindado contra valores inválidos (NaN, negativos o > 100%).
 */
export function calculatePromoPricing(originalPrice: number, discountPercent: number): PromoPricing {
  const safePrice = Number.isFinite(originalPrice) ? Math.max(0, originalPrice) : 0;
  const safePercent = Number.isFinite(discountPercent)
    ? Math.min(100, Math.max(0, discountPercent))
    : 0;

  const promoPrice = round2(safePrice * (1 - safePercent / 100));

  return {
    originalPrice: round2(safePrice),
    promoPrice,
    savings: round2(safePrice - promoPrice),
    discountPercent: safePercent
  };
}

// =============================================================================
// CD-17 · MOTOR DE PRECIOS DE LAS OFERTAS FLASH (4 mecánicas promocionales)
// =============================================================================

/** Entrada del motor: mecánica + valor del descuento + precios reales de carta. */
export interface PromoOfferTotalsInput {
  mechanic: PromoMechanic;
  discountType: PromoDiscountType;
  /** Valor escrito por el administrador ('' o inválido se interpretan como 0). */
  discountValue: string | number;
  /** Precio de lista del plato principal (S/). */
  mainPrice: number;
  /** Precio del plato complementario (S/): 0 si la mecánica no lo usa. */
  complementPrice: number;
}

/** Totales REALES de una oferta: única fuente de verdad de la matemática. */
export interface PromoOfferTotals {
  /** Precio normalizado del plato principal (S/). */
  mainPrice: number;
  /** Precio normalizado del complemento (S/). */
  complementPrice: number;
  /** Precio Original Total: lo que costaría la promoción sin descuento (S/). */
  precioOriginalTotal: number;
  /** Precio Final Total: lo que realmente paga el comensal (S/). */
  precioFinalTotal: number;
  /** Ahorro Total real (S/) = precioOriginalTotal - precioFinalTotal. */
  ahorroTotal: number;
  /** Descuento efectivo (%) sobre el precio original total (UI y pop-up). */
  effectiveDiscountPercent: number;
  /**
   * Porcentaje PACTADO sobre la base propia de la mecánica: la 2ª unidad en
   * `second_unit`, el pack completo en `combo`, el Plato 1 en `discount` y 50%
   * en el 2x1. Es el % que se muestra en badges y notas del panel
   * ("2da -50%", "-25% Pack").
   */
  declaredDiscountPercent: number;
}

/**
 * Calcula `precioOriginalTotal`, `precioFinalTotal` y `ahorroTotal` según la
 * mecánica promocional elegida:
 *
 *  1. `discount`    → sólo el Plato Principal: el descuento recae en su precio.
 *  2. `two_for_one` → la 2ª unidad es IDÉNTICA a la 1ª (no se pide segundo
 *                     plato): Original = 2 × P1 y Final = P1, es decir 50% sobre
 *                     el par; el valor del formulario se ignora.
 *  3. `second_unit` → el descuento (%) o monto (S/) recae EXCLUSIVAMENTE en el
 *                     Plato 2: Original = P1 + P2 y Final = Original - dto(P2).
 *  4. `combo`       → el descuento se aplica a la SUMA del pack (P1 + P2).
 *
 * Blindado contra NaN: un valor de descuento vacío o inválido se trata como 0,
 * el ahorro nunca supera al precio original y ningún monto queda en negativo.
 */
export function calculateOfferTotals({
  mechanic,
  discountType,
  discountValue,
  mainPrice,
  complementPrice
}: PromoOfferTotalsInput): PromoOfferTotals {
  // Toda la aritmética se resuelve en CÉNTIMOS enteros: elimina las derivas de
  // coma flotante (38.17 vs 38.18) y garantiza que `original - final` sea
  // exactamente el ahorro, al céntimo.
  const price1Cents = toCents(mainPrice);
  const price2Cents = toCents(complementPrice);

  // El input puede quedar vacío (''): se interpreta como 0, jamás como NaN.
  const raw = typeof discountValue === 'string' ? discountValue.trim() : discountValue;
  const parsed = raw === '' ? 0 : Number(raw);
  const amount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  const percent = Math.min(100, amount);

  const amountCents = Math.round(amount * 100);

  /**
   * Ahorro (en céntimos) sobre la base propia de la mecánica:
   *  - Monto fijo (S/): se descuenta el importe literal, sin exceder la base.
   *  - Porcentaje: se redondea el precio FINAL y el ahorro se deriva de él (la
   *    misma fórmula clásica que ya usaba la carta viva).
   */
  const savingsOverCents = (baseCents: number, capCents: number) =>
    discountType === 'fixed'
      ? Math.min(amountCents, baseCents, capCents)
      : Math.min(capCents, baseCents - Math.round((baseCents * (100 - percent)) / 100));

  let originalCents: number;
  let savedCents: number;
  /** Base propia de cada mecánica: sobre ella se pactó el descuento. */
  let baseCents: number;

  switch (mechanic) {
    case 'two_for_one':
      // Lleva 2 y paga 1: el valor del formulario no interviene (50% implícito).
      originalCents = price1Cents * 2;
      savedCents = price1Cents;
      baseCents = price1Cents;
      break;
    case 'second_unit':
      // La rebaja es SÓLO de la segunda unidad / complemento.
      originalCents = price1Cents + price2Cents;
      savedCents = savingsOverCents(price2Cents, originalCents);
      baseCents = price2Cents;
      break;
    case 'combo':
      // Pack completo: la rebaja se calcula sobre la suma de ambos platos.
      originalCents = price1Cents + price2Cents;
      savedCents = savingsOverCents(originalCents, originalCents);
      baseCents = originalCents;
      break;
    case 'discount':
    default:
      // Sólo existe el Plato Principal: el complemento nunca suma al precio.
      originalCents = price1Cents;
      savedCents = savingsOverCents(price1Cents, originalCents);
      baseCents = price1Cents;
      break;
  }

  const precioOriginalTotal = originalCents / 100;
  const precioFinalTotal = (originalCents - savedCents) / 100;
  const ahorroTotal = savedCents / 100;

  return {
    mainPrice: price1Cents / 100,
    complementPrice: price2Cents / 100,
    precioOriginalTotal,
    precioFinalTotal,
    ahorroTotal,
    effectiveDiscountPercent:
      precioOriginalTotal > 0 ? (ahorroTotal / precioOriginalTotal) * 100 : 0,
    declaredDiscountPercent:
      mechanic === 'two_for_one'
        ? 50 // Lleva 2 y paga 1 (no depende del valor escrito en el formulario).
        : discountType === 'percent'
        ? percent // El % pactado es exactamente el escrito por el administrador.
        : baseCents > 0
        ? (savedCents / baseCents) * 100
        : 0
  };
}

// =============================================================================
// CD-16 · COPY DEL POP-UP PROMOCIONAL (subtítulo "¡OFERTA ESPECIAL!")
// =============================================================================

/** Límite de caracteres del nombre del plato en mecánicas de UN solo plato. */
export const PROMO_SUBTITLE_NAME_LIMIT = 40;
/** Límite por plato en mecánicas de DOS platos (2da Unidad / Combo): evita 4 líneas. */
export const PROMO_SUBTITLE_PAIR_NAME_LIMIT = 32;

/** Contexto mínimo e independiente del idioma del diseño para redactar el subtítulo. */
export interface PromoSubtitleTextInput {
  /** Mecánica activa: define por completo la plantilla del mensaje. */
  mechanic: PromoMechanic;
  /** Nombre REAL del Plato Principal (sin prefijos de mecánica ni "+"). */
  mainDishName: string;
  /** Descuento ya formateado para mostrar: '50%' o 'S/ 10.00'. */
  discountLabel: string;
  /** Complemento: solo se usa en "2da Unidad %" y "Combo / Maridaje". */
  complementDishName?: string | null;
}

/** Mayúsculas del diseño impactante del pop-up original. */
const toUpper = (text: string) => text.toUpperCase();

/** Recorta nombres larguísimos en el borde de palabra (`…`) para no romper el móvil. */
function truncateDishName(name: string, limit: number): string {
  const clean = name.replace(/\s+/g, ' ').trim();
  if (limit <= 0 || clean.length <= limit) return clean;

  const slice = clean.slice(0, limit);
  const lastSpace = slice.lastIndexOf(' ');
  const clipped = lastSpace > limit * 0.5 ? slice.slice(0, lastSpace) : slice;
  return `${clipped.trimEnd()}…`;
}

/**
 * Etiqueta del descuento lista para el copy, respetando el tipo pactado por el
 * administrador: un monto fijo se muestra como 'S/ 10.00' (jamás como un % falso)
 * y un input vacío o inválido cae al % real que ya calculó el motor de ofertas.
 */
export function formatPromoDiscountLabel(
  discountType: PromoDiscountType,
  discountValue: string | number,
  fallbackPercent = 0
): string {
  const raw = typeof discountValue === 'string' ? discountValue.trim() : discountValue;
  const parsed = raw === '' ? 0 : Number(raw);
  const amount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  const percent = Math.max(0, Math.round(fallbackPercent));

  if (discountType === 'fixed') return amount > 0 ? formatSoles(amount) : `${percent}%`;
  return `${Math.round(amount > 0 ? Math.min(100, amount) : percent)}%`;
}

/**
 * Subtítulo EXACTO que se imprime bajo "¡OFERTA ESPECIAL!" en el pop-up móvil.
 * Un `switch` por mecánica (sin if/else anidados) garantiza un mensaje honesto
 * que el comensal entiende en segundos y que no confunde al momento de cobrar:
 *
 *  · Descuento %/$ │ `15% DE DESCUENTO EN EL LOMO SALTADO`
 *  · 2x1 Flash     │ `2X1 EN ESFERA DE CHOCOLATE`  (sin porcentajes)
 *  · 2da Unidad %  │ `LLEVA SMOKED OLD FASHIONED Y OBTÉN 6% DE DCTO EN EL LOMO SALTADO`
 *  · Combo/Maridaje│ `10% DE DESCUENTO EN COMBO: ESFERA DE CHOCOLATE + AJÍ DE GALLINA`
 *
 * Si un plato no está disponible, la mecánica degrada al copy estándar (nunca
 * deja el subtítulo vacío ni promete un descuento sobre un plato inexistente).
 */
export function buildPromoSubtitleText({
  mechanic,
  mainDishName,
  discountLabel,
  complementDishName
}: PromoSubtitleTextInput): string {
  const main = truncateDishName(mainDishName, PROMO_SUBTITLE_NAME_LIMIT);
  const mainPair = truncateDishName(mainDishName, PROMO_SUBTITLE_PAIR_NAME_LIMIT);
  const complement = complementDishName
    ? truncateDishName(complementDishName, PROMO_SUBTITLE_PAIR_NAME_LIMIT)
    : '';

  switch (mechanic) {
    // Lleva 2 y paga 1: mencionar un porcentaje aquí confunde y sobra.
    case 'two_for_one':
      return toUpper(`2x1 en ${main}`);

    // La rebaja recae SÓLO en la segunda unidad: el copy debe decir exactamente eso.
    case 'second_unit':
      return complement
        ? toUpper(`Lleva ${mainPair} y obtén ${discountLabel} de dcto en el ${complement}`)
        : toUpper(`${discountLabel} de descuento en el ${main}`);

    // Pack completo: se anuncian ambos platos y el descuento sobre el conjunto.
    case 'combo':
      return complement
        ? toUpper(`${discountLabel} de descuento en combo: ${mainPair} + ${complement}`)
        : toUpper(`${discountLabel} de descuento en el ${main}`);

    // Descuento directo sobre el plato principal (y respaldo de todas las demás).
    case 'discount':
    default:
      return toUpper(`${discountLabel} de descuento en el ${main}`);
  }
}

/** Formatea montos en soles peruanos: `formatSoles(97.75) -> "S/ 97.75"`. */
export function formatSoles(value: number): string {
  return `S/ ${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
}

/** Convierte segundos en cuenta regresiva `mm:ss` (755 -> "12:35"). */
export function formatPromoCountdown(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
