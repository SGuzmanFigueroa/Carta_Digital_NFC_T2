import { supabase } from '@/lib/supabase';
import { MenuItem } from '@/types';
import { INITIAL_MENU_ITEMS } from '@/data/mockData';

export async function fetchDishesFromDb(): Promise<MenuItem[]> {
  try {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('active', true)
      .order('price', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Using mock menu items as fallback:', error?.message);
      return INITIAL_MENU_ITEMS;
    }

    return data.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description || '',
      price: Number(d.price),
      category: (d.category_id as MenuItem['category']) || 'fondos',
      image: d.image || '',
      rating: Number(d.rating || 5.0),
      reviewsCount: d.reviews_count || 0,
      badge: d.badge || undefined,
      tag: d.tag || undefined,
      dietary: d.dietary || undefined,
      pairing: d.pairing || undefined,
      has3D: Boolean(d.has_3d),
      prepTime: d.prep_time || '5 min'
    }));
  } catch (err) {
    console.error('Error fetching dishes:', err);
    return INITIAL_MENU_ITEMS;
  }
}

export async function updateDishPrice(dishId: string, newPrice: number): Promise<boolean> {
  const { error } = await supabase
    .from('dishes')
    .update({ price: newPrice })
    .eq('id', dishId);
  return !error;
}
