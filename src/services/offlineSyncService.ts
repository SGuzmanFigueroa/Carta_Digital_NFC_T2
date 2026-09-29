import { MenuItem, OrderTicket } from '@/types';
import { createOrderInDb } from './orderService';

export interface PendingOrder {
  id: string;
  tableNumber: string;
  cartItems: { item: MenuItem; quantity: number; notes?: string }[];
  pax: number;
  createdAt: number;
}

const STORAGE_KEY_PENDING_QUEUE = 'gastropulse_pending_orders_queue_v1';
const STORAGE_KEY_MENU_CACHE = 'gastropulse_menu_cache_v1';

/**
 * Guarda el catálogo completo de platos en la memoria local (caché offline)
 */
export function cacheMenuItems(items: MenuItem[]): void {
  if (typeof window === 'undefined' || !items || items.length === 0) return;
  try {
    localStorage.setItem(
      STORAGE_KEY_MENU_CACHE,
      JSON.stringify({
        timestamp: Date.now(),
        items
      })
    );
  } catch (e) {
    console.warn('[OfflineSync] Error al guardar caché de la carta:', e);
  }
}

/**
 * Obtiene el catálogo de platos guardado en la memoria local
 */
export function getCachedMenuItems(): MenuItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MENU_CACHE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : null;
  } catch (e) {
    console.warn('[OfflineSync] Error al leer caché de la carta:', e);
    return null;
  }
}

/**
 * Agrega un pedido a la cola de pedidos pendientes de sincronización
 */
export function queuePendingOrder(
  tableNumber: string,
  cartItems: { item: MenuItem; quantity: number; notes?: string }[],
  pax: number = 2,
  orderId?: string
): PendingOrder {
  const pendingId = orderId || `cmd-${Math.floor(100 + Math.random() * 899)}`;
  const newPending: PendingOrder = {
    id: pendingId,
    tableNumber,
    cartItems,
    pax,
    createdAt: Date.now()
  };

  if (typeof window !== 'undefined') {
    try {
      const currentQueue = getPendingOrders();
      const filtered = currentQueue.filter((o) => o.id !== pendingId);
      const updatedQueue = [...filtered, newPending];
      localStorage.setItem(STORAGE_KEY_PENDING_QUEUE, JSON.stringify(updatedQueue));
      console.log(`[OfflineSync] Pedido ${pendingId} encolado para sincronización cuando haya conexión.`);
    } catch (e) {
      console.warn('[OfflineSync] Error al encolar pedido pendiente:', e);
    }
  }

  return newPending;
}

/**
 * Obtiene todos los pedidos pendientes de sincronización
 */
export function getPendingOrders(): PendingOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING_QUEUE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Elimina un pedido de la cola una vez sincronizado
 */
export function removePendingOrder(orderId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const currentQueue = getPendingOrders();
    const updated = currentQueue.filter((o) => o.id !== orderId);
    localStorage.setItem(STORAGE_KEY_PENDING_QUEUE, JSON.stringify(updated));
  } catch (e) {
    console.warn('[OfflineSync] Error al remover pedido de la cola:', e);
  }
}

/**
 * Ejecuta la sincronización silenciosa de los pedidos en cola hacia Supabase
 */
export async function syncPendingOrders(): Promise<{ syncedCount: number; remainingCount: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { syncedCount: 0, remainingCount: getPendingOrders().length };
  }

  const queue = getPendingOrders();
  if (queue.length === 0) {
    return { syncedCount: 0, remainingCount: 0 };
  }

  console.log(`[OfflineSync] Iniciando sincronización silenciosa de ${queue.length} comanda(s) pendiente(s)...`);
  let synced = 0;

  for (const pending of queue) {
    try {
      const result = await createOrderInDb(
        pending.tableNumber,
        pending.cartItems,
        pending.pax,
        pending.id,
        true
      );

      if (result) {
        removePendingOrder(pending.id);
        synced++;
        console.log(`[OfflineSync] Comanda ${pending.id} sincronizada con Supabase exitosamente.`);
      }
    } catch (err) {
      console.warn(`[OfflineSync] Falló intento de sincronizar comanda ${pending.id}:`, err);
    }
  }

  const remaining = getPendingOrders().length;
  return { syncedCount: synced, remainingCount: remaining };
}

/**
 * Verifica si el dispositivo tiene conexión
 */
export function isDeviceOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Configura los eventos de conexión/desconexión y reintento en segundo plano
 */
export function setupOfflineSync(
  onConnectionChange?: (isOnline: boolean) => void,
  onSyncSuccess?: (syncedCount: number) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = async () => {
    console.log('[OfflineSync] 🌐 Conexión a Internet detectada. Sincronizando cola de pedidos...');
    if (onConnectionChange) onConnectionChange(true);
    const { syncedCount } = await syncPendingOrders();
    if (syncedCount > 0 && onSyncSuccess) {
      onSyncSuccess(syncedCount);
    }
  };

  const handleOffline = () => {
    console.log('[OfflineSync] ⚠️ El dispositivo perdió conexión a Internet. Activando modo local.');
    if (onConnectionChange) onConnectionChange(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Intentar sincronizar al arrancar por si quedaron pedidos de una sesión previa
  if (navigator.onLine) {
    syncPendingOrders().then(({ syncedCount }) => {
      if (syncedCount > 0 && onSyncSuccess) {
        onSyncSuccess(syncedCount);
      }
    });
  }

  // Intervalo de reintento en segundo plano cada 30 segundos
  const intervalId = setInterval(() => {
    if (navigator.onLine && getPendingOrders().length > 0) {
      syncPendingOrders().then(({ syncedCount }) => {
        if (syncedCount > 0 && onSyncSuccess) {
          onSyncSuccess(syncedCount);
        }
      });
    }
  }, 30000);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearInterval(intervalId);
  };
}
