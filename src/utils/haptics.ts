/**
 * GastroPulse OS · CD-27 · Feedback háptico del comensal
 * =============================================================================
 * Confirmación POR TACTO del gesto "Agregar plato" (y de cualquier otro gesto
 * del carrito): una micro-vibración de 15 ms, apenas perceptible, que confirma
 * la acción sin llegar a zumbar.
 *
 * Por qué vive en su propio módulo y no dentro del componente:
 *
 * - 🖥️ SSR-safe: el módulo NO toca `window` ni `navigator` al importarse, así
 *   que puede importarse desde un client component que Next también renderiza
 *   en el servidor. Toda lectura del entorno ocurre DENTRO de la función y
 *   detrás de un `typeof`, nunca en el cuerpo del módulo.
 * - 🍎 Degradación silenciosa: iOS Safari (iPhone/iPad) NO implementa
 *   `navigator.vibrate`. Sin el guard `typeof navigator.vibrate !== 'function'`
 *   la llamada reventaría con `TypeError` en la mitad de los móviles del salón.
 *   Con el guard, el gesto simplemente no vibra y la interfaz sigue igual.
 * - 🔋 Batería: si la carta está en segundo plano (pestaña oculta) no se vibra:
 *   no hay nadie mirando la pantalla y la vibración solo gasta batería.
 * - ♿ `prefers-reduced-motion` NO se consulta aquí a propósito: esa preferencia
 *   gobierna el MOVIMIENTO en pantalla (las animaciones sí la respetan). La
 *   vibración es confirmación de hardware, y en la plataforma donde esa
 *   preferencia más pesa (iOS) la API no existe de todos modos.
 *
 * @see https://developer.mozilla.org/docs/Web/API/Navigator/vibrate
 */

/** Duración de la micro-vibración de confirmación, en milisegundos. */
export const HAPTIC_TAP_MS = 15;

/** Patrón exacto del ticket de microinteracciones: un único pulso de 15 ms. */
export const HAPTIC_ADD_TO_CART_PATTERN: number[] = [HAPTIC_TAP_MS];

/**
 * Comprueba, sin lanzar, si el entorno actual puede vibrar AHORA MISMO.
 * Devuelve `false` en SSR, en navegadores sin la API (iOS Safari) y cuando la
 * pestaña está oculta.
 */
function canVibrate(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (typeof navigator.vibrate !== 'function') return false;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
  return true;
}

/** ¿Este dispositivo soporta feedback háptico? En iOS Safari devuelve `false`. */
export function isHapticsSupported(): boolean {
  return canVibrate();
}

/**
 * Dispara un patrón de vibración (`navigator.vibrate`).
 *
 * @param pattern Duración en ms o patrón [vibrar, pausar, vibrar, ...].
 * @returns `true` si el dispositivo aceptó el patrón; `false` si no se pudo
 *          (entorno sin API, pestaña oculta o excepción del navegador).
 */
export function vibrate(pattern: number | number[]): boolean {
  if (!canVibrate()) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    // Algunos navegadores lanzan si no hay activación de usuario o si el
    // dispositivo bloquea la vibración: el gesto sigue funcionando sin ella.
    return false;
  }
}

/**
 * Micro-vibración de confirmación de un toque.
 *
 * @param durationMs Duración del pulso; por defecto 15 ms (`HAPTIC_TAP_MS`).
 * @returns `true` si el dispositivo vibró.
 */
export function hapticTap(durationMs: number = HAPTIC_TAP_MS): boolean {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return false;
  return vibrate(Math.round(durationMs));
}

/**
 * Confirmación táctil del gesto "agregar al carrito": el pulso de 15 ms pedido
 * por el ticket. Es la única llamada que hacen los componentes del carrito.
 */
export function hapticAddToCart(): boolean {
  return vibrate(HAPTIC_ADD_TO_CART_PATTERN);
}
