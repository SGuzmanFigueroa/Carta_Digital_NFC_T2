import type { Metadata } from 'next';

/**
 * GastroPulse OS · CD-26 · Layout de la vista pública del comensal (/menu).
 *
 * Su única responsabilidad es acotar a esta ruta los metadatos que hacen
 * instalable la carta digital: el enlace al manifiesto PWA y los iconos que
 * Chrome/Android y iOS/Safari leen para "Añadir a pantalla de inicio".
 * El resto del sistema (panel, KDS, login) queda intacto.
 */
export const metadata: Metadata = {
  applicationName: 'Carta Digital',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Carta Digital',
    // Barra de estado opaca: la cabecera sticky de la carta no reserva
    // safe-area superior, así que `black-translucent` la dejaría bajo el notch.
    statusBarStyle: 'black'
  },
  icons: {
    icon: [{ url: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' }]
  },
  // Next 16 solo emite la variante moderna `mobile-web-app-capable`; iOS
  // anterior a 16.4 sigue necesitando la etiqueta heredada para abrir la carta
  // a pantalla completa desde la pantalla de inicio.
  other: {
    'apple-mobile-web-app-capable': 'yes'
  }
};

export default function ComensalMenuLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
