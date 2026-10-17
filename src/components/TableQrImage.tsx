'use client';

import { useEffect, useState } from 'react';
import { qrDataUrl, type QrColor } from '@/utils/tableQr';

interface TableQrImageProps {
  value: string;
  size: number;
  color?: QrColor;
  alt: string;
  className?: string;
}

/** QR generado en el navegador (sin enviar la URL de la mesa a terceros). */
export function TableQrImage({ value, size, color = 'black', alt, className }: TableQrImageProps) {
  const [src, setSrc] = useState<{ value: string; url: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    qrDataUrl(value, size, color)
      .then((url) => {
        if (!cancelled) setSrc({ value, url });
      })
      .catch((err) => console.warn('[qr] No se pudo generar el código:', err));
    return () => {
      cancelled = true;
    };
  }, [value, size, color]);

  if (!src || src.value !== value) {
    return <div className={`${className ?? ''} animate-pulse bg-neutral-200/40 rounded`} aria-label={alt} role="img" />;
  }
  // eslint-disable-next-line @next/next/no-img-element -- data URL local, next/image no aporta aquí
  return <img src={src.url} alt={alt} className={className} width={size} height={size} />;
}
