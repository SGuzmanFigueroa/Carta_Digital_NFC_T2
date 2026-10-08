import { errorResponse, isOrderAdmin, supabaseAdminRequest } from '@/services/supabaseAdmin';

function isUuid(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export async function PUT(request: Request) {
  if (!isOrderAdmin(request)) {
    return Response.json({ message: 'No autorizado para cambiar la configuración del restaurante.' }, { status: 401 });
  }

  let body: { restaurantId?: unknown; maxPerItem?: unknown; maxTotal?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'El cuerpo de la solicitud no es JSON válido.' }, { status: 400 });
  }

  if (
    typeof body.restaurantId !== 'string' || !isUuid(body.restaurantId) ||
    !Number.isSafeInteger(body.maxPerItem) || (body.maxPerItem as number) < 1 ||
    !Number.isSafeInteger(body.maxTotal) || (body.maxTotal as number) < (body.maxPerItem as number)
  ) {
    return Response.json({ message: 'Los límites deben ser enteros positivos y el total debe cubrir el máximo por plato.' }, { status: 400 });
  }

  try {
    const [limits] = await supabaseAdminRequest<{ max_items_per_dish: number; max_items_per_order: number }[]>(
      'rpc/set_cd4_order_limits',
      {
        method: 'POST',
        body: JSON.stringify({
          p_restaurant_id: body.restaurantId,
          p_max_items_per_dish: body.maxPerItem,
          p_max_items_per_order: body.maxTotal,
        }),
      },
    );
    return Response.json({ maxPerItem: limits.max_items_per_dish, maxTotal: limits.max_items_per_order });
  } catch (error) {
    return errorResponse(error);
  }
}