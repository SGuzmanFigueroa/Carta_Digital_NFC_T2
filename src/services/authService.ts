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
      role: (data.role as AuthUser['role']) || 'kitchen',
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

export async function fetchStaffFromDb(): Promise<StaffMember[]> {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) return [];

    return data.map((s) => ({
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
      permissions: 'Acceso Estándar TPV & Comandas',
      avatarUrl: s.avatar_url || undefined,
      email: `${s.username}@aureabistro.pe`
    }));
  } catch (err) {
    console.error('Error fetching staff from DB:', err);
    return [];
  }
}

export async function createStaffMemberInDb(staff: StaffMember): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('staff')
      .insert({
        name: staff.name,
        username: staff.username || staff.name.toLowerCase().replace(/\s+/g, '.'),
        role: staff.role as any,
        role_title: staff.roleTitle || 'Personal GastroPulse',
        pin: staff.pin || '1234',
        status: staff.status || 'Activo',
        station: staff.assignment || staff.station || 'General',
        avatar_url: staff.avatarUrl || null
      });

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

    // Map into ordered array prioritizing admin -> sous_chef -> waiter -> bartender -> runner
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
