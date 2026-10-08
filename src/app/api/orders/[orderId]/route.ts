import { errorResponse, isOrderAdmin, supabaseAdminRequest } from '@/services/supabaseAdmin';

type OrderRecord = {
  id: string;
  status: 'pending' | 'preparing' | 'delivered' | 'cancelled';
  estimated_time_minutes: number | null;
  created_at: string;
};

type RouteContext = { params: Promise<{ orderId: string }> };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PUT(request: Request, { params }: RouteContext) {
  if (!isOrderAdmin(request)) {
    return Response.json({ message: 'No autorizado para actualizar pedidos.' }, { status: 401 });
  }

  const { orderId } = await params;
  if (!isUuid(orderId)) {
    return Response.json({ message: 'El identificador del pedido no es válido.' }, { status: 400 });
  }

  let body: { status?: unknown; estimatedTime?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'El cuerpo de la solicitud no es JSON válido.' }, { status: 400 });
  }

  const validStatuses = ['pending', 'preparing', 'delivered', 'cancelled'];
  if (
    typeof body.status !== 'string' || !validStatuses.includes(body.status) ||
    (body.estimatedTime !== null && body.estimatedTime !== undefined &&
      (!Number.isSafeInteger(body.estimatedTime) || (body.estimatedTime as number) < 1 || (body.estimatedTime as number) > 1440))
  ) {
    return Response.json({ message: 'El estado o el tiempo estimado no son válidos.' }, { status: 400 });
  }

  try {
    const order = await supabaseAdminRequest<OrderRecord>('rpc/update_cd4_order', {
      method: 'POST',
      body: JSON.stringify({
        p_order_id: orderId,
        p_status: body.status,
        p_estimated_time_minutes: body.estimatedTime ?? null,
      }),
    });
    return Response.json(order);
  } catch (error) {
    return errorResponse(error);
  }
}