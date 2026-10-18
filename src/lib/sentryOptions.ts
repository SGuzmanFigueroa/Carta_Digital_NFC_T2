import type { ErrorEvent } from '@sentry/nextjs';

/**
 * Opciones comunes de Sentry (Tarea 49) para navegador, servidor y edge.
 *
 * - Sin NEXT_PUBLIC_SENTRY_DSN no se envía nada: la app funciona igual.
 * - Solo en producción, para que los errores del día a día en `npm run dev` no
 *   llenen el panel. Para probar en local: `npm run build && npm start`.
 * - Solo errores (sin tracing ni grabación de sesiones) y sin datos personales.
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Parámetros de URL que nunca deben salir del sitio (`t` = código secreto del QR de mesa). */
const SECRET_PARAMS = ['t', 'token', 'access_token', 'refresh_token', 'code'];

function scrubUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url, 'https://local.invalid');
    let changed = false;
    for (const param of SECRET_PARAMS) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[filtrado]');
        changed = true;
      }
    }
    if (parsed.hash.includes('access_token')) {
      parsed.hash = '';
      changed = true;
    }
    if (!changed) return url;
    return url.startsWith('http') ? parsed.toString() : parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

function beforeSend(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    event.request.url = scrubUrl(event.request.url);
    // Cookies y cabeceras pueden llevar la sesión de Supabase.
    delete event.request.cookies;
    delete event.request.headers;
  }
  for (const crumb of event.breadcrumbs ?? []) {
    const data = crumb.data as Record<string, unknown> | undefined;
    if (data && typeof data.url === 'string') data.url = scrubUrl(data.url);
    if (data && typeof data.to === 'string') data.to = scrubUrl(data.to);
    if (data && typeof data.from === 'string') data.from = scrubUrl(data.from);
  }
  return event;
}

export const sentryOptions = {
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN) && process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend
};
