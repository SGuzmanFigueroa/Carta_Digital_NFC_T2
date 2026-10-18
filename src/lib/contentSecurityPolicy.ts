/**
 * Política de seguridad de contenido (CSP) del sitio. Le dice al navegador de
 * dónde puede cargar scripts, estilos, imágenes y a qué servidores puede
 * conectarse; si alguien logra inyectar código, no puede traer scripts de otro
 * dominio ni mandar datos fuera de esta lista.
 *
 * Scripts con 'unsafe-inline' y sin nonces A PROPÓSITO: los nonces obligan a
 * renderizar cada página en cada visita y la carta perdería su caché (ISR de
 * 60 s, Tarea 38). Next también inyecta scripts en línea para hidratar. Ver
 * node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md.
 */

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Endpoint de reportes de CSP de Sentry a partir del DSN (https://KEY@HOST/PROYECTO). */
function sentryReportUri(dsn: string | undefined): string | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/\//g, '');
    if (!url.username || !projectId) return null;
    return `${url.origin}/api/${projectId}/security/?sentry_key=${url.username}`;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy({
  supabaseUrl,
  sentryDsn,
  isDev
}: {
  supabaseUrl?: string;
  sentryDsn?: string;
  isDev: boolean;
}): string {
  const supabase = originOf(supabaseUrl);
  const supabaseWs = supabase?.replace(/^https:/, 'wss:');
  const sentry = originOf(sentryDsn);
  const reportUri = sentryReportUri(sentryDsn);

  const directives: Record<string, (string | null | undefined | false)[]> = {
    'default-src': ["'self'"],
    // 'unsafe-eval' solo en desarrollo (recarga en caliente de Next).
    'script-src': ["'self'", "'unsafe-inline'", isDev && "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    // Fotos de platos que pega el admin (cualquier https), QR/voucher subidos
    // (data:) y texturas de los modelos 3D (blob:).
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'media-src': ["'self'", 'blob:'],
    'connect-src': ["'self'", supabase, supabaseWs, sentry, 'blob:', 'data:', isDev && 'ws:'],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    // Igual que X-Frame-Options: SAMEORIGIN (emuladores y pruebas internas).
    'frame-ancestors': ["'self'"],
    'report-uri': [reportUri]
  };

  return Object.entries(directives)
    .map(([name, values]) => [name, values.filter(Boolean)] as const)
    .filter(([, values]) => values.length > 0)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}
