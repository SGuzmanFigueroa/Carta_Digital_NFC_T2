/**
 * GastroPulse OS · CD-101
 * Copy visible del estado de cocina en la vista del comensal (historial de mesa).
 *
 * El estado persistido NO cambia: sigue siendo el literal del dominio
 * (`KitchenDishStatus` en `src/types.ts`), que comparten cocina, KDS y comensal.
 * Aquí solo se resuelve la clave de traducción que pinta cada literal, para que
 * el historial respete el selector ES/EN sin tocar la lógica de negocio.
 */
import type { KitchenDishStatus } from '@/types';
import type { TranslationKey } from './translations';

export const KITCHEN_STATUS_LABEL_KEYS: Record<KitchenDishStatus, TranslationKey> = {
  Recibido: 'tracker.received',
  'En preparación': 'tracker.inKitchen',
  'Listo en pase': 'tracker.ready',
  Entregado: 'tracker.served'
};
