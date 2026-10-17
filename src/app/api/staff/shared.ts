import { STAFF_ROLES, getStaffFromRequest, isValidPassword, json, type StaffClaims, type StaffRole } from '@/lib/supabaseServer';

/** Solo un admin con sesión válida (y sin contraseña temporal pendiente) gestiona el personal. */
export async function requireAdmin(request: Request): Promise<StaffClaims | Response> {
  const staff = await getStaffFromRequest(request);
  if (!staff) return json({ error: 'Inicia sesión como administrador.' }, 401);
  if (staff.role !== 'admin') return json({ error: 'Solo el administrador puede gestionar al personal.' }, 403);
  if (staff.mustChangePassword) return json({ error: 'Primero cambia tu contraseña temporal.' }, 403);
  return staff;
}

export type StaffFields = {
  name?: string;
  role?: StaffRole;
  role_title?: string | null;
  station?: string | null;
  status?: string;
  email?: string | null;
  avatar_url?: string | null;
  custom_permissions?: Record<string, string> | null;
};

const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : undefined;

/**
 * Valida los campos editables de un colaborador. Devuelve un mensaje de error
 * o los campos listos para la tabla staff. `pin` y `password` van aparte.
 */
export function parseStaffFields(body: Record<string, unknown>, requireAll: boolean): StaffFields | string {
  const fields: StaffFields = {};

  if (body.name !== undefined || requireAll) {
    const name = text(body.name, 80);
    if (!name) return 'Indica el nombre (máximo 80 caracteres).';
    fields.name = name;
  }
  if (body.role !== undefined || requireAll) {
    if (!STAFF_ROLES.includes(body.role as StaffRole)) return 'Rol no válido.';
    fields.role = body.role as StaffRole;
  }
  if (body.roleTitle !== undefined) fields.role_title = text(body.roleTitle, 80) ?? null;
  if (body.station !== undefined) fields.station = text(body.station, 80) ?? null;
  if (body.status !== undefined) fields.status = text(body.status, 40) ?? 'Activo';
  if (body.avatarUrl !== undefined) fields.avatar_url = text(body.avatarUrl, 500) ?? null;
  if (body.email !== undefined) {
    const email = text(body.email, 120);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'El correo de contacto no es válido.';
    fields.email = email ?? null;
  }
  if (body.customPermissions !== undefined) {
    const perms = body.customPermissions;
    if (perms !== null && (typeof perms !== 'object' || Array.isArray(perms))) return 'Permisos no válidos.';
    fields.custom_permissions = perms as Record<string, string> | null;
  }
  return fields;
}

export function parsePin(value: unknown): string | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  return typeof value === 'string' && /^[0-9]{4,8}$/.test(value) ? value : 'invalid';
}

export function parsePassword(value: unknown): string | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  return isValidPassword(value) ? value : 'invalid';
}
