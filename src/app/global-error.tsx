'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Último recurso cuando falla el layout raíz: avisa a Sentry y muestra una
 * pantalla mínima (no tiene los estilos globales de la app, por eso van en línea).
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b0c0e', color: '#e5e1e4', fontFamily: 'system-ui, sans-serif' }}>
        <title>Algo salió mal</title>
        <main style={{ maxWidth: 360, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, color: '#a1a1aa', margin: '0 0 20px' }}>
            Ya nos llegó el aviso del error. Vuelve a intentarlo en unos segundos.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ minHeight: 44, padding: '0 20px', border: 0, borderRadius: 12, background: '#ff5708', color: '#2b0b00', fontWeight: 700, cursor: 'pointer' }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
