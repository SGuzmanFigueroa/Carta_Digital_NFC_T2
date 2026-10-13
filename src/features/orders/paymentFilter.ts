import type { OrderTicket } from '@/types';

export type PaymentFilter = 'all' | 'pending' | 'paid';
export const orderPaymentStatus = (order: OrderTicket): 'pending' | 'paid' => order.paymentStatus ?? 'pending';

export function mergePaymentOrders(active: OrderTicket[], paid: OrderTicket[]): OrderTicket[] {
  const merged = new Map(active.map(order => [order.id, order]));
  // Database-confirmed payment wins over an older active snapshot of the same ID.
  paid.forEach(order => merged.set(order.id, order));
  return [...merged.values()].filter(order => ['por-validar', 'en-cocina', 'pase-listo', 'entregado'].includes(order.status));
}

export function paymentFilterCounts(orders: OrderTicket[]) {
  const paid = orders.filter(order => orderPaymentStatus(order) === 'paid').length;
  return { all: orders.length, pending: orders.length - paid, paid };
}

export function filterOrdersByPayment(orders: OrderTicket[], filter: PaymentFilter): OrderTicket[] {
  return filter === 'all' ? orders : orders.filter(order => orderPaymentStatus(order) === filter);
}
