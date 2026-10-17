import { supabase } from '@/lib/supabase';
import { AuthUser, StaffMember, RolePermissionItem, StaffAuditLogItem, PermissionState } from '@/types';
import { cacheAuthProfile, clearAuthProfile } from '@/utils/security';

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
  | { ok: false; error: string };

export async function loginStaff(identifier: string, password: string): Promise<LoginResult> {
  purgeLegacyStaffCache();
  let result: { ok: boolean; data: Record<string, unknown> };
  try {
    result = await postJson('/api/auth/login', { identifier, password });
  } catch {
    return { ok: false, error: 'Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.' };
  }
  if (!result.ok) {
    return { ok: false, error: (result.data.error as string) || 'No se pudo iniciar sesión.' };
  }

  const session = result.data.session as { access_token: string; refresh_token: string };
  const { error } = await supabase.auth.setSession(session);
  if (error) return { ok: false, error: 'No se pudo guardar la sesión en este dispositivo.' };

  const user = await loadCurrentStaffUser();
  if (!user) {
    await supabase.auth.signOut();
    return { ok: false, error: 'Tu cuenta no está vinculada a un colaborador. Contacta al administrador.' };
  }
  return { ok: true, user, mustChangePassword: result.data.mustChangePassword === true };
}

export async function logoutStaff(): Promise<void> {
  clearAuthProfile();
  purgeLegacyStaffCache();
  await supabase.auth.signOut().catch(() => undefined);
}

export async function changeOwnPassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { ok, data } = await postJson('/api/auth/change-password', { newPassword });
    if (!ok) return { ok: false, error: (data.error as string) || 'No se pudo cambiar la contraseña.' };
    // El JWT trae must_change_password: se renueva para que el proxy vea el cambio.
    await supabase.auth.refreshSession();
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
    const items: RolePermissionItem[] = data.map((d: any) => ({
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
    const { error } = await supabase
      .from('role_permissions')
      .update({ [field]: value, updated_at: new Date().toISOString() } as any)
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

export async function fetchAuditLogsFromDb(): Promise<StaffAuditLogItem[]> {
  try {
    const { data, error } = await supabase
      .from('staff_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) {
      return [
        {
          id: 'log-1',
          action: 'Actualización de Permisos',
          performedBy: 'Chef Ejecutivo',
          target: 'Jefe de Cocina',
          details: 'Modificación de acceso: Edición de Menú a Lectura',
          level: 'info',
          createdAt: new Date(Date.now() - 15 * 60000).toISOString()
        },
        {
          id: 'log-2',
          action: 'Nuevo Colaborador Registrado',
          performedBy: 'Administrador General',
          target: 'Mateo Rivera',
          details: 'Asignado a Barra & Mixología con PIN TPV encriptado',
          level: 'info',
          createdAt: new Date(Date.now() - 45 * 60000).toISOString()
        },
        {
          id: 'log-3',
          action: 'Verificación de Políticas Globales',
          performedBy: 'Seguridad Sistema',
          target: 'Terminales TPV & KDS',
          details: 'Políticas de timeout y PIN estricto sincronizadas',
          level: 'info',
          createdAt: new Date(Date.now() - 120 * 60000).toISOString()
        }
      ];
    }

    return data.map((l: any) => ({
      id: l.id,
      action: l.action,
      performedBy: l.performed_by || 'Sistema GastroPulse',
      target: l.target || undefined,
      details: l.details || undefined,
      level: l.level || 'info',
      createdAt: l.created_at
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

