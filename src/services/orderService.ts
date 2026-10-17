import { supabase } from '@/lib/supabase';
import { OrderTicket, OrderItem, MenuItem, PaymentClaim, StationId } from '@/types';
import { isTemporaryPairingItem } from '@/features/menu/pairing';
import type { Database } from '@/types/database.types';
import { limaDate } from '@/features/reports/daily';
import { getTableToken } from '@/utils/tableAccess';

/** Número de mesa sin texto ni ceros: "MESA 04 (Terraza)" → 4. */
const tableDigits = (value: string | null | undefined) => {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : null;
};

export async function fetchOrdersFromDb(options: { paymentStatus?: 'paid'; throwOnError?: boolean } = {}): Promise<OrderTicket[]> {
  try {
    const queryOrders = (offset = 0) => {
      const query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      return options.paymentStatus === 'paid'
        ? query.eq('status', 'cobrado').order('id').range(offset, offset + 499)
        : query.neq('status', 'cobrado');
    };
    const { data: ordersData, error: ordersError } = await queryOrders();

    if (ordersError || !ordersData) {
      if (options.throwOnError) throw ordersError ?? new Error('Orders unavailable');
      return [];
    }
    if (options.paymentStatus === 'paid') {
      let pageLength = ordersData.length;
      while (pageLength === 500) {
        const { data, error } = await queryOrders(ordersData.length);
        if (error || !data) throw error ?? new Error('History unavailable');
        pageLength = data.length;
        ordersData.push(...data);
      }
    }
    if (!ordersData.length) return [];

    const orderIds = ordersData.map((o) => o.id);
    const itemsData: Database['public']['Tables']['order_items']['Row'][] = [];
    const chunkSize = options.paymentStatus === 'paid' ? 100 : orderIds.length;
    for (let index = 0; index < orderIds.length; index += chunkSize) {
      let offset = 0;
      while (true) {
        const query = supabase.from('order_items').select('*').in('order_id', orderIds.slice(index, index + chunkSize));
        const { data, error } = await (options.paymentStatus === 'paid' ? query.order('id').range(offset, offset + 999) : query);
        if (error && options.throwOnError) throw error;
        itemsData.push(...(data ?? []));
        if (options.paymentStatus !== 'paid' || (data?.length ?? 0) < 1000) break;
        offset += 1000;
      }
    }

    const itemsByOrder: Record<string, OrderItem[]> = {};
    (itemsData || []).forEach((item) => {
      if (!itemsByOrder[item.order_id || '']) {
        itemsByOrder[item.order_id || ''] = [];
      }
      itemsByOrder[item.order_id || ''].push({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price),
        notes: item.notes || undefined,
        station: item.station || 'wok_saute',
        allergen: item.notes && (item.notes.toLowerCase().includes('alérgeno') || item.notes.toLowerCase().includes('alergia'))
          ? item.notes
          : undefined
      });
    });

    return ordersData.map((o) => ({
      id: o.id,
      table: o.table_number,
      pax: o.pax || 2,
      timeAgo: 'En vivo',
      createdTime: new Date(o.created_at || Date.now()).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      origin: (o.origin as OrderTicket['origin']) || 'QR COMENSAL',
      waiter: o.waiter || undefined,
      status: o.status === 'cobrado' ? 'entregado' : (o.status as OrderTicket['status']) || 'por-validar',
      paymentStatus: o.status === 'cobrado' ? 'paid' : 'pending',
      isCritical: Boolean(o.is_critical),
      preparationPercent: o.preparation_percent || 0,
      items: itemsByOrder[o.id] || [],
      subtotal: Number(o.subtotal),
      total: Number(o.total),
      runnerAssigned: o.runner_assigned || undefined,
      accountRequested: Boolean(o.account_requested),
      paymentMethod: o.payment_method || undefined,
      stationTarget: (o as any).station_target || undefined,
      paymentVerification: (o.payment_status as OrderTicket['paymentVerification']) || 'none',
      paymentReference: o.payment_reference || undefined
    }));
  } catch (err) {
    if (options.throwOnError) throw err;
    console.error('Error fetching orders from DB:', err);
    return [];
  }
}

export type PlaceOrderItem = {
  dishId?: string;
  /** Maridaje sugerido que no existe en la carta; el servidor le pone su precio. */
  pairingName?: string;
  quantity: number;
  notes?: string;
  /** Solo enruta el plato en cocina; nunca afecta al precio. */
  station?: StationId;
  /** Oferta flash aplicada; el servidor valida su vigencia y calcula el precio. */
  promoOfferId?: string;
};

export type PlaceOrderInput = {
  tableNumber: string;
  items: PlaceOrderItem[];
  /** Misma clave en cada reintento: el servidor no duplica la comanda. */
  idempotencyKey: string;
  pax?: number;
  origin?: 'QR COMENSAL' | 'GARZÓN';
  waiter?: string;
  /** Código secreto del QR de la mesa (obligatorio para el comensal sin sesión). */
  tableToken?: string;
  /** Ubicación del comensal: el servidor la compara con la geocerca. */
  position?: { lat: number; lng: number; accuracy: number };
};

export type PlacedOrder = {
  id: string;
  orderNumber: number;
  table: string;
  status: OrderTicket['status'];
  subtotal: number;
  total: number;
  /** `price` es el precio unitario de la carta. */
  items: (OrderItem & { dishId?: string })[];
};

/** El servidor rechazó el pedido (plato retirado, límite, datos inválidos). Reintentar no sirve. */
export class OrderRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderRejectedError';
  }
}

export function toPlaceOrderItems(
  cartItems: { item: MenuItem; quantity: number; notes?: string }[]
): PlaceOrderItem[] {
  return cartItems.map(({ item, quantity, notes }) => ({
    ...(isTemporaryPairingItem(item) ? { pairingName: item.name } : { dishId: item.id }),
    quantity,
    notes: notes?.trim() || undefined,
    promoOfferId: item.appliedPromoOfferId
  }));
}

type PlaceOrderRow = {
  id: string;
  order_number: number;
  table_number: string;
  status: string;
  subtotal: number | string;
  total: number | string;
  items: {
    id: string;
    dish_id: string | null;
    name: string;
    quantity: number;
    price: number | string;
    notes: string | null;
    station: string | null;
  }[];
};

/**
 * Crea la comanda en una sola transacción (RPC `place_order`). El precio, el
 * nombre y el número de comanda los decide la base de datos.
 *
 * Lanza `OrderRejectedError` si el servidor respondió que no (no reintentar) y
 * un `Error` normal si no hubo respuesta (sin red): ese caso va a la cola offline.
 */
export async function placeOrderInDb(input: PlaceOrderInput): Promise<PlacedOrder> {
  const { data, error } = await supabase.rpc('place_order', {
    p_table_number: input.tableNumber,
    p_items: input.items.map((item) => ({
      dish_id: item.dishId,
      pairing_name: item.pairingName,
      quantity: item.quantity,
      notes: item.notes,
      station: item.station,
      promo_offer_id: item.promoOfferId
    })),
    p_idempotency_key: input.idempotencyKey,
    p_pax: input.pax ?? 2,
    p_origin: input.origin ?? 'QR COMENSAL',
    p_waiter: input.waiter,
    p_table_token: input.tableToken,
    p_lat: input.position?.lat,
    p_lng: input.position?.lng,
    p_accuracy: input.position?.accuracy
  });

  if (error) {
    // Sin código = la petición no llegó (offline, DNS, timeout del navegador).
    if (!error.code) throw new Error(error.message || 'Sin conexión con el servidor de pedidos.');
    if (error.code === '22023') throw new OrderRejectedError(error.message);
    console.error('[orders] place_order rechazado:', error.code, error.message);
    throw new OrderRejectedError('No se pudo registrar el pedido. Avisa al personal del restaurante.');
  }

  const row = data as unknown as PlaceOrderRow;
  return {
    id: row.id,
    orderNumber: Number(row.order_number),
    table: row.table_number,
    status: row.status as OrderTicket['status'],
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    items: row.items.map((item) => ({
      id: item.id,
      dishId: item.dish_id ?? undefined,
      name: item.name,
      quantity: item.quantity,
      price: Number(item.price),
      notes: item.notes ?? undefined,
      station: item.station ?? undefined
    }))
  };
}

export async function updateOrderStatusInDb(orderId: string, status: OrderTicket['status']): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    return !error;
  } catch (err) {
    console.error('Error updating order status in DB:', err);
    return false;
  }
}


/**
 * El comensal pide la cuenta. No tiene permiso para editar pedidos ni mesas:
 * la RPC diner_table_signal marca la cuenta pedida en los pedidos abiertos de
 * su mesa y pone la mesa en 'cuenta', sin tocar montos ni platos.
 */
export async function requestTableAccountInDb(
  tableNumber: string,
  paymentMethod: string = 'Efectivo',
  claim?: PaymentClaim
): Promise<boolean> {
  const { data, error } = await supabase.rpc('diner_table_signal', {
    p_table: tableNumber,
    p_signal: 'bill',
    p_payment_method: paymentMethod,
    p_table_token: getTableToken(tableNumber),
    // Yape/Plin quedan "pendientes de verificación" hasta que el personal confirme.
    p_payment_kind: claim?.kind,
    p_operation_code: claim?.operationCode
  });
  if (error) {
    console.error('Error requesting account in DB:', error.message);
    return false;
  }
  return Boolean(data);
}

/** El personal confirma (o rechaza) el pago Yape/Plin declarado por una mesa. */
export async function reviewTablePaymentInDb(tableNumber: string, approve: boolean): Promise<number> {
  const { data, error } = await supabase.rpc('review_table_payment', { p_table: tableNumber, p_approve: approve });
  if (error) throw error;
  return data ?? 0;
}

const DINER_STATUS: Record<string, OrderTicket['status']> = {
  'por-validar': 'por-validar',
  'en-cocina': 'en-cocina',
  'pase-listo': 'pase-listo',
  entregado: 'entregado',
  cobrado: 'entregado'
};

export type DinerOrderStatus = {
  status: OrderTicket['status'];
  paid: boolean;
  paymentVerification: NonNullable<OrderTicket['paymentVerification']>;
};

/**
 * Estado actual de los pedidos del comensal. Solo devuelve los que coinciden
 * con su clave (dinerKey), así nadie puede espiar pedidos de otras mesas.
 */
export async function fetchDinerOrderStatuses(
  refs: { id: string; key: string }[]
): Promise<Map<string, DinerOrderStatus>> {
  const statuses = new Map<string, DinerOrderStatus>();
  if (refs.length === 0) return statuses;
  const { data, error } = await supabase.rpc('get_diner_orders', { p_refs: refs.slice(0, 50) });
  if (error) throw error;
  for (const row of (data ?? []) as { id: string; status: string; payment_status?: string }[]) {
    const status = DINER_STATUS[row.status];
    if (status) {
      statuses.set(row.id, {
        status,
        paid: row.status === 'cobrado',
        paymentVerification: (row.payment_status as OrderTicket['paymentVerification']) ?? 'none'
      });
    }
  }
  return statuses;
}

/** Marca la mesa como "necesita atención" (RPC acotada: el comensal no edita mesas). */
export async function callWaiterForTableInDb(
  tableNumber: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reason: string = 'Atención en mesa'
): Promise<boolean> {
  const { error } = await supabase.rpc('diner_table_signal', {
    p_table: tableNumber,
    p_signal: 'waiter',
    p_table_token: getTableToken(tableNumber)
  });
  if (error) {
    console.error('Error calling waiter in DB:', error.message);
    return false;
  }
  return true;
}

/**
 * Cobra los pedidos abiertos de UNA mesa. Antes filtraba con ilike '%1%', así
 * que cobrar la Mesa 1 también marcaba como cobradas las mesas 10, 11 y 12.
 */
export async function settleOrdersForTableInDb(tableNumber: string): Promise<boolean> {
  try {
    const target = tableDigits(tableNumber);
    if (target === null) return false;
    const { data: open, error: readError } = await supabase
      .from('orders')
      .select('id, table_number')
      .not('status', 'in', '(cobrado,cancelado)');
    if (readError) throw readError;

    const ids = (open ?? []).filter((o) => tableDigits(o.table_number) === target).map((o) => o.id);
    if (ids.length === 0) return true;
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cobrado', updated_at: new Date().toISOString() })
      .in('id', ids);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error settling orders for table in DB:', err);
    return false;
  }
}

/**
 * Caja del turno: suma de lo cobrado hoy (hora de Lima) según la base. Antes
 * era un número local que arrancaba en S/ 4,215 de ejemplo. null = sin dato.
 */
export async function fetchShiftRevenueFromDb(): Promise<number | null> {
  const startOfDay = `${limaDate()}T00:00:00-05:00`;
  const { data, error } = await supabase
    .from('orders')
    .select('total')
    .eq('status', 'cobrado')
    .gte('paid_at', startOfDay);
  if (error) {
    console.warn('[caja] No se pudo calcular lo cobrado hoy:', error.message);
    return null;
  }
  return Math.round((data ?? []).reduce((sum, o) => sum + Number(o.total), 0) * 100) / 100;
}

export async function updateOrderItemCheckInDb(itemId: string, checked: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('order_items')
      .update({
        checked: checked,
        item_status: checked ? 'listo' : 'pendiente'
      })
      .eq('id', itemId);

    return !error;
  } catch (err) {
    console.error('Error updating order item check in DB:', err);
    return false;
  }
}
