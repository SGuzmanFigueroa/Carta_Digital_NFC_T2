'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/services/supabaseClient';

const RESTAURANT_ID = '11111111-1111-4111-8111-111111111111';

type OrderStatus = 'pending' | 'preparing' | 'delivered' | 'cancelled';

type KdsOrder = {
  id: string;
  table_number: string;
  status: OrderStatus;
  estimated_time_minutes: number | null;
  created_at: string;
  items: OrderItem[];
};

type OrderItem = {
  id: number;
  order_id: string;
  name: string;
  quantity: number;
};

function isKdsUser(session: Session | null): boolean {
  return session?.user.app_metadata?.role === 'kds';
}

export default function KdsPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let supabase;

    try {
      supabase = getSupabaseBrowserClient();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo iniciar Supabase.');
      setAuthorized(false);
      return;
    }

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setAuthorized(isKdsUser(data.session));
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!active) return;
        setAuthorized(isKdsUser(session));
        if (!isKdsUser(session)) setOrders([]);
      },
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authorized) return;

    const supabase = getSupabaseBrowserClient();
    let active = true;

    const loadOrders = async () => {
      const { data: rows, error: ordersError } = await supabase
        .from('cd4_orders')
        .select('id,table_number,status,estimated_time_minutes,created_at')
        .eq('restaurant_id', RESTAURANT_ID)
        .in('status', ['pending', 'preparing', 'delivered'])
        .order('created_at', { ascending: true });

      if (!active) return;
      if (ordersError) {
        setError(ordersError.message);
        return;
      }

      const orderIds = (rows ?? []).map((order) => order.id);
      const { data: items, error: itemsError } = orderIds.length
        ? await supabase
          .from('cd4_order_items')
          .select('id,order_id,name,quantity')
          .in('order_id', orderIds)
        : { data: [], error: null };

      if (!active) return;
      if (itemsError) {
        setError(itemsError.message);
        return;
      }

      setOrders((rows ?? []).map((order) => ({
        ...order,
        status: order.status as OrderStatus,
        items: (items ?? []).filter((item) => item.order_id === order.id),
      })));
      setError('');
    };

    void loadOrders();

    const channel = supabase
      .channel(`kds-orders-${RESTAURANT_ID}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cd4_orders',
        filter: `restaurant_id=eq.${RESTAURANT_ID}`,
      }, () => { void loadOrders(); })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cd4_order_items',
      }, () => { void loadOrders(); })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Se perdió la conexión en tiempo real con Supabase.');
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [authorized]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setError('');

    try {
      const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      setPassword('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo iniciar sesión.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function setOrderStatus(order: KdsOrder, status: 'preparing' | 'delivered') {
    setBusyOrderId(order.id);
    setError('');

    try {
      const { error: updateError } = await getSupabaseBrowserClient()
        .from('cd4_orders')
        .update({ status })
        .eq('id', order.id)
        .eq('restaurant_id', RESTAURANT_ID);
      if (updateError) throw updateError;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo actualizar el estado.');
    } finally {
      setBusyOrderId(null);
    }
  }

  if (authorized === null) {
    return <main className="min-h-screen bg-[#101311] p-6 text-stone-100">Conectando con cocina...</main>;
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#101311] px-4 text-stone-100">
        <form onSubmit={signIn} className="w-full max-w-sm space-y-5 border-l-2 border-emerald-500 px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Aurea Bistro · Cocina</p>
            <h1 className="mt-2 text-3xl font-bold">KDS</h1>
          </div>
          <label className="block space-y-1 text-sm text-stone-300">
            Correo
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block space-y-1 text-sm text-stone-300">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
            />
          </label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <button disabled={authBusy} className="w-full rounded bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-60">
            {authBusy ? 'Ingresando...' : 'Ingresar a cocina'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101311] px-4 py-6 text-stone-100 sm:px-8">
      <header className="mb-6 flex items-end justify-between border-b border-stone-800 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Aurea Bistro · Cocina</p>
          <h1 className="mt-1 text-3xl font-bold">Comandas</h1>
        </div>
        <button
          onClick={() => void getSupabaseBrowserClient().auth.signOut()}
          className="rounded border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:bg-stone-900"
        >
          Cerrar sesión
        </button>
      </header>

      {error && <p role="alert" className="mb-4 rounded border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}

      {orders.length === 0 ? (
        <p className="py-10 text-center text-stone-400">No hay comandas activas.</p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <article key={order.id} className="border border-stone-800 bg-[#191d1a] p-4">
              <header className="flex items-start justify-between gap-3 border-b border-stone-800 pb-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-stone-400">Mesa {order.table_number}</p>
                  <h2 className="text-xl font-bold">#{order.id.slice(-6)}</h2>
                </div>
                <span className={`rounded px-2 py-1 text-xs font-bold ${order.status === 'delivered' ? 'bg-emerald-950 text-emerald-300' : order.status === 'preparing' ? 'bg-amber-950 text-amber-300' : 'bg-stone-800 text-stone-300'}`}>
                  {order.status === 'delivered' ? 'Lista' : order.status === 'preparing' ? 'Preparando' : 'Pendiente'}
                </span>
              </header>
              <ul className="min-h-20 space-y-2 py-4">
                {order.items.map((item) => (
                  <li key={item.id} className="flex gap-3 text-sm">
                    <span className="font-bold text-emerald-400">{item.quantity}×</span>
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
              <p className="mb-3 text-xs text-stone-500">{new Date(order.created_at).toLocaleTimeString()}</p>
              {order.status !== 'delivered' && (
                <button
                  disabled={busyOrderId === order.id}
                  onClick={() => void setOrderStatus(order, order.status === 'pending' ? 'preparing' : 'delivered')}
                  className="w-full rounded bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busyOrderId === order.id ? 'Actualizando...' : order.status === 'pending' ? 'Empezar preparación' : 'Marcar lista'}
                </button>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}