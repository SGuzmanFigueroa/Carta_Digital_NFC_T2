import {
  STAFF_ROLES,
  ServerConfigError,
  createAnonServerClient,
  createServiceClient,
  isSameOrigin,
  json,
  recordAudit,
  staffAuthEmail,
  type StaffRole
} from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ⚠️ SOLO PARA LA ETAPA DE DESARROLLO. Acceso con un clic a las cuentas demo
 * (demo_admin, demo_cocina, demo_sala, demo_barra), sin contraseña. Son cuentas
 * aparte del personal real: se crean con
 * `node scripts/provision-staff-auth.mjs --demo-accounts`. Cualquiera que abra /login
 * puede entrar como admin mientras esté encendido.
 *
 * Se apaga con NEXT_PUBLIC_DEMO_LOGIN_ENABLED=false (Netlify + .env.local) y debe
 * BORRARSE antes de tener clientes reales, junto con los botones demo de
 * LoginScreen.
 *
 * Abre una sesión real de Supabase Auth (magic link generado en el servidor),
 * así RLS, el proxy y las rutas /api se comportan igual que con login normal.
 */
const isDemoLoginEnabled = () => process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED !== 'false';

const DEMO_USERNAMES: Partial<Record<StaffRole, string>> = {
  admin: 'demo_admin',
  kitchen: 'demo_cocina',
  floor: 'demo_sala',
  bar: 'demo_barra'
};

export async function POST(request: Request) {
  if (!isDemoLoginEnabled()) return json({ error: 'El acceso demo está desactivado.' }, 404);
  if (!isSameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);

  let body: { role?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }
  const username = STAFF_ROLES.includes(body.role as StaffRole) ? DEMO_USERNAMES[body.role as StaffRole] : undefined;
  if (!username) return json({ error: 'Rol no válido.' }, 400);

  try {
    const service = createServiceClient();
    const { data: staff, error: staffError } = await service
      .from('staff')
      .select('username, auth_user_id')
      .eq('username', username)
      .not('auth_user_id', 'is', null)
      .maybeSingle();
    if (staffError) throw staffError;
    if (!staff) return json({ error: 'La cuenta demo no existe. Créala con: node scripts/provision-staff-auth.mjs --demo-accounts' }, 404);

    const { data: link, error: linkError } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: staffAuthEmail(staff.username)
    });
    if (linkError || !link.properties?.hashed_token) throw linkError ?? new Error('Sin token');

    const { data, error } = await createAnonServerClient().auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: 'magiclink'
    });
    if (error || !data.session) throw error ?? new Error('Sin sesión');
    await recordAudit(service, {
      action: 'Acceso rápido demo',
      performedBy: staff.username,
      details: 'Botón demo del login (solo etapa de desarrollo)',
      level: 'warning',
      eventType: 'LOGIN_SUCCESS'
    });

    return json({
      session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
      mustChangePassword: data.user?.app_metadata?.must_change_password === true
    });
  } catch (err) {
    if (err instanceof ServerConfigError) return json({ error: 'Falta configurar el servidor (service role).' }, 503);
    console.error('[auth/demo-login] Error inesperado:', err);
    return json({ error: 'No se pudo abrir la sesión demo.' }, 503);
  }
}
