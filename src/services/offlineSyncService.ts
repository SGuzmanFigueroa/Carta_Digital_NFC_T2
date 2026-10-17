import { MenuItem } from '@/types';
import {
  OrderRejectedError,
  placeOrderInDb,
  toPlaceOrderItems,
  type PlacedOrder,
  type PlaceOrderInput
} from './orderService';

export interface PendingOrder {
  /** Id provisional que ve el comensal mientras no hay conexión. */
  id: string;
  input: PlaceOrderInput;
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
 * Agrega un pedido a la cola de sincronización. `localId` es el id provisional
 * que ve el comensal; `input.idempotencyKey` garantiza que, aunque el envío se
 * reintente varias veces, el servidor cree una sola comanda.
 */
export function queuePendingOrder(localId: string, input: PlaceOrderInput): PendingOrder {
  const newPending: PendingOrder = { id: localId, input, createdAt: Date.now() };

  if (typeof window !== 'undefined') {
    try {
      const updatedQueue = [...getPendingOrders().filter((o) => o.id !== localId), newPending];
      localStorage.setItem(STORAGE_KEY_PENDING_QUEUE, JSON.stringify(updatedQueue));
    } catch (e) {
      console.warn('[OfflineSync] Error al encolar pedido pendiente:', e);
    }
  }

  return newPending;
}

/** Entrada guardada por versiones anteriores (antes de place_order). */
type LegacyPendingOrder = {
  id: string;
  tableNumber: string;
  cartItems: { item: MenuItem; quantity: number; notes?: string }[];
  pax: number;
  createdAt: number;
};

function upgradePendingOrder(entry: PendingOrder | LegacyPendingOrder): PendingOrder | null {
  if ('input' in entry && entry.input?.idempotencyKey) return entry;
  if ('cartItems' in entry && Array.isArray(entry.cartItems)) {
    return {
      id: entry.id,
      createdAt: entry.createdAt,
      input: {
        tableNumber: entry.tableNumber,
        items: toPlaceOrderItems(entry.cartItems),
        idempotencyKey: crypto.randomUUID(),
        pax: entry.pax
      }
    };
  }
  return null;
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
    if (!Array.isArray(parsed)) return [];
    const upgraded = parsed.map(upgradePendingOrder).filter((o): o is PendingOrder => o !== null);
    if (upgraded.some((o, i) => o !== parsed[i])) {
      // Persistir la clave generada para que los reintentos sigan siendo idempotentes.
      localStorage.setItem(STORAGE_KEY_PENDING_QUEUE, JSON.stringify(upgraded));
    }
    return upgraded;
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

export type SyncResult = {
  synced: { localId: string; order: PlacedOrder }[];
  /** El servidor rechazó estos pedidos (p. ej. un plato retirado): salen de la cola. */
  rejected: { localId: string; message: string }[];
  remainingCount: number;
};

let syncInFlight: Promise<SyncResult> | null = null;

/**
 * Ejecuta la sincronización silenciosa de los pedidos en cola hacia Supabase.
 * Nunca corre dos veces en paralelo (evento `online` + intervalo).
 */
export function syncPendingOrders(): Promise<SyncResult> {
  syncInFlight ??= runSync().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function runSync(): Promise<SyncResult> {
  const result: SyncResult = { synced: [], rejected: [], remainingCount: 0 };
  if (typeof window === 'undefined' || !navigator.onLine) {
    result.remainingCount = getPendingOrders().length;
    return result;
  }

  for (const pending of getPendingOrders()) {
    try {
      const order = await placeOrderInDb(pending.input);
      removePendingOrder(pending.id);
      result.synced.push({ localId: pending.id, order });
    } catch (err) {
      if (err instanceof OrderRejectedError) {
        removePendingOrder(pending.id);
        result.rejected.push({ localId: pending.id, message: err.message });
      } else {
        console.warn(`[OfflineSync] Falló intento de sincronizar comanda ${pending.id}:`, err);
      }
    }
  }

  result.remainingCount = getPendingOrders().length;
  return result;
}

/**
 * Verifica si el dispositivo tiene conexión
 */
export function isDeviceOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Configura los eventos de conexión/desconexión y reintento en segundo plano.
 * `onSyncResult` recibe las comandas que el servidor confirmó (con su número
 * definitivo) y las que rechazó, para que la interfaz las reconcilie.
 */
export function setupOfflineSync(
  onConnectionChange?: (isOnline: boolean) => void,
  onSyncResult?: (result: SyncResult) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const runAndReport = async () => {
    const result = await syncPendingOrders();
    if (onSyncResult && (result.synced.length > 0 || result.rejected.length > 0)) {
      onSyncResult(result);
    }
  };

  const handleOnline = () => {
    onConnectionChange?.(true);
    void runAndReport();
  };

  const handleOffline = () => {
    onConnectionChange?.(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Intentar sincronizar al arrancar por si quedaron pedidos de una sesión previa
  if (navigator.onLine) void runAndReport();

  // Intervalo de reintento en segundo plano cada 30 segundos
  const intervalId = setInterval(() => {
    if (navigator.onLine && getPendingOrders().length > 0) void runAndReport();
  }, 30000);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearInterval(intervalId);
  };
}
