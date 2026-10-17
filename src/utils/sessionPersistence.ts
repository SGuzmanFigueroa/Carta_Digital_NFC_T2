/**
 * "Recordar sesión en este terminal".
 *
 * Supabase guarda la sesión en cookies que duran meses. Cuando el colaborador
 * NO marca "Recordar", se dejan dos cookies:
 *  - EPHEMERAL (dura lo mismo que la sesión): "esta sesión no debe sobrevivir
 *    al cierre del navegador".
 *  - ALIVE (cookie de sesión, sin max-age): el navegador la borra al cerrarse.
 *
 * Si existe EPHEMERAL pero ya no ALIVE, el navegador se cerró: el proxy (en el
 * servidor) y la app cierran la sesión. Así no depende solo de la pantalla.
 *
 * Nota: si el navegador está configurado para "continuar donde lo dejaste",
 * puede restaurar las cookies de sesión; por eso en equipos compartidos lo
 * correcto sigue siendo pulsar "Cerrar sesión".
 */
export const SESSION_EPHEMERAL_COOKIE = 'gp_session_ephemeral';
export const SESSION_ALIVE_COOKIE = 'gp_session_alive';

const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

function secureFlag(): string {
  return typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const row = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return row ? row.slice(name.length + 1) : null;
}

/** Llamar justo después de iniciar sesión. */
export function rememberSessionChoice(remember: boolean): void {
  if (typeof document === 'undefined') return;
  if (remember) {
    clearSessionChoice();
    return;
  }
  document.cookie = `${SESSION_EPHEMERAL_COOKIE}=1; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secureFlag()}`;
  document.cookie = `${SESSION_ALIVE_COOKIE}=1; path=/; SameSite=Lax${secureFlag()}`;
}

export function clearSessionChoice(): void {
  if (typeof document === 'undefined') return;
  for (const name of [SESSION_EPHEMERAL_COOKIE, SESSION_ALIVE_COOKIE]) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag()}`;
  }
}

/** true si la sesión era "no recordar" y el navegador se cerró desde entonces. */
export function isEphemeralSessionExpired(cookies: { has(name: string): boolean }): boolean {
  return cookies.has(SESSION_EPHEMERAL_COOKIE) && !cookies.has(SESSION_ALIVE_COOKIE);
}

/** Versión para el navegador. */
export function isBrowserSessionExpired(): boolean {
  return isEphemeralSessionExpired({ has: (name) => readCookie(name) !== null });
}
