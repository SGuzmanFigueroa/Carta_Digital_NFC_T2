import type { MenuItem } from '@/types';

export type MenuCartItem = { item: MenuItem; quantity: number; notes?: string };

/** Un mismo plato puede estar dos veces en el carrito: a precio de carta y en oferta. */
export const cartLineKey = (item: MenuItem) =>
  item.appliedPromoOfferId ? `${item.id}|promo:${item.appliedPromoOfferId}` : item.id;
