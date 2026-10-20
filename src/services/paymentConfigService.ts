import { RESTAURANT_ID } from '@/config/restaurant';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database.types';

export interface PaymentGatewayConfig {
  titularName: string;
  phoneNumber: string;
  yapeQrImage: string | null;
  plinQrImage: string | null;
  acceptYape: boolean;
  acceptPlin: boolean;
  acceptPos: boolean;
  acceptCash: boolean;
  updatedAt: string;
}

/**
 * Fuente de verdad: system_config.payment_config (Supabase). El localStorage es
 * solo un caché para pintar al instante; antes era el único lugar donde vivía,
 * así que el celular del comensal nunca veía el número real del restaurante.
 */
const STORAGE_KEY_PAYMENT_CONFIG = 'gastropulse_payment_config_v1';
export const PAYMENT_CONFIG_UPDATED_EVENT = 'gastropulse_payment_config_updated';
/** Se emite si no se pudo guardar en Supabase (el panel muestra el aviso). */
export const CONFIG_SYNC_ERROR_EVENT = 'gastropulse_config_sync_error';

export const DEFAULT_PAYMENT_CONFIG: PaymentGatewayConfig = {
  titularName: 'ÁUREA BISTRO S.A.C.',
  phoneNumber: '987 654 321',
  yapeQrImage: null,
  plinQrImage: null,
  acceptYape: true,
  acceptPlin: true,
  acceptPos: true,
  acceptCash: true,
  updatedAt: new Date().toISOString()
};

function writeCache(config: PaymentGatewayConfig) {
  try {
    localStorage.setItem(STORAGE_KEY_PAYMENT_CONFIG, JSON.stringify(config));
  } catch {
    // Caché lleno (imágenes QR grandes) o bloqueado: Supabase sigue siendo la fuente.
  }
  window.dispatchEvent(new CustomEvent(PAYMENT_CONFIG_UPDATED_EVENT, { detail: config }));
}

/** Última configuración conocida (caché), para pintar sin esperar a la red. */
export function getPaymentConfig(): PaymentGatewayConfig {
  if (typeof window === 'undefined') return DEFAULT_PAYMENT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYMENT_CONFIG);
    if (!raw) return DEFAULT_PAYMENT_CONFIG;
    return { ...DEFAULT_PAYMENT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PAYMENT_CONFIG;
  }
}

/** Lee la configuración real desde Supabase y actualiza el caché. */
export async function loadPaymentConfig(): Promise<PaymentGatewayConfig> {
  const { data, error } = await supabase.from('system_config').select('payment_config').eq('id', RESTAURANT_ID).maybeSingle();
  if (error || !data) return getPaymentConfig();
  const stored = (data.payment_config ?? {}) as Partial<PaymentGatewayConfig>;
  if (Object.keys(stored).length === 0) return getPaymentConfig();
  const config = { ...DEFAULT_PAYMENT_CONFIG, ...stored };
  writeCache(config);
  return config;
}

/**
 * Guarda la configuración (solo el admin puede: RLS). Actualiza la pantalla al
 * instante y la persiste en Supabase; si falla, emite CONFIG_SYNC_ERROR_EVENT.
 */
export function savePaymentConfig(config: Partial<PaymentGatewayConfig>): PaymentGatewayConfig {
  const updated: PaymentGatewayConfig = { ...getPaymentConfig(), ...config, updatedAt: new Date().toISOString() };
  writeCache(updated);

  void supabase
    .from('system_config')
    .update({ payment_config: updated as unknown as Json, updated_at: updated.updatedAt })
    .eq('id', RESTAURANT_ID)
    .select('id')
    .then(({ data, error }) => {
      if (error || !data?.length) {
        console.error('[pagos] No se guardó la configuración en Supabase:', error?.message ?? 'sin permiso');
        window.dispatchEvent(
          new CustomEvent(CONFIG_SYNC_ERROR_EVENT, {
            detail: 'No se guardaron los datos de pago en el servidor. Revisa tu sesión de administrador.'
          })
        );
      }
    });

  return updated;
}

/**
 * Migración única: si la base aún no tiene datos de pago pero el navegador del
 * admin sí (versión anterior), los sube a Supabase. Solo tiene efecto con
 * sesión de admin (RLS); para el resto no hace nada.
 */
export async function migrateLocalPaymentConfigToDb(): Promise<void> {
  if (typeof window === 'undefined' || !localStorage.getItem(STORAGE_KEY_PAYMENT_CONFIG)) return;
  const { data, error } = await supabase.from('system_config').select('payment_config').eq('id', RESTAURANT_ID).maybeSingle();
  if (error || !data) return;
  if (Object.keys((data.payment_config ?? {}) as object).length === 0) savePaymentConfig(getPaymentConfig());
}
