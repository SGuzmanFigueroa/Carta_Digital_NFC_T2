'use client';

import Image from 'next/image';

/**
 * Foto de plato optimizada (Tarea 35). Con next/image el navegador recibe la
 * foto redimensionada a su pantalla y en WebP/AVIF. Solo se optimizan rutas
 * propias y los servidores declarados en next.config (images.remotePatterns);
 * una URL de cualquier otro origen (pegada por el admin, base64) se muestra tal
 * cual para no romperse.
 */
const OPTIMIZABLE_HOSTS = new Set(['lh3.googleusercontent.com', 'images.unsplash.com']);

function canOptimize(src: string): boolean {
  if (src.startsWith('/')) return !src.startsWith('//');
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && OPTIMIZABLE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

interface DishImageProps {
  src?: string | null;
  alt: string;
  /** Ancho que ocupa la imagen en pantalla, p. ej. "(min-width: 640px) 50vw, 100vw". */
  sizes: string;
  /** true solo para la imagen principal visible al cargar (mejora el LCP). */
  priority?: boolean;
  className?: string;
  draggable?: boolean;
}

/** Ocupa todo su contenedor (que debe tener position relative/absolute y tamaño). */
export function DishImage({ src, alt, sizes, priority = false, className, draggable }: DishImageProps) {
  if (!src) return null;
  if (!canOptimize(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- origen no optimizable (ver canOptimize)
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        draggable={draggable}
        className={`absolute inset-0 h-full w-full ${className ?? ''}`}
      />
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} draggable={draggable} className={className} />;
}
