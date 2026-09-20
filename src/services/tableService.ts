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

export async function updateTableStateInDb(
  tableNumber: string,
  updates: Partial<{ status: string; amount: number; pax: number; waiter: string | null }>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('restaurant_tables')
      .update({
        ...(updates.status && { status: updates.status }),
        ...(updates.amount !== undefined && { amount: updates.amount }),
        ...(updates.pax !== undefined && { pax: updates.pax }),
        ...(updates.waiter !== undefined && { waiter: updates.waiter }),
        updated_at: new Date().toISOString()
      })
      .eq('number', tableNumber);

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
