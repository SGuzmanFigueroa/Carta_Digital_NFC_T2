'use client';

import { useSyncExternalStore } from 'react';

/**
 * GastroPulse OS · CD-26 · Carril inferior flotante de la carta del comensal
 *
 * Puente de estado mínimo entre la carta (`QRMenuViewer`) y cualquier elemento
 * que flote en la parte baja de la pantalla (hoy: el banner de instalación PWA).
 * Responde a una única pregunta: ¿el panel "Total (N platos)" está ocupando el
 * carril inferior ahora mismo?
 *
 * ¿Por qué un store externo y no una prop ni el contexto global?
 *  · El carrito es estado LOCAL de `QRMenuViewer`. Subirlo al `RestaurantContext`
 *    obligaría a re-renderizar a todos sus consumidores (KDS, pedidos, personal)
 *    cada vez que el comensal agrega un plato, y añadiría riesgo a terminales del
 *    staff que nada tienen que ver con la carta. Este puente solo notifica a
 *    quien realmente lo observa.
 *  · Se lee con `useSyncExternalStore` (el mismo patrón que `usePWAInstall`): el
 *    snapshot del servidor es idéntico en SSR y en el primer render del cliente,
 *    así que no hay divergencias de hidratación.
 *  · El estado vive en `window` para sobrevivir a la re-evaluación del chunk al
 *    navegar entre rutas (`/` y `/menu` sirven la misma carta): una sola fuente
 *    de verdad por documento aunque el módulo se cargue más de una vez.
 */

/** Estado publicado sobre el carril inferior flotante. */
export interface DinerCartBarState {
  /** `true` cuando el panel del carrito está pintado y tapa esa franja. */
  readonly visible: boolean;
}

/** Snapshot de servidor / primer render: carril libre, posición base. */
const HIDDEN_STATE: DinerCartBarState = Object.freeze({ visible: false });

interface DinerCartBarStore {
  state: DinerCartBarState;
  listeners: Set<() => void>;
}

type DinerCartBarWindow = Window & { __gastropulseDinerCartBar?: DinerCartBarStore };

/** Un único store por documento, aunque el chunk se evalúe varias veces. */
function getStore(): DinerCartBarStore | null {
  if (typeof window === 'undefined') return null;
  const host = window as DinerCartBarWindow;
  if (!host.__gastropulseDinerCartBar) {
    host.__gastropulseDinerCartBar = { state: HIDDEN_STATE, listeners: new Set() };
  }
  return host.__gastropulseDinerCartBar;
}

/**
 * Publica si el panel del carrito ocupa el carril inferior.
 * Es idempotente: repetir el mismo valor no notifica ni provoca re-render.
 */
export function setDinerCartBarVisible(visible: boolean): void {
  const store = getStore();
  if (!store || store.state.visible === visible) return;
  store.state = Object.freeze({ visible });
  for (const listener of store.listeners) listener();
}

function subscribeDinerCartBar(listener: () => void): () => void {
  const store = getStore();
  if (!store) return () => {};
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

function getDinerCartBarSnapshot(): DinerCartBarState {
  return getStore()?.state ?? HIDDEN_STATE;
}

/** Referencia estable en servidor: React la exige para hidratar sin parpadeo. */
function getDinerCartBarServerSnapshot(): DinerCartBarState {
  return HIDDEN_STATE;
}

/**
 * Hook de consumo: `true` mientras el panel del carrito está en pantalla.
 * Arranca siempre en `false` (snapshot de servidor) para que el HTML del SSR y
 * el primer render del cliente coincidan exactamente.
 */
export function useDinerCartBarVisible(): boolean {
  return useSyncExternalStore(
    subscribeDinerCartBar,
    getDinerCartBarSnapshot,
    getDinerCartBarServerSnapshot
  ).visible;
}
