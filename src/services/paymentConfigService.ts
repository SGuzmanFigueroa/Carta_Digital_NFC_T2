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

const STORAGE_KEY_PAYMENT_CONFIG = 'gastropulse_payment_config_v1';

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

export function getPaymentConfig(): PaymentGatewayConfig {
  if (typeof window === 'undefined') return DEFAULT_PAYMENT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYMENT_CONFIG);
    if (!raw) return DEFAULT_PAYMENT_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PAYMENT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_PAYMENT_CONFIG;
  }
}

export function savePaymentConfig(config: Partial<PaymentGatewayConfig>): PaymentGatewayConfig {
  const current = getPaymentConfig();
  const updated: PaymentGatewayConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_KEY_PAYMENT_CONFIG, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gastropulse_payment_config_updated', { detail: updated }));
    }
  } catch (err) {
    console.warn('Error saving payment config to localStorage:', err);
  }

  return updated;
}
