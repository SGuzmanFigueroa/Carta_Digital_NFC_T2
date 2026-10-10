import type { MetadataRoute } from 'next';

/**
 * GastroPulse OS · CD-26 · Manifiesto PWA de la carta digital del comensal.
 *
 * Next publica este archivo en `/manifest.webmanifest` con el Content-Type
 * correcto (`application/manifest+json`) y tipado estricto, sin JSON a mano.
 *
 * Es un requisito REAL del ticket: sin un manifiesto válido (name, start_url,
 * display e iconos de 192 y 512 px) Chrome en Android NUNCA dispara el evento
 * `beforeinstallprompt`, por lo que el banner no tendría nada que ofrecer.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/menu',
    name: 'Carta Digital · AUREA BISTRO',
    short_name: 'Carta Digital',
    description:
      'Carta digital interactiva con pedidos QR, visor 3D de platos, llamado a garzón y pago móvil.',
    start_url: '/menu',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: '#0b0c0e',
    theme_color: '#0b0c0e',
    lang: 'es',
    dir: 'ltr',
    categories: ['food', 'shopping'],
    prefer_related_applications: false,
    icons: [
      { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/pwa-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };
}
