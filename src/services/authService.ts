import { supabase } from '@/lib/supabase';
import { AuthUser, StaffMember } from '@/types';

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

    if (error || !data) return [];

    return data.map((s) => ({
      id: s.id,
      name: s.name,
      username: s.username,
      role: s.role,
      roleTitle: s.role_title || undefined,
      pin: s.pin,
      status: s.status || 'Activo',
      station: s.station || undefined,
      avatarUrl: s.avatar_url || undefined
    }));
  } catch (err) {
    console.error('Error fetching staff from DB:', err);
    return [];
  }
}
