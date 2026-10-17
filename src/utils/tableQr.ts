import QRCode from 'qrcode';

/**
 * QR de mesa (Tarea 9). La URL lleva el código secreto de la mesa (&t=…) que
 * exige el servidor para aceptar pedidos. El QR se dibuja en el navegador: antes
 * se pedía a api.qrserver.com, que habría recibido la URL (y el código) de
 * cada mesa.
 */
export type QrColor = 'brand' | 'black';

export function tableMenuUrl(origin: string, tableLabel: string, token?: string, zone?: string): string {
  const params = new URLSearchParams({ mesa: tableLabel });
  if (zone) params.set('zona', zone);
  if (token) params.set('t', token);
  return `${origin}/menu?${params.toString()}`;
}

/** Imagen PNG (data URL) del QR. Corrección de errores alta: admite el logo encima. */
export function qrDataUrl(text: string, size: number, color: QrColor = 'black'): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: color === 'brand' ? '#ff5a1f' : '#000000', light: '#ffffff' }
  });
}

/** Número de mesa de una etiqueta ("Mesa 13 (Terraza)" → 13). */
export function tableNumberFromLabel(label: string): number | null {
  const digits = label.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}
