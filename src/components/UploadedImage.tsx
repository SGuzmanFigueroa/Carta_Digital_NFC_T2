import type { ImgHTMLAttributes } from 'react';

/**
 * Imagen que sube el usuario (logo, QR de Yape/Plin, voucher, foto de cámara).
 * Suelen ser data URLs o de cualquier origen, que next/image no puede optimizar;
 * para fotos de platos usar DishImage.
 */
export function UploadedImage({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- ver comentario del componente
  return <img alt={alt} decoding="async" {...props} />;
}
