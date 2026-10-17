import {
  ServerConfigError,
  createServiceClient,
  getStaffFromRequest,
  isSameOrigin,
  isValidPassword,
  json
} from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * El colaborador cambia su propia contraseña (obligatorio tras recibir una
 * temporal). Se hace con service_role para poder limpiar también la marca
 * must_change_password de app_metadata, que el navegador no puede tocar.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);

  let body: { newPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }
  if (!isValidPassword(body.newPassword)) {
    return json({ error: 'La contraseña debe tener entre 8 y 72 caracteres.' }, 400);
  }

  try {
    const staff = await getStaffFromRequest(request);
    if (!staff) return json({ error: 'Tu sesión venció. Vuelve a iniciar sesión.' }, 401);

    const service = createServiceClient();
    const { data: current, error: readError } = await service.auth.admin.getUserById(staff.userId);
    if (readError || !current.user) throw readError ?? new Error('Usuario no encontrado');

    const { error } = await service.auth.admin.updateUserById(staff.userId, {
      password: body.newPassword,
      app_metadata: { ...current.user.app_metadata, must_change_password: false }
    });
    if (error) {
      // Supabase rechaza, por ejemplo, contraseñas filtradas o demasiado débiles.
      return json({ error: error.message || 'No se pudo cambiar la contraseña.' }, 400);
    }
    await service.from('staff').update({ must_change_password: false }).eq('id', staff.staffId);
    return json({ ok: true });
  } catch (err) {
    if (err instanceof ServerConfigError) {
      console.error('[auth/change-password]', err.message);
      return json({ error: 'El servidor no está configurado para cambiar contraseñas.' }, 503);
    }
    console.error('[auth/change-password] Error inesperado:', err);
    return json({ error: 'No se pudo cambiar la contraseña. Inténtalo de nuevo.' }, 503);
  }
}
