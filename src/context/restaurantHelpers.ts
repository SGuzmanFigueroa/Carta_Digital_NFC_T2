import type { MenuItem, OrderTicket, StationId, Ticket, TicketItem } from '@/types';
import { supabase } from '@/lib/supabase';

/** Funciones puras y constantes del contexto del restaurante (sin React). */

/**
 * CD-28 · REALTIME · Secuencia de instancias de canal (higiene defensiva).
 *
 * `RealtimeClient.channel(topic)` DEVUELVE la instancia existente si el topic ya
 * está en uso (documentado en realtime-js: "If a channel with the same topic already
 * exists it will be returned instead of creating a duplicate connection"). Si esa
 * instancia ya estaba suscrita, `channel.on()` LANZA:
 *   "cannot add `postgres_changes` callbacks for <topic> after `subscribe()`."
 * y el useEffect muere a mitad de camino → cero listeners → frontend "sordo" hasta un F5.
 * Con un topic único por montaje ese reuse es imposible.
 *
 * OJO: esto es necesario pero NO era la causa raíz del bug CD-28. La causa raíz real
 * está documentada antes del useEffect de realtime (una tabla SIN Realtime envenena
 * todas las suscripciones del canal).
 */
let realtimeChannelSeq = 0;

/** Número de montaje irrepetible para el topic del canal. */
export function nextRealtimeChannelSeq(): number {
  return ++realtimeChannelSeq;
}

/** Sello de tiempo corto (HH:MM:SS.mmm) para los logs de diagnóstico de realtime. */
export function realtimeStamp(): string {
  return new Date().toISOString().slice(11, 23);
}

/** Payload del evento `system` que emite el servidor de Realtime (no está tipado en el SDK). */
export type RealtimeSystemPayload = {
  extension?: string;
  message?: string;
  status?: string;
  channel?: string;
};

/** Canal de Supabase tal como lo expone el SDK, sin importar tipos internos del paquete. */
export type SupabaseRealtimeChannel = Parameters<typeof supabase.removeChannel>[0];

/**
 * MONITOREO EXTREMO (CD-28) · El evento `system` del servidor de Realtime.
 *
 * Es el ÚNICO sitio donde el servidor comunica que ha rechazado el `postgres_changes`
 * de un canal (p. ej. "Unable to subscribe to changes with given parameters…" cuando
 * una tabla no tiene Realtime habilitado). El callback de `.subscribe()` recibe
 * 'SUBSCRIBED' igualmente, así que sin este listener el canal queda CIEGO SIN NINGÚN
 * ERROR VISIBLE: exactamente el fallo que motivó el ticket.
 */
export function instrumentRealtimeChannel(
  channel: SupabaseRealtimeChannel,
  scope: string,
  topic: string
): void {
  interface ChannelWithSystemHook {
    on: (
      type: string,
      filter: Record<string, unknown>,
      callback: (payload: RealtimeSystemPayload) => void
    ) => unknown;
  }

  (channel as unknown as ChannelWithSystemHook).on('system', {}, (payload) => {
    if (!payload || payload.status === 'ok') return;
    console.warn(
      `[realtime:${scope}] ${realtimeStamp()} ERROR DEL SERVIDOR en ${topic}: ${payload.message ?? 'sin detalle'}`
    );
    console.warn(
      `[realtime:${scope}] ${realtimeStamp()} Acción: habilita Realtime para la tabla citada → ` +
      `ALTER PUBLICATION supabase_realtime ADD TABLE public.<tabla>;`
    );
  });
}

/** Traza cada transición de estado del canal: SUBSCRIBED / CHANNEL_ERROR / TIMED_OUT / CLOSED. */
export function describeRealtimeStatus(scope: string, topic: string, status: string, error?: Error): void {
  const head = `[realtime:${scope}] ${realtimeStamp()} ${status} ${topic}`;
  if (status === 'SUBSCRIBED') {
    console.info(`${head} · canal operativo`);
    return;
  }
  console.warn(`${head} · ${error?.message ?? 'el canal dejó de entregar eventos'}`);
}

export const STORAGE_KEY_TICKETS = 'gastropulse_kds_tickets_v1';
export const STORAGE_KEY_ORDERS = 'gastropulse_orders_v1';
export const STORAGE_KEY_TABLES = 'gastropulse_tables_v1';
export const STORAGE_KEY_REVENUE = 'gastropulse_revenue_v1';
export const STORAGE_KEY_DINER = 'gastropulse_diner_ticket_v1';
export const STORAGE_KEY_AUTH = 'gastropulse_auth_user';

export function getTableRoundKey(table: string): string {
  return table.replace(/\D/g, '') || table.trim().toUpperCase();
}

export const ALLOWED_BROADCAST_ACTIONS = [
  'NEW_ORDER',
  'UPDATE_TICKETS',
  'UPDATE_TABLES',
  'UPDATE_RUNNERS',
  'DINER_STATUS_UPDATE',
  'PRIORITIZE_TABLE',
  'RUNNER_ALERT',
  'UPDATE_ORDERS'
];

// Lista blanca estricta: ÚNICAMENTE las rutas de gestión operativa del personal
// admiten bloqueo por inactividad. La carta digital del comensal (/ y /menu) está 100% blindada.
export function isStaffManagementRoute(path?: string | null): boolean {
  if (!path) return false;
  return (
    path.startsWith('/kds') ||
    path.startsWith('/pedidos') ||
    path.startsWith('/dashboard') ||
    path.startsWith('/personal') ||
    path.startsWith('/configuracion')
  );
}

/** Estación de cocina por categoría (y por plato para la parrilla). Solo enruta; no afecta precios. */
export function routeKitchenStation(item: MenuItem): { station: StationId; badge: string; badgeColor: string } {
  if (item.category === 'bebidas') return { station: 'barra_mixologia', badge: 'BARRA', badgeColor: 'bg-[#0494fc] text-white' };
  if (item.category === 'entradas') return { station: 'frio_nikkei', badge: 'FRÍO & NIKKEI', badgeColor: 'bg-[#0494fc] text-white' };
  if (item.category === 'postres') return { station: 'pasteleria', badge: 'PASTELERÍA', badgeColor: 'bg-[#c6c5cf] text-[#131315]' };
  const name = item.name.toLowerCase();
  if (name.includes('wagyu') || name.includes('pulpo') || name.includes('lomo')) {
    return { station: 'fuego_grill', badge: 'FUEGO & GRILL', badgeColor: 'bg-[#ff5708] text-white' };
  }
  return { station: 'wok_saute', badge: 'WOK & SAUTÉ', badgeColor: 'bg-[#ff5708] text-white' };
}

export function toKdsTicket(order: OrderTicket): Ticket | null {
  const orderNumber = Number(order.id.replace(/^cmd-/, ''));
  if (!order.id.startsWith('cmd-') || !Number.isFinite(orderNumber)) return null;

  const mappedItems: TicketItem[] = order.items.map((item) => {
    const stationName = item.station?.toLowerCase() || '';
    let station: StationId = 'wok_saute';
    let stationBadge = 'WOK & SAUTÉ';

    if (stationName.includes('barra')) {
      station = 'barra_mixologia';
      stationBadge = 'BARRA';
    } else if (stationName.includes('frío') || stationName.includes('frio') || stationName.includes('nikkei')) {
      station = 'frio_nikkei';
      stationBadge = 'FRÍO & NIKKEI';
    } else if (stationName.includes('pastelería') || stationName.includes('pasteleria')) {
      station = 'pasteleria';
      stationBadge = 'PASTELERÍA';
    } else if (stationName.includes('fuego') || stationName.includes('parrilla')) {
      station = 'fuego_grill';
      stationBadge = 'FUEGO & GRILL';
    }

    return {
      id: item.id,
      name: `${item.quantity}x ${item.name}`,
      quantity: item.quantity,
      station,
      stationBadge,
      status: order.status === 'pase-listo' ? 'listo' : 'pendiente',
      cookingNotes: item.notes ? [item.notes] : ['Pase estándar'],
      price: item.price,
      photoUrl: '',
      checked: order.status === 'pase-listo'
    };
  });

  const stationFilterTags = Array.from(new Set(mappedItems.map((item) => item.station)));
  const status: Ticket['status'] = order.status === 'en-cocina'
    ? 'en_fuego'
    : order.status === 'pase-listo'
    ? 'lista_despachada'
    : order.status === 'entregado'
    ? 'archivada'
    : 'ingresada';

  return {
    id: `ticket-${order.id}`,
    orderNumber,
    table: order.table,
    zone: order.table.toLowerCase().includes('terraza') ? 'TERRAZA' : 'SALÓN PRINCIPAL',
    serviceType: 'Carta Digital NFC',
    elapsedSeconds: 0,
    targetSeconds: 660,
    serverOrRunner: order.waiter || 'AUTO-COMENSAL',
    serverRole: order.origin === 'QR COMENSAL' ? 'PASE DIRECTO' : 'CAMARERO',
    totalAmount: order.total,
    status,
    items: mappedItems,
    timestamp: order.createdTime,
    stationFilterTags: stationFilterTags.length > 0 ? stationFilterTags : ['wok_saute'],
    isUrgent: Boolean(order.isCritical)
  };
}
