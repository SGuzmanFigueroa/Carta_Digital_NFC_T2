import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/sentryOptions';

// Errores del navegador (carta y panel) hacia Sentry. Corre antes de que la app
// sea interactiva; sin DSN no hace nada.
try {
  Sentry.init(sentryOptions);
} catch (err) {
  console.warn('[sentry] No se pudo iniciar el monitoreo de errores:', err);
}

// Asocia cada error a la navegación en la que ocurrió.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
