/** Identificador de la configuración del local en la instalación actual de Supabase. */
export const RESTAURANT_ID = 'primary';
export const SYSTEM_CONFIG_STORAGE_KEY = 'gastropulse_system_config';
export const SYSTEM_CONFIG_CHANGED_EVENT = 'gastropulse:system-config-changed';

export interface RestaurantIdentity {
  branchName: string;
  email: string;
  branchRuc: string;
}

/** Respaldo de presentación; los datos editables de system_config tienen prioridad. */
export const DEFAULT_RESTAURANT_IDENTITY: Readonly<RestaurantIdentity> = {
  branchName: 'AUREA Bistro - Miraflores',
  email: 'gerencia@aureabistro.pe',
  branchRuc: '20608941203',
};

export function restaurantIdentity(config?: Partial<RestaurantIdentity> | null): RestaurantIdentity {
  const text = (value: unknown, fallback: string) =>
    typeof value === 'string' && value.trim() ? value.trim() : fallback;
  return {
    branchName: text(config?.branchName, DEFAULT_RESTAURANT_IDENTITY.branchName),
    email: text(config?.email, DEFAULT_RESTAURANT_IDENTITY.email),
    branchRuc: text(config?.branchRuc, DEFAULT_RESTAURANT_IDENTITY.branchRuc),
  };
}

/** Solo para plantillas HTML de impresión; JSX ya escapa sus textos. */
export function escapeRestaurantHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}
