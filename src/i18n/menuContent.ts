/**
 * GastroPulse OS · CD-31
 * Adaptador de CONTENIDO DINÁMICO de la carta del comensal (platos, categorías y
 * ofertas flash), separado del diccionario de interfaz (`translations.ts`).
 *
 * ¿Por qué un módulo aparte?
 *  - La interfaz (botones, placeholders, IGV, modales) es copy ESTÁTICO → `translations.ts`.
 *  - El nombre/descripción de un plato y el título de una oferta vienen de la BASE DE
 *    DATOS (`dishes` / ofertas publicadas por el POS) → aquí viven las reglas.
 *
 * Cómo se traducen los datos dinámicos (decisión de producto):
 *  1. CORTO PLAZO (este ticket): diccionario simulado `DISH_CONTENT_EN` /
 *     `PROMO_OFFER_CONTENT_EN` indexado por el `id` real. Si un plato no está en el
 *     diccionario se muestra su texto original: la carta nunca se rompe ni queda vacía.
 *  2. MEDIANO PLAZO (recomendado): añadir columnas `name_en` / `description_en`
 *     (`tag_en`, `badge_en`, `dietary_en`, `pairing_en`) o un JSONB `i18n` a `dishes`.
 *     `MenuItem` ya declara esos campos opcionales y `localizeMenuItem` los prioriza
 *     automáticamente: no habría que tocar NINGÚN componente.
 *  3. El buscador indexa SIEMPRE ambos idiomas (`searchText`): "octopus" y "pulpo"
 *     encuentran el mismo plato, sin cambiar de idioma.
 */

import type { ActivePromoOffer, MenuItem, PromoMechanic } from '@/types';
import { PROMO_SUBTITLE_NAME_LIMIT, PROMO_SUBTITLE_PAIR_NAME_LIMIT } from '@/utils/promo';
import {
  ALLERGENS_EN,
  DISH_CONTENT_EN,
  DISH_CONTENT_EN_BY_NAME,
  MENU_CATEGORY_META,
  PROMO_OFFER_CONTENT_EN,
  type DishContentOverride
} from './menuContentData';
import { translate, type MenuLanguage } from './translations';

/** Categorías de la barra superior: 'todos' + las categorías reales de la BD. */
export type MenuCategoryId = 'todos' | MenuItem['category'];

/** Pestaña de categoría ya localizada, lista para pintar. */
export interface MenuCategoryTab {
  id: MenuCategoryId;
  label: string;
}

/** Plato enriquecido para la vista: texto localizado + índice de búsqueda bilingüe. */
export interface LocalizedMenuItem extends MenuItem {
  /**
   * Texto normalizado (minúsculas y sin acentos) con los campos de AMBOS idiomas.
   * Permite que el filtro del buscador acierte escribiendo en español o en inglés.
   */
  searchText: string;
}

/** Contexto mínimo para redactar el subtítulo del pop-up (espejo de `utils/promo`). */
export interface MenuPromoSubtitleInput {
  mechanic: PromoMechanic;
  mainDishName: string;
  discountLabel: string;
  complementDishName?: string | null;
}

/** Convierte texto a una forma comparable: minúsculas y sin diacríticos. */
export function normalizeMenuText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Resuelve un campo de contenido: prioriza la columna bilingüe de la BD
 * (`nameEn`, `descriptionEn`, ...) y, si aún no existe, el diccionario simulado.
 * En español devuelve siempre el texto original (la carta local no cambia jamás).
 */
function pickLocalizedField(
  language: MenuLanguage,
  original: string | undefined,
  databaseTranslation: string | undefined,
  mockedTranslation: string | undefined
): string | undefined {
  if (language === 'es') return original;
  return databaseTranslation ?? mockedTranslation ?? original;
}

/**
 * Índice NOMBRE → ficha EN. Los platos creados en vivo (escáner 3D, panel admin)
 * llevan un `id` autogenerado que aquí no se puede prever, pero su nombre en español
 * sí es estable: así "Ají de Gallina Clásico de la Casa" hereda la ficha de
 * "Ají de Gallina" sin tocar la base de datos.
 */
const DISH_NAME_OVERRIDE_INDEX: Array<[string, DishContentOverride]> = Object.entries(
  DISH_CONTENT_EN_BY_NAME
).map(
  ([name, override]) => [normalizeMenuText(name), override] as [string, DishContentOverride]
);

/**
 * Ficha EN de un plato: primero por `id` de la BD (`DISH_CONTENT_EN`) y, si el plato no
 * está en el catálogo base, por su nombre (coincidencia exacta o por prefijo).
 */
function resolveDishOverride(item: MenuItem): DishContentOverride | undefined {
  const byId = DISH_CONTENT_EN[item.id];
  if (byId) return byId;

  const normalizedName = normalizeMenuText(item.name ?? '');
  if (!normalizedName) return undefined;

  const exact = DISH_NAME_OVERRIDE_INDEX.find(([name]) => name === normalizedName);
  if (exact) return exact[1];

  return DISH_NAME_OVERRIDE_INDEX.find(([name]) => normalizedName.startsWith(`${name} `))?.[1];
}

/** Rótulo (ES → EN) del tiempo de preparación tal como llega de la BD. */
const PREP_TIME_LABELS_EN: Record<string, string> = {
  coccion: 'Cooking',
  salteado: 'Stir-fried',
  saltear: 'Sauté',
  parrilla: 'Grill',
  brasa: 'Charcoal',
  horno: 'Baked',
  horneado: 'Baked',
  frito: 'Fried',
  fritura: 'Fried',
  frio: 'Cold',
  armado: 'Plating',
  montaje: 'Plating',
  barra: 'Bar',
  postres: 'Desserts'
};

/**
 * Tiempo de preparación en inglés: usa la ficha simulada cuando existe y, si no,
 * traduce SÓLO el rótulo del texto libre de la BD conservando la cifra original
 * ("Cocción: 12 min" → "Cooking: 12 min").
 */
function localizePrepTime(
  original: string | undefined,
  override: string | undefined,
  language: MenuLanguage
): string | undefined {
  if (language === 'es' || !original) return original;
  if (override) return override;

  const match = original.match(/^([^:]{1,24}):\s*(.+)$/);
  if (!match) return original;

  const label = PREP_TIME_LABELS_EN[normalizeMenuText(match[1])];
  return label ? `${label}: ${match[2].trim()}` : original;
}

/** Pestañas de categoría localizadas (barra superior de la carta). */
export function getMenuCategoryTabs(language: MenuLanguage): MenuCategoryTab[] {
  const tabs = language === 'en' ? MENU_CATEGORY_META.en.tabs : MENU_CATEGORY_META.es.tabs;
  return tabs.map((tab) => ({ id: tab.id, label: tab.label }));
}

/** Etiqueta larga de una categoría real (usada también en el índice de búsqueda). */
export function getMenuCategoryLabel(
  category: MenuItem['category'],
  language: MenuLanguage
): string {
  const labels = language === 'en' ? MENU_CATEGORY_META.en.labels : MENU_CATEGORY_META.es.labels;
  return labels[category] ?? category;
}

/** Índice de búsqueda bilingüe (ES + EN) de un plato, listo para comparar. */
export function buildMenuSearchText(item: MenuItem): string {
  const override = resolveDishOverride(item);
  const parts: Array<string | undefined> = [
    item.name,
    item.nameEn,
    item.description,
    item.descriptionEn,
    item.tag,
    item.tagEn,
    item.badge,
    item.badgeEn,
    item.dietary,
    item.dietaryEn,
    item.pairing,
    item.pairingEn,
    getMenuCategoryLabel(item.category, 'es'),
    getMenuCategoryLabel(item.category, 'en'),
    override?.name,
    override?.description,
    override?.tag,
    override?.badge,
    override?.dietary,
    override?.pairing,
    ...(item.allergens ?? []),
    ...(override?.allergens ?? [])
  ];

  return normalizeMenuText(parts.filter((part): part is string => Boolean(part)).join(' '));
}

/** Traduce los alérgenos conocidos; los desconocidos se muestran tal cual llegan. */
export function localizeAllergens(
  allergens: string[] | undefined,
  language: MenuLanguage
): string[] | undefined {
  if (!allergens || language === 'es') return allergens;
  return allergens.map((allergen) => ALLERGENS_EN[allergen] ?? allergen);
}

/** Plato listo para pintar: copy localizado + índice de búsqueda bilingüe. */
export function localizeMenuItem(item: MenuItem, language: MenuLanguage): LocalizedMenuItem {
  const override = resolveDishOverride(item);

  return {
    ...item,
    name: pickLocalizedField(language, item.name, item.nameEn, override?.name) ?? item.name,
    description:
      pickLocalizedField(language, item.description, item.descriptionEn, override?.description) ??
      item.description,
    tag: pickLocalizedField(language, item.tag, item.tagEn, override?.tag),
    badge: pickLocalizedField(language, item.badge, item.badgeEn, override?.badge),
    dietary: pickLocalizedField(language, item.dietary, item.dietaryEn, override?.dietary),
    pairing: pickLocalizedField(language, item.pairing, item.pairingEn, override?.pairing),
    prepTime: localizePrepTime(item.prepTime, override?.prepTime, language),
    allergens: localizeAllergens(item.allergens, language),
    searchText: buildMenuSearchText(item)
  };
}

/** Igual que `localizeMenuItem`, para listas completas (memoizar en el consumidor). */
export function localizeMenuItems(items: MenuItem[], language: MenuLanguage): LocalizedMenuItem[] {
  return items.map((item) => localizeMenuItem(item, language));
}

/**
 * Nombre localizado de un plato SIN recalcular el índice de búsqueda: se usa en el
 * carrito y en el historial de pedidos, donde solo hace falta el título.
 */
export function localizeMenuItemName(item: MenuItem, language: MenuLanguage): string {
  const override = resolveDishOverride(item);
  return pickLocalizedField(language, item.name, item.nameEn, override?.name) ?? item.name;
}

/** Oferta flash localizada (título, subtítulo, kicker, badge y vigencia). */
export function localizePromoOffer(offer: ActivePromoOffer, language: MenuLanguage): ActivePromoOffer {
  if (language === 'es') return offer;
  const override = PROMO_OFFER_CONTENT_EN[offer.id];
  return override ? { ...offer, ...override } : offer;
}

/** Recorta nombres largos en el borde de palabra (`…`), igual que el pop-up original. */
function truncatePromoDishName(name: string, limit: number): string {
  const clean = name.replace(/\s+/g, ' ').trim();
  if (limit <= 0 || clean.length <= limit) return clean;

  const slice = clean.slice(0, limit);
  const lastSpace = slice.lastIndexOf(' ');
  const clipped = lastSpace > limit * 0.5 ? slice.slice(0, lastSpace) : slice;
  return `${clipped.trimEnd()}…`;
}

/**
 * Subtítulo del pop-up "¡Oferta Especial!" ya localizado. Un `switch` por mecánica
 * (espejo del de `buildPromoSubtitleText`) garantiza un mensaje honesto en ambos
 * idiomas: el 2x1 nunca menciona un porcentaje y el descuento nombra su plato real.
 */
export function buildMenuPromoSubtitle(
  { mechanic, mainDishName, discountLabel, complementDishName }: MenuPromoSubtitleInput,
  language: MenuLanguage
): string {
  const main = truncatePromoDishName(mainDishName, PROMO_SUBTITLE_NAME_LIMIT);
  const mainPair = truncatePromoDishName(mainDishName, PROMO_SUBTITLE_PAIR_NAME_LIMIT);
  const complement = complementDishName
    ? truncatePromoDishName(complementDishName, PROMO_SUBTITLE_PAIR_NAME_LIMIT)
    : '';

  switch (mechanic) {
    // Lleva 2 y paga 1: mencionar un porcentaje aquí confunde y sobra.
    case 'two_for_one':
      return translate(language, 'promo.mechanicTwoForOne', { dish: main }).toUpperCase();

    // La rebaja recae SÓLO en la segunda unidad: el copy debe decir exactamente eso.
    case 'second_unit':
      return complement
        ? translate(language, 'promo.mechanicSecondUnit', {
            main: mainPair,
            discount: discountLabel,
            complement
          }).toUpperCase()
        : translate(language, 'promo.mechanicDiscount', {
            discount: discountLabel,
            dish: main
          }).toUpperCase();

    // Pack completo: se anuncian ambos platos y el descuento sobre el conjunto.
    case 'combo':
      return complement
        ? translate(language, 'promo.mechanicCombo', {
            discount: discountLabel,
            main: mainPair,
            complement
          }).toUpperCase()
        : translate(language, 'promo.mechanicDiscount', {
            discount: discountLabel,
            dish: main
          }).toUpperCase();

    // Descuento directo sobre el plato principal (y respaldo de todas las demás).
    case 'discount':
    default:
      return translate(language, 'promo.mechanicDiscount', {
        discount: discountLabel,
        dish: main
      }).toUpperCase();
  }
}

/** Texto alternativo de la 2ª foto del pop-up (mecánicas de dos platos). */
export function buildPromoSecondDishAltText(
  dishName: string | null | undefined,
  language: MenuLanguage
): string {
  return dishName
    ? translate(language, 'promo.secondDishNamed', { dish: dishName })
    : translate(language, 'promo.secondDish');
}
