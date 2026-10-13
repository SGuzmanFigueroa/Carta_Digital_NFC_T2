import { queuePendingOrder } from './offlineSyncService';
﻿import { supabase } from '@/lib/supabase';
import { OrderTicket, OrderItem, MenuItem } from '@/types';
import { isTemporaryPairingItem } from '@/features/menu/pairing';
import { updateTableStateInDb } from './tableService';
import type { Database } from '@/types/database.types';

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
      stationTarget: (o as any).station_target || undefined
    }));
  } catch (err) {
    if (options.throwOnError) throw err;
    console.error('Error fetching orders from DB:', err);
    return [];
  }
}

export async function createOrderInDb(
  tableNumber: string,
  cartItems: { item: MenuItem; quantity: number; notes?: string }[],
  pax: number = 2,
  customOrderId?: string,
  skipQueue: boolean = false
): Promise<OrderTicket | null> {
  try {
    const orderId = customOrderId || `cmd-${Math.floor(100 + Math.random() * 899)}`;
    const subtotal = cartItems.reduce((acc, c) => acc + c.item.price * c.quantity, 0);
    const total = subtotal;

    // 1. Insert order
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        table_number: tableNumber,
        pax: pax,
        origin: 'QR COMENSAL',
        status: 'por-validar',
        subtotal: subtotal,
        total: total
      });

    if (orderError) {
      console.warn('[OfflineSync] No se pudo guardar en Supabase (offline o red). Encolando localmente:', orderError.message);
      if (!skipQueue) {
        queuePendingOrder(tableNumber, cartItems, pax, orderId);
      }
      // Retornar ticket local para que la UI no se quede bloqueada
      return {
        id: orderId,
        table: tableNumber,
        pax: pax,
        timeAgo: 'En cola offline',
        createdTime: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        origin: 'QR COMENSAL',
        status: 'por-validar',
        isCritical: false,
        preparationPercent: 0,
        items: cartItems.map((c, idx) => ({
          id: `it-off-${Date.now()}-${idx}`,
          name: c.item.name,
          quantity: c.quantity,
          price: c.item.price,
          notes: c.notes,
          station: 'wok_saute'
        })),
        subtotal: subtotal,
        total: total
      };
    }

    // 2. Insert order items
    const itemsToInsert = cartItems.map((c) => ({
      order_id: orderId,
      dish_id:
        c.item.id &&
        !c.item.id.startsWith('cat-') &&
        !isTemporaryPairingItem(c.item)
          ? c.item.id
          : null,
      name: c.item.name,
      quantity: c.quantity,
      price: c.item.price,
      notes: c.notes || null,
      station: c.item.category === 'fondos' ? 'wok_saute' : c.item.category === 'entradas' ? 'frio_nikkei' : c.item.category === 'bebidas' ? 'barra_mixologia' : 'pasteleria',
      item_status: 'pendiente' as const,
      checked: false
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert)
      .select();

    if (itemsError) {
      console.error('Error inserting order items to Supabase:', itemsError);
    }

    // 3. Update table in DB
    await updateTableStateInDb(tableNumber, {
      status: 'qr',
      amount: total,
      pax: pax
    });

    const newTicket: OrderTicket = {
      id: orderId,
      table: tableNumber,
      pax: pax,
      timeAgo: 'Justo ahora',
      createdTime: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      origin: 'QR COMENSAL',
      status: 'por-validar',
      isCritical: false,
      preparationPercent: 10,
      items: (insertedItems || []).map((it) => ({
        id: it.id,
        name: it.name,
        quantity: it.quantity,
        price: Number(it.price),
        notes: it.notes || undefined,
        station: it.station || 'wok_saute'
      })),
      subtotal: subtotal,
      total: total
    };

    return newTicket;
  } catch (err) {
    console.error('Error in createOrderInDb:', err);
    return null;
  }
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


export async function requestTableAccountInDb(
  tableNumber: string,
  paymentMethod: string = 'Efectivo'
): Promise<boolean> {
  try {
    const digits = tableNumber.replace(/\D/g, '').padStart(2, '0');
    // 1. Update matching active orders for this table in Supabase
    const { error: orderErr } = await supabase
      .from('orders')
      .update({
        account_requested: true,
        payment_method: paymentMethod,
        updated_at: new Date().toISOString()
      })
      .or(`table_number.ilike.%${digits}%,table_number.ilike.%${tableNumber}%`)
      .neq('status', 'cobrado');

    if (orderErr) {
      console.warn('Warning updating order for account request in DB:', orderErr.message);
    }

    // 2. Set table status to 'cuenta' in restaurant_tables
    await updateTableStateInDb(tableNumber, { status: 'cuenta' });

    return true;
  } catch (err) {
    console.error('Error requesting account in DB:', err);
    return false;
  }
}

export async function callWaiterForTableInDb(
  tableNumber: string,
  reason: string = 'Atención en mesa'
): Promise<boolean> {
  try {
    // Flag table state in DB with active attention request
    await updateTableStateInDb(tableNumber, { status: 'demora' });
    return true;
  } catch (err) {
    console.error('Error calling waiter in DB:', err);
    return false;
  }
}

export async function settleOrdersForTableInDb(tableNumber: string): Promise<boolean> {
  try {
    const digits = tableNumber.replace(/\D/g, '').padStart(2, '0');
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cobrado',
        updated_at: new Date().toISOString()
      })
      .or(`table_number.ilike.%${digits}%,table_number.ilike.%${tableNumber}%`)
      .not('status', 'in', '(cobrado,cancelado)');

    return !error;
  } catch (err) {
    console.error('Error settling orders for table in DB:', err);
    return false;
  }
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
