import type { Metadata } from 'next';
import { INITIAL_MENU_ITEMS } from '@/data/mockData';
import { createAnonServerClient } from '@/lib/supabaseServer';
import { mapDishRow } from '@/services/menuService';
import type { MenuItem } from '@/types';
import { MenuClient } from './MenuClient';

/**
 * Carta del comensal renderizada en el servidor (Tarea 38). Antes el HTML
 * inicial traía los platos de ejemplo del código y los reales aparecían recién
 * tras cargar y ejecutar el JavaScript. Ahora los platos reales vienen en el
 * HTML (mejor primera carga en celulares y SEO) y se regeneran cada 60 s.
 */
export const revalidate = 60;

async function loadMenu(): Promise<{ items: MenuItem[]; branchName: string | null }> {
  try {
    const db = createAnonServerClient();
    const [{ data: dishes, error }, { data: config }] = await Promise.all([
      db.from('dishes').select('*').eq('active', true).order('price', { ascending: true }),
      db.from('system_config').select('branch_name').eq('id', 'primary').maybeSingle()
    ]);
    if (error || !dishes?.length) throw error ?? new Error('Carta vacía');
    return { items: dishes.map(mapDishRow), branchName: config?.branch_name ?? null };
  } catch (err) {
    // Sin conexión con Supabase al generar la página: la carta del cliente
    // reintenta y usa su caché offline, como antes.
    console.warn('[menu] Render del servidor sin datos de Supabase:', err instanceof Error ? err.message : err);
    return { items: INITIAL_MENU_ITEMS, branchName: null };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { branchName } = await loadMenu();
  const name = branchName || 'Carta Digital';
  return {
    title: `${name} · Carta digital`,
    description: `Mira la carta de ${name}, pide desde tu mesa y paga con Yape, Plin o tarjeta.`
  };
}

export default async function MenuPage() {
  const { items } = await loadMenu();
  return <MenuClient initialMenuItems={items} />;
}
