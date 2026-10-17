import { supabase } from '@/lib/supabase';
import type { ActivePromoOffer, MenuItem } from '@/types';
import type { Database } from '@/types/database.types';
import { calculatePromoPricing } from '@/utils/promo';

type PromoOfferRow = Database['public']['Tables']['promo_offers']['Row'];

/** Textos de la tarjeta guardados en `promo_offers.display`. */
type PromoOfferDisplay = Pick<
  ActivePromoOffer,
  'badge' | 'kicker' | 'timingLabel' | 'title' | 'subtitle' | 'image' | 'note'
>;

/**
 * Convierte la fila en la oferta que pintan el panel y la carta. El precio se
 * deriva del precio ACTUAL del plato con la misma fórmula que usa place_order,
 * así lo que ve el comensal coincide con lo que se cobra.
 */
export function rowToPromoOffer(row: PromoOfferRow, catalog: MenuItem[]): ActivePromoOffer {
  const display = (row.display ?? {}) as Partial<PromoOfferDisplay>;
  const dish = catalog.find((item) => item.id === row.main_dish_id);
  const pricing = calculatePromoPricing(dish?.price ?? 0, Number(row.discount_percent));
  return {
    id: row.id,
    mechanic: row.mechanic as ActivePromoOffer['mechanic'],
    mainDishId: row.main_dish_id,
    complementaryDishId: row.complementary_dish_id ?? '',
    badge: display.badge ?? '',
    kicker: display.kicker ?? '',
    timingLabel: display.timingLabel ?? '',
    title: display.title ?? dish?.name ?? '',
    subtitle: display.subtitle ?? '',
    image: display.image ?? dish?.image ?? '',
    note: display.note ?? '',
    originalPrice: pricing.originalPrice,
    promoPrice: pricing.promoPrice,
    discountPercent: pricing.discountPercent,
    isActive: row.is_active
  };
}

/**
 * Ofertas para el panel (todas) o para la carta (`onlyLive`: activas y dentro
 * de su vigencia). Lanza si Supabase falla, para que la interfaz lo muestre.
 */
export async function fetchPromoOffers(options: { onlyLive?: boolean } = {}): Promise<PromoOfferRow[]> {
  let query = supabase.from('promo_offers').select('*').order('priority').order('created_at', { ascending: false });
  if (options.onlyLive) {
    const now = new Date().toISOString();
    query = query
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createPromoOffer(
  offer: ActivePromoOffer,
  schedule: { startsAt?: string | null; endsAt?: string | null; priority?: number } = {}
): Promise<PromoOfferRow> {
  const display: PromoOfferDisplay = {
    badge: offer.badge,
    kicker: offer.kicker,
    timingLabel: offer.timingLabel,
    title: offer.title,
    subtitle: offer.subtitle,
    image: offer.image,
    note: offer.note
  };
  const { data, error } = await supabase
    .from('promo_offers')
    .insert({
      mechanic: offer.mechanic,
      main_dish_id: offer.mainDishId,
      complementary_dish_id: offer.complementaryDishId || null,
      discount_percent: offer.discountPercent,
      is_active: offer.isActive,
      starts_at: schedule.startsAt ?? null,
      ends_at: schedule.endsAt ?? null,
      priority: schedule.priority ?? 3,
      display
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setPromoOfferActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('promo_offers')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
