import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/sentryOptions';

// Errores del servidor (API, render y proxy) hacia Sentry. Sin DSN no hace nada.
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init(sentryOptions);
  }
}

// Next llama a esta función con cada error de una petición del servidor.
export const onRequestError = Sentry.captureRequestError;
