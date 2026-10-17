import {
  ServerConfigError,
  createServiceClient,
  isSameOrigin,
  json,
  normalizeUsername,
  recordAudit,
  staffAppMetadata,
  staffName,
  staffAuthEmail,
  type StaffRole
} from '@/lib/supabaseServer';
import { parsePassword, parsePin, parseStaffFields, requireAdmin } from './shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Alta de colaborador: crea su cuenta en Supabase Auth (contraseña hasheada por
 * Auth, rol firmado en app_metadata), la fila en staff y su PIN de desbloqueo.
 * La contraseña que pone el admin es temporal: se pide cambiarla al entrar.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }

  try {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;

    const username = normalizeUsername(body.username);
    if (!username) return json({ error: 'Usuario: 3 a 40 caracteres (letras, números, punto, guion).' }, 400);
    const fields = parseStaffFields(body, true);
    if (typeof fields === 'string') return json({ error: fields }, 400);
    const pin = parsePin(body.pin);
    const password = parsePassword(body.password);
    if (pin === 'invalid' || pin === null) return json({ error: 'El PIN debe tener entre 4 y 8 dígitos.' }, 400);
    if (password === 'invalid' || password === null) {
      return json({ error: 'La contraseña temporal debe tener entre 8 y 72 caracteres.' }, 400);
    }

    const service = createServiceClient();
    const role = fields.role as StaffRole;
    const { data: created, error: authError } = await service.auth.admin.createUser({
      email: staffAuthEmail(username),
      password,
      email_confirm: true,
      app_metadata: { staff_role: role, must_change_password: true }
    });
    if (authError || !created.user) {
      const duplicated = /already|registered|exists/i.test(authError?.message ?? '');
      return json({ error: duplicated ? 'Ese usuario ya existe.' : authError?.message || 'No se pudo crear la cuenta.' }, duplicated ? 409 : 400);
    }

    const { data: row, error: insertError } = await service
      .from('staff')
      .insert({
        ...fields,
        name: fields.name as string,
        role,
        username,
        status: fields.status ?? 'Activo',
        auth_user_id: created.user.id,
        must_change_password: true
      })
      .select('id')
      .single();
    if (insertError || !row) {
      // Sin fila en staff la cuenta no sirve: se deshace para no dejar huérfanos.
      await service.auth.admin.deleteUser(created.user.id);
      const duplicated = insertError?.code === '23505';
      return json({ error: duplicated ? 'Ese usuario ya existe.' : 'No se pudo registrar al colaborador.' }, duplicated ? 409 : 400);
    }

    const [{ error: metaError }, { error: pinError }] = await Promise.all([
      service.auth.admin.updateUserById(created.user.id, { app_metadata: staffAppMetadata(row.id, role, true) }),
      service.rpc('admin_set_staff_pin', { p_staff_id: row.id, p_pin: pin })
    ]);
    if (metaError || pinError) {
      await service.from('staff').delete().eq('id', row.id);
      await service.auth.admin.deleteUser(created.user.id);
      return json({ error: 'No se pudo completar el alta. Inténtalo de nuevo.' }, 503);
    }

    await recordAudit(service, {
      action: 'Nuevo colaborador registrado',
      performedBy: await staffName(service, admin.staffId),
      target: fields.name as string,
      details: `Usuario ${username} · Rol ${role}`,
      eventType: 'STAFF_CREATED'
    });
    return json({ id: row.id }, 201);
  } catch (err) {
    if (err instanceof ServerConfigError) return json({ error: 'Falta configurar el servidor (service role).' }, 503);
    console.error('[api/staff] Error inesperado:', err);
    return json({ error: 'No se pudo registrar al colaborador.' }, 503);
  }
}
