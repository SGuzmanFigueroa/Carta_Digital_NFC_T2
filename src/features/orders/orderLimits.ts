export const DEFAULT_ORDER_LIMITS = {
  maxPerItem: 20,
  maxTotal: 50,
} as const;

export type OrderLimits = {
  maxPerItem: number;
  maxTotal: number;
};

export type OrderItemInput = {
  productId: string;
  quantity: number;
};

export function validateOrderItems(
  items: OrderItemInput[],
  limits: OrderLimits = DEFAULT_ORDER_LIMITS,
): string | null {
  if (items.length === 0) return 'Agrega al menos un plato a la orden.';

  const quantities = new Map<string, number>();

  for (const item of items) {
    if (!item.productId || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      return 'Cada plato debe tener una cantidad válida.';
    }

    const quantity = (quantities.get(item.productId) ?? 0) + item.quantity;
    if (quantity > limits.maxPerItem) {
      return `Has alcanzado el límite máximo de ${limits.maxPerItem} unidades para este plato.`;
    }
    quantities.set(item.productId, quantity);
  }

  const total = [...quantities.values()].reduce((sum, quantity) => sum + quantity, 0);
  if (total > limits.maxTotal) {
    return `La orden no puede superar las ${limits.maxTotal} unidades en total.`;
  }

  return null;
}