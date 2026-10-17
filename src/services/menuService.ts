import { supabase } from '@/lib/supabase';
import { MenuItem } from '@/types';
import { INITIAL_MENU_ITEMS } from '@/data/mockData';
import type { Database } from '@/types/database.types';

type DishRow = Database['public']['Tables']['dishes']['Row'];
type DishUpdate = Database['public']['Tables']['dishes']['Update'];

/** Fila de public.dishes → plato de la carta (compartido con el render del servidor). */
export function mapDishRow(d: DishRow): MenuItem {
  return {
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
  };
}

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

    return data.map(mapDishRow);
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

export async function createDishInDb(dish: Partial<MenuItem>): Promise<MenuItem | null> {
  try {
    const dishId = dish.id || dish.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `plato-${Date.now()}`;
    const newDishRow = {
      id: dishId,
      name: dish.name || 'Plato de Autor',
      description: dish.description || '',
      price: dish.price || 45.0,
      category_id: dish.category || 'fondos',
      image: dish.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      rating: dish.rating || 5.0,
      reviews_count: dish.reviewsCount || 1,
      badge: dish.badge || 'NUEVO EN CARTA',
      tag: dish.tag || 'ESPECIALIDAD',
      dietary: dish.dietary || 'Elaboración Artesanal',
      pairing: dish.pairing || 'Sugerencia de la Casa',
      has_3d: dish.has3D !== undefined ? dish.has3D : true,
      prep_time: dish.prepTime || '12 min',
      active: true,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('dishes')
      .upsert(newDishRow)
      .select()
      .single();

    if (error) {
      console.error('Error creating dish in Supabase:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      price: Number(data.price),
      category: (data.category_id as MenuItem['category']) || 'fondos',
      image: data.image || '',
      rating: Number(data.rating || 5.0),
      reviewsCount: data.reviews_count || 0,
      badge: data.badge || undefined,
      tag: data.tag || undefined,
      dietary: data.dietary || undefined,
      pairing: data.pairing || undefined,
      has3D: Boolean(data.has_3d),
      prepTime: data.prep_time || '10 min'
    };
  } catch (err) {
    console.error('Error in createDishInDb:', err);
    return null;
  }
}

export async function updateDishInDb(dishId: string, updates: Partial<MenuItem>): Promise<boolean> {
  try {
    const payload: DishUpdate = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.category !== undefined) payload.category_id = updates.category;
    if (updates.image !== undefined) payload.image = updates.image;
    if (updates.badge !== undefined) payload.badge = updates.badge;
    if (updates.tag !== undefined) payload.tag = updates.tag;
    if (updates.dietary !== undefined) payload.dietary = updates.dietary;
    if (updates.pairing !== undefined) payload.pairing = updates.pairing;
    if (updates.has3D !== undefined) payload.has_3d = updates.has3D;
    if (updates.prepTime !== undefined) payload.prep_time = updates.prepTime;

    const { error } = await supabase
      .from('dishes')
      .update(payload)
      .eq('id', dishId);

    return !error;
  } catch (err) {
    console.error('Error updating dish in Supabase:', err);
    return false;
  }
}

export async function deleteDishFromDb(dishId: string): Promise<boolean> {
  try {
    // Soft delete or delete from dishes
    const { error } = await supabase
      .from('dishes')
      .update({ active: false })
      .eq('id', dishId);

    return !error;
  } catch (err) {
    console.error('Error deleting dish from Supabase:', err);
    return false;
  }
}
