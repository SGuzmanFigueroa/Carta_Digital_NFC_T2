import { supabase } from '@/lib/supabase';
import { AuthUser, StaffMember, RolePermissionItem, StaffAuditLogItem, PermissionState } from '@/types';
import { cacheAuthProfile, clearAuthProfile } from '@/utils/security';
import { clearSessionChoice, isBrowserSessionExpired, rememberSessionChoice } from '@/utils/sessionPersistence';
import type { Database } from '@/types/database.types';
export { getSafeLoginRedirect } from '@/utils/loginRedirect';

// ==========================================
// Sesión del personal (Supabase Auth)
// ==========================================
// El login pasa por /api/auth/login (límite de intentos en el servidor). La
// sesión vive en cookies de Supabase (@supabase/ssr) y el rol viaja firmado en
// el JWT (app_metadata.staff_role); el proxy y RLS confían en eso, no en la UI.

/** Columnas públicas de staff (las sensibles ya no existen o viven en `private`). */
const STAFF_COLUMNS =
  'id, name, username, role, role_title, status, station, avatar_url, email, custom_permissions, created_at, auth_user_id, must_change_password';

type StaffRow = {
  id: string;
  name: string;
  username: string;
  role: string;
  role_title: string | null;
  status: string | null;
  station: string | null;
  avatar_url: string | null;
  email: string | null;
  custom_permissions: unknown;
  must_change_password: boolean;
};

const LEGACY_STAFF_CACHE_KEY = 'gastropulse_staff_list_v1';

/** Versiones anteriores guardaban la lista de personal con PIN y contraseñas en claro. */
function purgeLegacyStaffCache() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LEGACY_STAFF_CACHE_KEY);
  } catch {}
}

function toAuthUser(row: StaffRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email || '',
    role: (row.role?.toLowerCase().trim() as AuthUser['role']) || 'floor',
    roleTitle: row.role_title || 'Personal GastroPulse',
    pin: '',
    assignment: row.station || 'General',
    terminal: 'TPV-01 (Principal)',
    loginTime: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  };
}

/** Bearer token de la sesión actual para las rutas /api protegidas. */
async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function postJson(url: string, body: unknown, method = 'POST'): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, data };
}

/** Perfil del colaborador con sesión activa (o null si no hay sesión válida). */
export async function loadCurrentStaffUser(): Promise<AuthUser | null> {
  // "Recordar sesión" desmarcado y el navegador se cerró: la sesión termina aquí.
  if (isBrowserSessionExpired()) {
    await logoutStaff();
    return null;
  }
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) {
    clearAuthProfile();
    return null;
  }
  const { data, error } = await supabase.from('staff').select(STAFF_COLUMNS).eq('auth_user_id', userId).maybeSingle();
  if (error || !data) return null;
  const user = toAuthUser(data as StaffRow);
  cacheAuthProfile(user);
  return user;
}

export type LoginResult =
  | { ok: true; user: AuthUser; mustChangePassword: boolean }
  | { ok: false; error: string; /** Bloqueo por intentos: segundos que faltan. */ retryAfterSeconds?: number };

/** `remember=false`: la sesión se cierra al cerrar el navegador. */
export function loginStaff(identifier: string, password: string, remember = true): Promise<LoginResult> {
  return openStaffSession('/api/auth/login', { identifier, password }, remember);
}

/** ⚠️ Solo etapa de desarrollo: entra con la cuenta demo del rol (ver /api/auth/demo-login). */
export function loginDemo(role: 'admin' | 'kitchen' | 'floor' | 'bar'): Promise<LoginResult> {
  return openStaffSession('/api/auth/demo-login', { role }, true);
}

async function openStaffSession(url: string, body: unknown, remember: boolean): Promise<LoginResult> {
  purgeLegacyStaffCache();
  let result: { ok: boolean; data: Record<string, unknown> };
  try {
    result = await postJson(url, body);
  } catch {
    return { ok: false, error: 'Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.' };
  }
  if (!result.ok) {
    const retryAfter = Number(result.data.retryAfter);
    return {
      ok: false,
      error: (result.data.error as string) || 'No se pudo iniciar sesión.',
      retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : undefined
    };
  }

  const session = result.data.session as { access_token: string; refresh_token: string };
  const { error } = await supabase.auth.setSession(session);
  if (error) return { ok: false, error: 'No se pudo guardar la sesión en este dispositivo.' };
  rememberSessionChoice(remember);

  const user = await loadCurrentStaffUser();
  if (!user) {
    await supabase.auth.signOut();
    return { ok: false, error: 'Tu cuenta no está vinculada a un colaborador. Contacta al administrador.' };
  }
  return { ok: true, user, mustChangePassword: result.data.mustChangePassword === true };
}

export async function logoutStaff(): Promise<void> {
  clearAuthProfile();
  clearSessionChoice();
  purgeLegacyStaffCache();
  await supabase.auth.signOut().catch(() => undefined);
}

export async function changeOwnPassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { ok, data } = await postJson('/api/auth/change-password', { newPassword });
    if (!ok) return { ok: false, error: (data.error as string) || 'No se pudo cambiar la contraseña.' };
    // Cambiar la contraseña invalida la sesión anterior: el servidor devuelve una
    // nueva (JWT con must_change_password=false) para que el proxy deje pasar.
    const session = data.session as { access_token: string; refresh_token: string } | null;
    if (!session) {
      await supabase.auth.signOut().catch(() => undefined);
      return { ok: false, error: 'Contraseña cambiada. Vuelve a iniciar sesión con la nueva.' };
    }
    const { error } = await supabase.auth.setSession(session);
    if (error) return { ok: false, error: 'Contraseña cambiada. Vuelve a iniciar sesión con la nueva.' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Sin conexión con el servidor.' };
  }
}

export type PinCheck = { ok: boolean; reason?: 'wrong_pin' | 'locked' | 'no_pin'; remaining?: number; lockedUntil?: string };

/** Desbloqueo de terminal: el servidor compara el PIN (bcrypt) y bloquea tras 5 fallos. */
export async function verifyMyPin(pin: string): Promise<PinCheck> {
  const { data, error } = await supabase.rpc('verify_my_pin', { p_pin: pin });
  if (error) throw error;
  const result = data as { ok: boolean; reason?: PinCheck['reason']; remaining?: number; locked_until?: string };
  return { ok: result.ok, reason: result.reason, remaining: result.remaining, lockedUntil: result.locked_until };
}

// ==========================================
// Gestión de personal (admin → /api/staff)
// ==========================================

export async function fetchStaffFromDb(): Promise<StaffMember[]> {
  purgeLegacyStaffCache();
  try {
    const { data, error } = await supabase.from('staff').select(STAFF_COLUMNS).order('created_at', { ascending: true });
    if (error || !data) return [];

    return (data as StaffRow[]).map((s) => ({
      id: s.id,
      name: s.name,
      initials: s.name.charAt(0).toUpperCase(),
      username: s.username,
      role: s.role,
      roleTitle: s.role_title || undefined,
      status: s.status || 'Activo',
      station: s.station || undefined,
      assignment: s.station || 'Salón Principal',
      permissions: s.custom_permissions ? 'Permisos Personalizados' : 'Acceso Estándar TPV & Comandas',
      avatarUrl: s.avatar_url || undefined,
      email: s.email || undefined,
      customPermissions: (s.custom_permissions as StaffMember['customPermissions']) || undefined
    }));
  } catch (err) {
    console.error('Error fetching staff from DB:', err);
    return [];
  }
}

/** Lista de personal (solo con sesión de staff; RLS la oculta al público). */
export const getPersistedStaffList = fetchStaffFromDb;

function staffPayload(staff: Partial<StaffMember>) {
  return {
    name: staff.name,
    username: staff.username,
    role: staff.role,
    roleTitle: staff.roleTitle,
    station: staff.assignment || staff.station,
    status: staff.status,
    email: staff.email,
    avatarUrl: staff.avatarUrl,
    customPermissions: staff.customPermissions,
    // Solo de escritura: vacíos = no cambiar. Nunca se leen de vuelta.
    pin: staff.pin || undefined,
    password: staff.password || undefined
  };
}

export type StaffMutationResult = { ok: boolean; error?: string };

async function mutateStaff(url: string, method: string, body?: unknown): Promise<StaffMutationResult> {
  try {
    const { ok, data } = await postJson(url, body, method);
    return ok ? { ok: true } : { ok: false, error: (data.error as string) || 'No se pudo guardar el cambio.' };
  } catch {
    return { ok: false, error: 'Sin conexión con el servidor.' };
  }
}

export function createStaffMemberInDb(staff: StaffMember): Promise<StaffMutationResult> {
  return mutateStaff('/api/staff', 'POST', staffPayload(staff));
}

export function updateStaffMemberInDb(staff: StaffMember): Promise<StaffMutationResult> {
  return mutateStaff(`/api/staff/${encodeURIComponent(staff.id)}`, 'PATCH', staffPayload(staff));
}

export function updateStaffStatusInDb(staffId: string, status: string): Promise<StaffMutationResult> {
  return mutateStaff(`/api/staff/${encodeURIComponent(staffId)}`, 'PATCH', { status });
}

export function deleteStaffMemberFromDb(staffId: string): Promise<StaffMutationResult> {
  return mutateStaff(`/api/staff/${encodeURIComponent(staffId)}`, 'DELETE');
}

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionItem[] = [
  {
    id: 'perm-admin',
    roleId: 'admin',
    roleTitle: 'Administrador General',
    roleDescription: 'Control absoluto y cierres financieros',
    panelAdmin: 'allow',
    kdsCocina: 'allow',
    edicionMenu: 'allow',
    cobroPos: 'allow',
    anulacionComandas: 'allow'
  },
  {
    id: 'perm-sous-chef',
    roleId: 'sous_chef',
    roleTitle: 'Jefe de Cocina / Sous Chef',
    roleDescription: 'Gestión de tiempos y stock de comandas',
    panelAdmin: 'deny',
    kdsCocina: 'allow',
    edicionMenu: 'read',
    cobroPos: 'deny',
    anulacionComandas: 'deny'
  },
  {
    id: 'perm-waiter',
    roleId: 'waiter',
    roleTitle: 'Camarero / Sala',
    roleDescription: 'Apertura y cobro en comensales de salón',
    panelAdmin: 'deny',
    kdsCocina: 'deny',
    edicionMenu: 'deny',
    cobroPos: 'allow',
    anulacionComandas: 'deny'
  },
  {
    id: 'perm-bartender',
    roleId: 'bartender',
    roleTitle: 'Bartender Principal',
    roleDescription: 'KDS Barra y control de stock de bodega rápida',
    panelAdmin: 'deny',
    kdsCocina: 'allow',
    edicionMenu: 'deny',
    cobroPos: 'allow',
    anulacionComandas: 'deny'
  },
  {
    id: 'perm-runner',
    roleId: 'runner',
    roleTitle: 'Runner / Entrega',
    roleDescription: 'Despacho de platillos desde el pase',
    panelAdmin: 'deny',
    kdsCocina: 'read',
    edicionMenu: 'deny',
    cobroPos: 'deny',
    anulacionComandas: 'deny'
  }
];

export async function fetchRolePermissionsFromDb(): Promise<RolePermissionItem[]> {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .order('role_id', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_ROLE_PERMISSIONS;
    }

    const order = ['admin', 'sous_chef', 'waiter', 'bartender', 'runner'];
    const items: RolePermissionItem[] = data.map((d) => ({
      id: d.id,
      roleId: d.role_id,
      roleTitle: d.role_title,
      roleDescription: d.role_description || '',
      panelAdmin: d.panel_admin as PermissionState,
      kdsCocina: d.kds_cocina as PermissionState,
      edicionMenu: d.edicion_menu as PermissionState,
      cobroPos: d.cobro_pos as PermissionState,
      anulacionComandas: d.anulacion_comandas as PermissionState
    }));

    items.sort((a, b) => {
      const idxA = order.indexOf(a.roleId);
      const idxB = order.indexOf(b.roleId);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });

    return items;
  } catch (err) {
    console.error('Error fetching role_permissions from DB:', err);
    return DEFAULT_ROLE_PERMISSIONS;
  }
}

export async function updateRolePermissionInDb(
  roleId: string,
  field: 'panel_admin' | 'kds_cocina' | 'edicion_menu' | 'cobro_pos' | 'anulacion_comandas',
  value: PermissionState
): Promise<boolean> {
  try {
    const patch: Database['public']['Tables']['role_permissions']['Update'] = { updated_at: new Date().toISOString() };
    patch[field] = value;
    const { error } = await supabase
      .from('role_permissions')
      .update(patch)
      .eq('role_id', roleId);

    if (error) {
      console.error('Error updating role permission in DB:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in updateRolePermissionInDb:', err);
    return false;
  }
}

const AUDIT_LEVELS: readonly StaffAuditLogItem['level'][] = ['info', 'warning', 'critical'];

export async function fetchAuditLogsFromDb(): Promise<StaffAuditLogItem[]> {
  try {
    const { data, error } = await supabase
      .from('staff_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // Sin registros (o sin permiso) se muestra vacío: antes se inventaban entradas de ejemplo.
    if (error || !data) return [];

    return data.map((l) => ({
      id: l.id,
      action: l.action,
      performedBy: l.performed_by || 'Sistema GastroPulse',
      target: l.target || undefined,
      details: l.details || undefined,
      level: AUDIT_LEVELS.find((level) => level === l.level) ?? 'info',
      createdAt: l.created_at ?? ''
    }));
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return [];
  }
}

export async function createAuditLogInDb(
  action: string,
  target?: string,
  details?: string,
  level: 'info' | 'warning' | 'critical' = 'info',
  performedBy: string = 'Chef Ejecutivo'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('staff_audit_logs')
      .insert({
        action,
        target: target || null,
        details: details || null,
        level,
        performed_by: performedBy
      });

    return !error;
  } catch (err) {
    console.error('Error writing audit log to DB:', err);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
    });
    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'No se pudo enviar el correo de recuperación.';
    console.error('Error enviando correo de recuperación:', message);
    return { success: false, error: message };
  }
}
