import { supabase } from '@/lib/supabase';
import { TableStatus } from '@/types';
import { INITIAL_TABLES } from '@/data/mockData';

export async function fetchTablesFromDb(): Promise<TableStatus[]> {
  try {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Using mock tables as fallback:', error?.message);
      return INITIAL_TABLES;
    }

    return data.map((t) => ({
      id: t.id,
      number: t.number,
      capacity: t.capacity,
      pax: t.pax || 0,
      zone: (t.zone as TableStatus['zone']) || 'salon',
      status: (t.status as TableStatus['status']) || 'disponible',
      waiter: t.waiter || undefined,
      amount: Number(t.amount || 0),
      timeActive: t.time_active || undefined
    }));
  } catch (err) {
    console.error('Error fetching tables:', err);
    return INITIAL_TABLES;
  }
}

/**
 * Actualiza UNA mesa (la que coincide exactamente con el número). Antes usaba
 * ilike '%1%', así que liberar la Mesa 1 también liberaba las mesas 10, 11 y 12.
 */
export async function updateTableStateInDb(
  tableNumber: string,
  updates: Partial<{ status: string; amount: number; pax: number; waiter: string | null }>
): Promise<boolean> {
  try {
    const target = Number(tableNumber.replace(/D/g, ''));
    if (!target) return false;
    const { data: all, error: readError } = await supabase.from('restaurant_tables').select('id, number');
    if (readError) throw readError;
    const ids = (all ?? []).filter((t) => Number(t.number.replace(/D/g, '')) === target).map((t) => t.id);
    if (ids.length === 0) return false;

    const { error } = await supabase
      .from('restaurant_tables')
      .update({
        ...(updates.status && { status: updates.status }),
        ...(updates.amount !== undefined && { amount: updates.amount }),
        ...(updates.pax !== undefined && { pax: updates.pax }),
        ...(updates.waiter !== undefined && { waiter: updates.waiter }),
        updated_at: new Date().toISOString()
      })
      .in('id', ids);

    return !error;
  } catch (err) {
    console.error('Error updating table in DB:', err);
    return false;
  }
}

export async function settleTableInDb(tableNumber: string): Promise<boolean> {
  return updateTableStateInDb(tableNumber, {
    status: 'disponible',
    amount: 0,
    pax: 0,
    waiter: null
  });
}
