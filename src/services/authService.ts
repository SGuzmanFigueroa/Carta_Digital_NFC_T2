import { supabase } from '@/lib/supabase';
import { AuthUser, StaffMember, RolePermissionItem, StaffAuditLogItem, PermissionState } from '@/types';

export async function loginStaffWithPin(pin: string): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('pin', pin.trim())
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const authUser: AuthUser = {
      id: data.id,
      name: data.name,
      username: data.username,
      email: `${data.username}@aureabistro.pe`,
      role: (data.role?.toLowerCase().trim() as AuthUser['role']) || 'kitchen',
      roleTitle: data.role_title || 'Personal GastroPulse',
      pin: data.pin,
      assignment: data.station || 'General',
      terminal: 'TPV-01 (Principal)',
      loginTime: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    };

    return authUser;
  } catch (err) {
    console.error('Error logging in with PIN:', err);
    return null;
  }
}

export async function loginStaffWithCredentials(
  userOrEmail: string,
  plainPassword: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const clean = userOrEmail.trim().toLowerCase();
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .or(`email.ilike.${clean},username.ilike.${clean},name.ilike.${clean}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[AuthService] Error querying staff in Supabase:', error.message);
      return { success: false, error: 'Error de conexión con la base de datos de autenticación.' };
    }

    if (!data) {
      return { success: false, error: 'Usuario o correo no encontrado en el sistema.' };
    }

    if (['inactivo', 'inactive', 'disabled', 'desactivado', 'suspended'].includes(data.status?.trim().toLowerCase() || '')) {
      return { success: false, error: 'Cuenta inactiva. Por favor contacta al administrador del restaurante.' };
    }

    const staffRecord = data as any;
    const isValidPass = (staffRecord.password && staffRecord.password === plainPassword) || (data.pin && data.pin === plainPassword);
    if (!isValidPass) {
      return { success: false, error: 'Contraseña o credenciales incorrectas.' };
    }

    const authUser: AuthUser = {
      id: data.id,
      name: data.name,
      username: data.username,
      email: (data as any).email || `${data.username}@aureabistro.pe`,
      role: (data.role?.toLowerCase().trim() as AuthUser['role']) || 'floor',
      roleTitle: data.role_title || 'Personal GastroPulse',
      pin: data.pin || '1234',
      assignment: data.station || 'Salón Principal',
      terminal: 'TERM-04',
      loginTime: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    };

    return { success: true, user: authUser };
  } catch (err: any) {
    console.error('Error during staff credentials login:', err);
    return { success: false, error: 'Error inesperado durante la autenticación.' };
  }
}

export async function fetchStaffFromDb(): Promise<StaffMember[]> {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) return [];

    return data.map((s: any) => ({
      id: s.id,
      name: s.name,
      initials: s.name.charAt(0).toUpperCase(),
      username: s.username,
      role: s.role,
      roleTitle: s.role_title || undefined,
      pin: s.pin,
      status: s.status || 'Activo',
      station: s.station || undefined,
      assignment: s.station || 'Salón Principal',
      permissions: s.custom_permissions ? 'Permisos Personalizados' : 'Acceso Estándar TPV & Comandas',
      avatarUrl: s.avatar_url || undefined,
      email: s.email || `${s.username}@aureabistro.pe`,
      customPermissions: s.custom_permissions || undefined,
      password: s.password || s.pin || '1234'
    }));
  } catch (err) {
    console.error('Error fetching staff from DB:', err);
    return [];
  }
}

export async function createStaffMemberInDb(staff: StaffMember): Promise<boolean> {
  try {
    const basePayload = {
      name: staff.name,
      username: staff.username || staff.name.toLowerCase().replace(/\s+/g, '.'),
      role: staff.role as any,
      role_title: staff.roleTitle || 'Personal GastroPulse',
      pin: staff.pin || '1234',
      status: staff.status || 'Activo',
      station: staff.assignment || staff.station || 'General',
      avatar_url: staff.avatarUrl || null
    };

    let { error } = await supabase
      .from('staff')
      .insert({
        ...basePayload,
        email: staff.email || null,
        custom_permissions: staff.customPermissions || null,
        password: staff.password || staff.pin || null
      } as any);

    if (error && (error as any).code === 'PGRST204') {
      const retryNoPass = await supabase
        .from('staff')
        .insert({
          ...basePayload,
          email: staff.email || null,
          custom_permissions: staff.customPermissions || null
        } as any);
      error = retryNoPass.error;
    }

    if (error && (error as any).code === 'PGRST204') {
      const fallbackRes = await supabase
        .from('staff')
        .insert(basePayload as any);
      error = fallbackRes.error;
    }

    if (error) {
      console.error('Error inserting staff to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in createStaffMemberInDb:', err);
    return false;
  }
}

export async function updateStaffStatusInDb(staffId: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('staff')
      .update({ status })
      .eq('id', staffId);

    return !error;
  } catch (err) {
    console.error('Error updating staff status in DB:', err);
    return false;
  }
}


export async function updateStaffMemberInDb(staff: StaffMember): Promise<boolean> {
  try {
    const basePayload = {
      name: staff.name,
      username: staff.username,
      role: staff.role as any,
      role_title: staff.roleTitle,
      pin: staff.pin,
      status: staff.status,
      station: staff.assignment || staff.station
    };

    let { error } = await supabase
      .from('staff')
      .update({
        ...basePayload,
        email: staff.email,
        custom_permissions: staff.customPermissions,
        password: staff.password
      } as any)
      .eq('id', staff.id);

    if (error && (error as any).code === 'PGRST204') {
      const retryRes = await supabase
        .from('staff')
        .update({
          ...basePayload,
          email: staff.email,
          custom_permissions: staff.customPermissions
        } as any)
        .eq('id', staff.id);
      error = retryRes.error;

      if (error && (error as any).code === 'PGRST204') {
        const fallbackRes = await supabase
          .from('staff')
          .update(basePayload as any)
          .eq('id', staff.id);
        error = fallbackRes.error;
      }
    }

    return !error;
  } catch (err) {
    console.error('Error updating staff member in DB:', err);
    return false;
  }
}

export async function deleteStaffMemberFromDb(staffId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId);

    return !error;
  } catch (err) {
    console.error('Error deleting staff member from DB:', err);
    return false;
  }
}

const STORAGE_KEY_STAFF = 'gastropulse_staff_list_v1';

export async function getPersistedStaffList(): Promise<StaffMember[]> {
  try {
    let localSaved: StaffMember[] = [];
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_STAFF);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localSaved = parsed;
          }
        } catch {}
      }
    }

    const dbStaff = await fetchStaffFromDb();
    if (dbStaff && dbStaff.length > 0) {
      const mergedStaff: StaffMember[] = dbStaff.map((dbMember): StaffMember => {
        const localMatch = localSaved.find(
          (loc) => loc.id === dbMember.id || loc.username === dbMember.username
        );
        const res: StaffMember = {
          ...dbMember
        };
        if (localMatch?.email || dbMember.email) {
          res.email = localMatch?.email || dbMember.email;
        }
        if (localMatch?.customPermissions || dbMember.customPermissions) {
          res.customPermissions = localMatch?.customPermissions || dbMember.customPermissions;
        }
        if (localMatch?.password || dbMember.password) {
          res.password = localMatch?.password || dbMember.password;
        } else {
          res.password = res.pin;
        }
        return res;
      });

      localSaved.forEach((loc) => {
        if (!mergedStaff.some((m) => m.id === loc.id || m.username === loc.username)) {
          mergedStaff.push(loc);
        }
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(mergedStaff));
      }
      return mergedStaff;
    }

    if (localSaved.length > 0) {
      return localSaved;
    }
  } catch (err) {
    console.warn('Error loading staff list:', err);
  }

  if (typeof window !== 'undefined') {
    const { INITIAL_STAFF } = await import('@/data/mockData');
    localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(INITIAL_STAFF));
    return INITIAL_STAFF;
  }
  const { INITIAL_STAFF } = await import('@/data/mockData');
  return INITIAL_STAFF;
}

export function saveStaffListToLocalStorage(staffList: StaffMember[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(staffList));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }
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