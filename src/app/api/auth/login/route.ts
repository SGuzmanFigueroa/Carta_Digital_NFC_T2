import {
  ServerConfigError,
  clientIp,
  createAnonServerClient,
  createServiceClient,
  ilikeExact,
  isSameOrigin,
  json,
  staffAuthEmail
} from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INACTIVE_STATUSES = ['inactivo', 'inactive', 'disabled', 'desactivado', 'suspended'];
// Mismo mensaje para usuario inexistente y contraseña errónea: no revela quién existe.
const WRONG_CREDENTIALS = 'Usuario o contraseña incorrectos.';

/**
 * Login del personal. Corre en el servidor para poder limitar intentos por
 * usuario e IP (private.login_attempts) y resolver el usuario a su cuenta de
 * Supabase Auth sin exponer la tabla staff. Devuelve la sesión para que el
 * navegador la guarde en cookies (supabase.auth.setSession).
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);

  let body: { identifier?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }
  if (
    typeof body.identifier !== 'string' || typeof body.password !== 'string' ||
    !body.identifier.trim() || body.identifier.length > 120 || !body.password || body.password.length > 200
  ) {
    return json({ error: 'Ingresa tu usuario y contraseña.' }, 400);
  }

  const identifier = body.identifier.trim().toLowerCase();
  const ip = clientIp(request);

  try {
    const service = createServiceClient();
    const { data: retryAfter, error: retryError } = await service.rpc('login_retry_after', {
      p_identifier: identifier,
      p_ip: ip
    });
    if (retryError) throw retryError;
    if (retryAfter > 0) {
      const minutes = Math.ceil(retryAfter / 60);
      return json(
        { error: `Demasiados intentos fallidos. Vuelve a intentarlo en ${minutes} min.` },
        429,
        { 'Retry-After': String(retryAfter) }
      );
    }

    // Usuario o correo de contacto, sin distinguir mayúsculas (ilike sin comodines).
    const column = identifier.includes('@') ? 'email' : 'username';
    const { data: matches, error: staffError } = await service
      .from('staff')
      .select('id, username, status, auth_user_id')
      .ilike(column, ilikeExact(identifier))
      .limit(2);
    if (staffError) throw staffError;
    const staff = matches?.length === 1 ? matches[0] : null;

    // Siempre se intenta el login (aunque el usuario no exista) para que el tiempo
    // de respuesta no delate qué usuarios son reales.
    const email = staff?.auth_user_id ? staffAuthEmail(staff.username) : staffAuthEmail(`nadie-${crypto.randomUUID()}`);
    const auth = createAnonServerClient();
    const { data, error } = await auth.auth.signInWithPassword({ email, password: body.password });

    const signedInAs = data.user?.id;
    if (error || !data.session || !staff || signedInAs !== staff.auth_user_id) {
      await service.rpc('record_login_attempt', { p_identifier: identifier, p_ip: ip, p_success: false });
      return json({ error: WRONG_CREDENTIALS }, 401);
    }

    if (INACTIVE_STATUSES.includes((staff.status ?? '').trim().toLowerCase())) {
      await auth.auth.signOut();
      return json({ error: 'Cuenta inactiva. Contacta al administrador del restaurante.' }, 403);
    }

    await service.rpc('record_login_attempt', { p_identifier: identifier, p_ip: ip, p_success: true });
    return json({
      session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
      mustChangePassword: data.user.app_metadata?.must_change_password === true
    });
  } catch (err) {
    if (err instanceof ServerConfigError) {
      console.error('[auth/login]', err.message);
      return json({ error: 'El inicio de sesión no está configurado en el servidor.' }, 503);
    }
    console.error('[auth/login] Error inesperado:', err);
    return json({ error: 'No se pudo iniciar sesión. Inténtalo de nuevo.' }, 503);
  }
}
