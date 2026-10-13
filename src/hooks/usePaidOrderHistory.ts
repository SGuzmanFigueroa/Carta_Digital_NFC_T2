'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchOrdersFromDb } from '@/services/orderService';
import type { OrderTicket } from '@/types';

let historyChannelSequence = 0;

/** Only /pedidos mounts this history; the existing core/KDS channels stay intact. */
export function usePaidOrderHistory() {
  const [paidOrders, setPaidOrders] = useState<OrderTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let disposed = false;
    let revision = 0;
    const refresh = async () => {
      const requestRevision = ++revision;
      try {
        const orders = await fetchOrdersFromDb({ paymentStatus: 'paid', throwOnError: true });
        if (disposed || requestRevision !== revision) return;
        setPaidOrders(orders); setError(false); setLoading(false);
      } catch {
        if (disposed || requestRevision !== revision) return;
        // Preserve the last confirmed history instead of making it look unpaid.
        setError(true); setLoading(false);
      }
    };
    const channel = supabase.channel(`orders-payment-history-${Date.now()}-${++historyChannelSequence}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { void refresh(); })
      .subscribe(status => {
        if (disposed) return;
        if (status === 'SUBSCRIBED') void refresh();
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setError(true);
      });
    void refresh();
    const resume = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', refresh);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', refresh);
      void supabase.removeChannel(channel);
    };
  }, []);
  return { paidOrders, loading, error };
}
