import { supabase } from '@/lib/supabase';

export interface CustomerReview {
  tableNumber: string;
  orderId?: string;
  /** Clave del pedido (dinerKey): prueba que el pedido es del comensal y verifica la reseña. */
  orderKey?: string;
  rating: number; // 1 a 5
  ratingLabel: string;
  tipAmount: number;
  comments: string;
  paymentMethod: string;
  operationCode?: string;
  voucherUploaded?: boolean;
}

/** Versiones anteriores guardaban las reseñas solo en el celular (la tabla no existía). */
const LEGACY_STORAGE_KEY_REVIEWS = 'gastropulse_customer_reviews_v1';

/**
 * Guarda la reseña en Supabase (RPC submit_review). Lanza un Error con un
 * mensaje para el comensal si no se pudo registrar.
 */
export async function submitCustomerReview(review: CustomerReview): Promise<string> {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY_REVIEWS);
  } catch {}

  const { data, error } = await supabase.rpc('submit_review', {
    p_table_number: review.tableNumber,
    p_rating: review.rating,
    p_tip_amount: review.tipAmount,
    p_comments: review.comments,
    p_payment_method: review.paymentMethod,
    p_operation_code: review.operationCode,
    p_voucher_uploaded: Boolean(review.voucherUploaded),
    p_order_id: review.orderId,
    p_order_key: review.orderKey
  });
  if (error) {
    throw new Error(error.code === '22023' ? error.message : 'No se pudo enviar tu reseña. Inténtalo de nuevo.');
  }
  return data as string;
}
