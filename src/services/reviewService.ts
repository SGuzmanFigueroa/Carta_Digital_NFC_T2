import { supabase } from '@/lib/supabase';

export interface CustomerReview {
  id: string;
  tableNumber: string;
  orderId?: string;
  rating: number; // 1 a 5
  ratingLabel: string;
  tipAmount: number;
  comments: string;
  paymentMethod: string;
  operationCode?: string;
  voucherUploaded?: boolean;
  createdAt: string;
}

const STORAGE_KEY_REVIEWS = 'gastropulse_customer_reviews_v1';

export function getLocalReviews(): CustomerReview[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVIEWS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function submitCustomerReview(review: Omit<CustomerReview, 'id' | 'createdAt'>): Promise<CustomerReview> {
  const newReview: CustomerReview = {
    ...review,
    id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString()
  };

  // 1. Guardar localmente para persistencia garantizada
  try {
    const existing = getLocalReviews();
    localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify([newReview, ...existing]));
  } catch (err) {
    console.warn('Error saving review to localStorage:', err);
  }

  // 2. Intentar sincronizar con Supabase en segundo plano
  (async () => {
    try {
      const { error } = await (supabase as any)
        .from('customer_reviews')
        .insert({
          id: newReview.id,
          table_number: newReview.tableNumber,
          order_id: newReview.orderId,
          rating: newReview.rating,
          tip_amount: newReview.tipAmount,
          comments: newReview.comments,
          payment_method: newReview.paymentMethod,
          operation_code: newReview.operationCode,
          created_at: newReview.createdAt
        });

      if (error) {
        console.warn('Aviso: customer_reviews table no disponible en Supabase (respaldado en local):', error.message);
      }
    } catch (e) {
      console.warn('Error silencioso al registrar reseña en Supabase:', e);
    }
  })();

  return newReview;
}
