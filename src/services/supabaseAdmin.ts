export class SupabaseAdminError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'SupabaseAdminError';
  }
}

export async function supabaseAdminRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new SupabaseAdminError('El backend de pedidos no está configurado.', 503);
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  });
  const responseText = await response.text();
  let result: unknown;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    result = null;
  }

  if (!response.ok) {
    const payload = result as { message?: string } | null;
    throw new SupabaseAdminError(payload?.message ?? 'No se pudo completar la operación.', response.status);
  }

  return result as T;
}

export function isOrderAdmin(request: Request): boolean {
  const adminToken = process.env.ORDER_ADMIN_TOKEN;
  return Boolean(adminToken && request.headers.get('authorization') === `Bearer ${adminToken}`);
}

export function errorResponse(error: unknown): Response {
  if (error instanceof SupabaseAdminError) {
    return Response.json({ message: error.message }, { status: error.status });
  }

  return Response.json({ message: 'Ocurrió un error al procesar la solicitud.' }, { status: 500 });
}