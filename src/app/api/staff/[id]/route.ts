import {
  ServerConfigError,
  createServiceClient,
  isSameOrigin,
  json,
  recordAudit,
  staffAppMetadata,
  staffName,
  type StaffRole
} from '@/lib/supabaseServer';
import { parsePassword, parsePin, parseStaffFields, requireAdmin } from '../shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * Edición de colaborador. `pin` y `password` son opcionales: vacíos = no cambiar.
 * Una contraseña puesta por el admin queda como temporal (cambio obligatorio).
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isSameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);
  const { id } = await params;
  if (!isUuid(id)) return json({ error: 'Colaborador no válido.' }, 400);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }

  try {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;

    const fields = parseStaffFields(body, false);
    if (typeof fields === 'string') return json({ error: fields }, 400);
    const pin = parsePin(body.pin);
    const password = parsePassword(body.password);
    if (pin === 'invalid') return json({ error: 'El PIN debe tener entre 4 y 8 dígitos.' }, 400);
    if (password === 'invalid') return json({ error: 'La contraseña debe tener entre 8 y 72 caracteres.' }, 400);
    if (id === admin.staffId && fields.role && fields.role !== 'admin') {
      return json({ error: 'No puedes quitarte tu propio rol de administrador.' }, 400);
    }

    const service = createServiceClient();
    const { data: current, error: readError } = await service
      .from('staff')
      .select('id, name, role, auth_user_id, must_change_password')
      .eq('id', id)
      .maybeSingle();
    if (readError) throw readError;
    if (!current) return json({ error: 'El colaborador ya no existe.' }, 404);

    const mustChange = password ? true : current.must_change_password;
    if (Object.keys(fields).length > 0 || password) {
      const { error } = await service
        .from('staff')
        .update({ ...fields, must_change_password: mustChange })
        .eq('id', id);
      if (error) throw error;
    }

    if (current.auth_user_id && (fields.role || password)) {
      const role = (fields.role ?? current.role) as StaffRole;
      const { error } = await service.auth.admin.updateUserById(current.auth_user_id, {
        ...(password ? { password } : {}),
        app_metadata: staffAppMetadata(id, role, mustChange)
      });
      if (error) return json({ error: error.message || 'No se pudo actualizar la cuenta.' }, 400);
    }

    if (pin) {
      const { error } = await service.rpc('admin_set_staff_pin', { p_staff_id: id, p_pin: pin });
      if (error) throw error;
    }

    const changes = [
      ...Object.keys(fields),
      ...(pin ? ['PIN'] : []),
      ...(password ? ['contraseña temporal'] : [])
    ];
    await recordAudit(service, {
      action: 'Actualización de colaborador',
      performedBy: await staffName(service, admin.staffId),
      target: fields.name ?? current.name,
      // Solo qué cambió, nunca los valores de PIN o contraseña.
      details: `Cambios: ${changes.join(', ') || 'ninguno'}`,
      level: fields.role && fields.role !== current.role ? 'warning' : 'info',
      eventType: 'STAFF_UPDATED'
    });
    return json({ ok: true });
  } catch (err) {
    if (err instanceof ServerConfigError) return json({ error: 'Falta configurar el servidor (service role).' }, 503);
    console.error('[api/staff/:id] Error inesperado:', err);
    return json({ error: 'No se pudo actualizar al colaborador.' }, 503);
  }
}

/** Baja de colaborador: borra su fila y su cuenta de Supabase Auth. */
export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isSameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);
  const { id } = await params;
  if (!isUuid(id)) return json({ error: 'Colaborador no válido.' }, 400);

  try {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;
    if (id === admin.staffId) return json({ error: 'No puedes eliminar tu propia cuenta.' }, 400);

    const service = createServiceClient();
    const { data: current, error: readError } = await service
      .from('staff')
      .select('name, username, auth_user_id')
      .eq('id', id)
      .maybeSingle();
    if (readError) throw readError;
    if (!current) return json({ ok: true });

    const { error } = await service.from('staff').delete().eq('id', id);
    if (error) throw error;
    if (current.auth_user_id) await service.auth.admin.deleteUser(current.auth_user_id);
    await recordAudit(service, {
      action: 'Colaborador dado de baja',
      performedBy: await staffName(service, admin.staffId),
      target: current.name,
      details: `Usuario ${current.username} retirado del sistema`,
      level: 'warning',
      eventType: 'STAFF_DELETED'
    });
    return json({ ok: true });
  } catch (err) {
    if (err instanceof ServerConfigError) return json({ error: 'Falta configurar el servidor (service role).' }, 503);
    console.error('[api/staff/:id] Error inesperado:', err);
    return json({ error: 'No se pudo eliminar al colaborador.' }, 503);
  }
}
