'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Ticket, OrderTicket, OrderRound, OrderRoundItem, TableStatus, Runner, MenuItem, TicketItem, WaiterCall, PaymentClaim } from '../types';
import { INITIAL_MENU_ITEMS, INITIAL_RUNNERS } from '../data/mockData';
import { kitchenAudio } from '../utils/audio';
import { supabase } from '@/lib/supabase';
import { fetchTablesFromDb, settleTableInDb, updateTableStateInDb } from '@/services/tableService';
import {
  fetchOrdersFromDb,
  fetchShiftRevenueFromDb,
  placeOrderInDb,
  fetchDinerOrderStatuses,
  toPlaceOrderItems,
  OrderRejectedError,
  type PlacedOrder,
  type PlaceOrderInput,
  updateOrderStatusInDb,
  requestTableAccountInDb,
  callWaiterForTableInDb,
  settleOrdersForTableInDb,
  updateOrderItemCheckInDb
} from '@/services/orderService';
import { queuePendingOrder } from '@/services/offlineSyncService';
import { getRecentDinerPosition, getTableToken } from '@/utils/tableAccess';
// CD-28 · Llamados de mesa persistentes (KDS + Salón vía postgres_changes).
import {
  fetchWaiterCallsFromDb,
  createWaiterCall,
  attendWaiterCallInDb,
  normalizeWaiterCallReason,
  parseWaiterCallRow
} from '@/services/waiterCallService';
import {
  sanitizeText,
  sanitizeNotes,
  validateTableString,
  AuditLogger
} from '../utils/security';
import { useToast } from './ToastContext';
import { useStaffSession } from './StaffSessionContext';
import {
  ALLOWED_BROADCAST_ACTIONS,
  describeRealtimeStatus,
  getTableRoundKey,
  instrumentRealtimeChannel,
  nextRealtimeChannelSeq,
  realtimeStamp,
  STORAGE_KEY_DINER,
  STORAGE_KEY_ORDERS,
  STORAGE_KEY_REVENUE,
  STORAGE_KEY_TABLES,
  STORAGE_KEY_TICKETS,
  toKdsTicket,
  routeKitchenStation
} from './restaurantHelpers';

interface RestaurantContextType {
  // State
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  orders: OrderTicket[];
  setOrders: React.Dispatch<React.SetStateAction<OrderTicket[]>>;
  tableOrderRounds: OrderRound[];
  tables: TableStatus[];
  waiterCalls: WaiterCall[];
  runners: Runner[];
  setRunners: React.Dispatch<React.SetStateAction<Runner[]>>;
  totalShiftRevenue: number;
  kitchenPaused: boolean;
  dinerActiveTicket: OrderTicket | null;
  audioEnabled: boolean;

  // Actions
  /** Rechaza con OrderRejectedError si el servidor no acepta el pedido. */
  sendOrderFromMenu: (tableStr: string, cartItems: { item: MenuItem; quantity: number; notes?: string }[], pax?: number) => Promise<OrderTicket>;
  reconcileQueuedOrder: (localId: string, placed: PlacedOrder) => void;
  recordTableOrderRound: (
    tableStr: string,
    cartItems: { item: MenuItem; quantity: number }[],
    createdAt: Date,
    orderId: string
  ) => void;
  updateTicketItem: (ticketId: string, itemId: string, checked?: boolean) => void;
  startTicketPrep: (ticketId: string) => void;
  dispatchTicket: (ticketId: string) => void;
  recallLastDispatched: () => void;
  prioritizeTable: (tableNumber: string) => void;
  collectTableBill: (tableNumber: string, amount?: number) => void;
  openTable: (tableNumber: string, pax?: number, waiter?: string) => void;
  notifyRunners: () => void;
  callAllRunners: () => void;
  updateRunnerStatus: (runnerId: string, status: Runner['status'], table?: string) => void;
  toggleKitchenPause: () => void;
  toggleAudio: () => void;
  showToast: (message: string, icon?: string) => void;
  resetAllDemoData: () => void;
  simulateNewOrder: () => void;
  createNewKdsTicket: (ticket: Ticket) => Promise<boolean>;
  /** El servidor valida el PIN (bcrypt) y lo bloquea tras 5 fallos. */
  updateOrderStatus: (orderId: string, newStatus: OrderTicket['status']) => Promise<void>;
  addOrderNote: (orderId: string, note: string) => void;
  /** CD-28 · `table` = mesa real del comensal (selector / QR); si se omite se usa la de su comanda. */
  requestTableAccount: (paymentMethod?: string, table?: string, claim?: PaymentClaim) => Promise<boolean>;
  /** CD-28 · `table` = mesa real del comensal (selector / QR); si se omite se usa la de su comanda. */
  callWaiter: (reason?: string, table?: string) => Promise<boolean>;
  attendWaiterCall: (callId: string) => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);


export const RestaurantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Arrancan vacíos: los llena Supabase (antes eran datos de ejemplo que se
  // quedaban en pantalla si la base devolvía cero pedidos).
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<OrderTicket[]>([]);
  const [tableOrderRounds, setTableOrderRounds] = useState<OrderRound[]>([]);
  const [tables, setTables] = useState<TableStatus[]>([]);
  // CD-28 · Llamados de mesa abiertos (los consume el KDS y el panel de Salón).
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [runners, setRunners] = useState<Runner[]>(INITIAL_RUNNERS);
  // Caja del turno: se calcula en la base (fetchShiftRevenueFromDb); antes arrancaba en S/ 4,215 inventados.
  const [totalShiftRevenue, setTotalShiftRevenue] = useState<number>(0);
  const [kitchenPaused, setKitchenPaused] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [lastDispatchedTicket, setLastDispatchedTicket] = useState<Ticket | null>(null);
  const { showToast } = useToast();
  const { currentUser } = useStaffSession();
  const [dinerActiveTicket, setDinerActiveTicket] = useState<OrderTicket | null>(null);

  const syncDinerTicketStatus = useCallback((freshOrders: OrderTicket[]) => {
    if (!dinerActiveTicket) return;

    const matchingOrder = freshOrders.find((order) => order.id === dinerActiveTicket.id);
    if (!matchingOrder || matchingOrder.status === dinerActiveTicket.status) return;

    const updatedTicket = { ...dinerActiveTicket, status: matchingOrder.status };
    setDinerActiveTicket(updatedTicket);
    try {
      localStorage.setItem(STORAGE_KEY_DINER, JSON.stringify(updatedTicket));
    } catch (err) {
      console.warn('Storage sync error:', err);
    }
  }, [dinerActiveTicket]);

  /**
   * Arma las comandas del KDS desde los pedidos de la base. Con sesión de
   * personal (`authoritative`) la base manda: se descartan comandas locales sin
   * pedido real (cachés viejos o datos de ejemplo).
   */
  const syncKdsTickets = useCallback((freshOrders: OrderTicket[], authoritative = false) => {
    const incomingTickets = freshOrders
      .map(toKdsTicket)
      .filter((ticket): ticket is Ticket => ticket !== null);

    setTickets((currentTickets) => {
      const incomingByOrderNumber = new Map(incomingTickets.map((ticket) => [ticket.orderNumber, ticket]));
      const keptTickets = authoritative
        ? currentTickets.filter((ticket) => incomingByOrderNumber.has(ticket.orderNumber))
        : currentTickets;
      const mergedTickets = keptTickets.map((currentTicket) => {
        const incomingTicket = incomingByOrderNumber.get(currentTicket.orderNumber);
        if (!incomingTicket) return currentTicket;

        incomingByOrderNumber.delete(currentTicket.orderNumber);
        return {
          ...incomingTicket,
          id: currentTicket.id,
          elapsedSeconds: currentTicket.elapsedSeconds
        };
      });

      return [...incomingByOrderNumber.values(), ...mergedTickets];
    });
  }, []);

  // ===========================================================================
  // CD-28 · FIX N1 (realtime inestable) · Callbacks de realtime en un REF
  // ===========================================================================
  // Los listeners (Supabase y BroadcastChannel) necesitan `showToast`,
  // `syncDinerTicketStatus` y `syncKdsTickets`. OJO: `syncDinerTicketStatus`
  // depende de [dinerActiveTicket], por lo que CAMBIA de identidad cada vez que
  // cambia la comanda del comensal. Tenerlo en las deps del useEffect obligaba a
  // destruir y recrear el canal Supabase en bucle (y con el mismo topic => throw).
  // Con el ref, los efectos dependen de [] y además nunca sufren stale closure.
  const realtimeCallbacksRef = useRef({ showToast, syncDinerTicketStatus, syncKdsTickets });
  useEffect(() => {
    realtimeCallbacksRef.current = { showToast, syncDinerTicketStatus, syncKdsTickets };
  }, [showToast, syncDinerTicketStatus, syncKdsTickets]);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      kitchenAudio.enabled = next;
      if (next) {
        kitchenAudio.playCheckItemSound();
        showToast('Alertas sonoras activadas', 'volume_up');
      } else {
        showToast('Alertas silenciadas', 'volume_off');
      }
      return next;
    });
  }, [showToast]);

  // Broadcast channel for instantaneous cross-tab synchronization
  const broadcastSync = useCallback((action: string, payload: unknown) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('gastropulse_sync_bus');
        channel.postMessage({ action, payload, timestamp: Date.now() });
        channel.close();
      }
    } catch {
      // BroadcastChannel optional fallback
    }
  }, []);

  // Supabase Database Sync & Realtime Subscription
  // ===========================================================================
  // CD-28 · FIX N2 · REALTIME BLINDADO — CAUSA RAÍZ REAL (evidencia empírica)
  // ===========================================================================
  // Reproducido contra el proyecto real, 100% determinista:
  //
  //  1. El evento `postgres_changes` de `waiter_calls` SÍ se emite: en un canal con
  //     UN solo binding llega ~300 ms después del INSERT/UPDATE.
  //  2. El servidor de Realtime RECHAZA el `postgres_changes` COMPLETO de un canal
  //     cuando UNA sola de sus suscripciones apunta a una tabla que NO está en la
  //     publicación `supabase_realtime`. Lo comunica con un evento `system`:
  //       "Unable to subscribe to changes with given parameters. Please check
  //        Realtime is enabled for the given connect parameters:
  //        [event: *, schema: public, table: staff, filters: [], select: nil]"
  //     El join se responde 'ok' (con ids), el canal queda en estado SUBSCRIBED y el
  //     callback de `.subscribe()` NO recibe error alguno: fallo 100% SILENCIOSO.
  //  3. En este proyecto NO tienen Realtime: `staff` y `system_config`.
  //     (Sí lo tienen: `orders`, `order_items`, `restaurant_tables`, `waiter_calls`.)
  //
  // Consecuencia: el canal anterior (un único canal con staff + system_config +
  // orders + waiter_calls) estaba CIEGO ENTERO — cero llamados, cero comandas y cero
  // cambios de mesa en vivo. La UI solo se enteraba con F5 (fetch de montaje): ese es
  // el bug de CD-28, y limpiar canales/eliminar refetch NO lo podía arreglar.
  //
  // FIX N2 → AISLAMIENTO DE FALLOS: un canal por dominio (A/B/C). Un binding inválido
  // ya no puede silenciar la ruta crítica. Se conserva además: `deps: []`, topic
  // irrepetible por montaje, guarda `disposed` y `removeChannel` en el cleanup.
  useEffect(() => {
    let disposed = false;
    const mountId = nextRealtimeChannelSeq();
    const stamp = Date.now();
    /** Topic irrepetible: imposibilita reutilizar una instancia zombie/moribunda. */
    const topicFor = (scope: string) => `gastropulse_realtime_${scope}_${stamp}_${mountId}`;

    console.info(
      `[realtime] ${realtimeStamp()} montaje ${mountId} → canales AISLADOS: ` +
      `llamados(2 bindings) | core(3 bindings) | avisos(2 bindings)`
    );

    // Re-sincronización defensiva del canal core. Envuelta en try/catch: un fallo de
    // red se registra y NUNCA se propaga al bucle de mensajes del socket.
    // Con sesión de personal la base es la fuente de verdad: si devuelve cero
    // pedidos, se muestran cero. El comensal no tiene sesión y RLS le oculta los
    // pedidos de otros, así que conserva su caché local (sus propios pedidos).
    const hasStaffSession = async () => Boolean((await supabase.auth.getSession()).data.session);

    const resyncOrders = async (scope: string) => {
      try {
        const freshOrders = await fetchOrdersFromDb({ throwOnError: true });
        if (disposed) return;
        const authoritative = await hasStaffSession();
        if (!authoritative && freshOrders.length === 0) return;
        setOrders(freshOrders);
        realtimeCallbacksRef.current.syncDinerTicketStatus(freshOrders);
        realtimeCallbacksRef.current.syncKdsTickets(freshOrders, authoritative);
        if (authoritative) {
          const revenue = await fetchShiftRevenueFromDb();
          if (!disposed && revenue !== null) setTotalShiftRevenue(revenue);
        }
      } catch (err) {
        console.warn(`[realtime:${scope}] ${realtimeStamp()} error re-sincronizando comandas`, err);
      }
    };

    const resyncTables = async (scope: string) => {
      try {
        const freshTables = await fetchTablesFromDb();
        if (disposed || !freshTables || freshTables.length === 0) return;
        setTables(freshTables);
      } catch (err) {
        console.warn(`[realtime:${scope}] ${realtimeStamp()} error re-sincronizando mesas`, err);
      }
    };

    // 1. Foto inicial desde Supabase (una vez por montaje; durabilidad ante F5).
    void resyncTables('inicial');
    void resyncOrders('inicial');

    // CD-28 · Llamados de mesa: se re-consultan al montar (durabilidad ante
    // recarga/reapertura del KDS, algo que un canal Broadcast no puede ofrecer).
    fetchWaiterCallsFromDb().then((dbCalls) => {
      if (disposed) return;
      console.info(
        `[realtime:llamados] ${realtimeStamp()} foto inicial → ${dbCalls.length} llamado(s) abierto(s)`
      );
      setWaiterCalls(dbCalls);
    }).catch((err) => {
      console.warn(`[realtime:llamados] ${realtimeStamp()} error en la foto inicial`, err);
    });

    // -----------------------------------------------------------------------
    // CANAL A · RUTA CRÍTICA CD-28 → SOLO waiter_calls (2 bindings)
    // -----------------------------------------------------------------------
    // Aislado a propósito: si alguien agrega aquí una tabla sin Realtime, el fallo
    // queda contenido y NO puede volver a silenciar los llamados de mesa.
    const callsTopic = topicFor('llamados');
    const callsChannel = supabase
      .channel(callsTopic)
      // INSERT = nuevo llamado: se hidrata 100% desde `payload.new` (CERO fetch, por
      // lo que ningún caché de `fetch` puede servir datos viejos) y el dedupe con
      // update funcional protege ante reintentos/eco del canal.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'waiter_calls' }, (payload) => {
        if (disposed) return;
        const insertedCall = parseWaiterCallRow(payload.new);
        if (!insertedCall || insertedCall.status !== 'open') return;
        console.info(
          `[realtime:llamados] ${realtimeStamp()} ← INSERT ${insertedCall.table_number} · ` +
          `"${insertedCall.reason}" (id ${insertedCall.id})`
        );
        setWaiterCalls((current) =>
          current.some((call) => call.id === insertedCall.id) ? current : [...current, insertedCall]
        );
      })
      // UPDATE = el personal marcó 'attended' → el llamado sale de la UI al instante.
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'waiter_calls' }, (payload) => {
        if (disposed) return;
        const updatedCall = parseWaiterCallRow(payload.new);
        if (!updatedCall || updatedCall.status !== 'attended') return;
        console.info(
          `[realtime:llamados] ${realtimeStamp()} ← UPDATE ${updatedCall.table_number} atendido (id ${updatedCall.id})`
        );
        setWaiterCalls((current) => current.filter((call) => call.id !== updatedCall.id));
      });
    instrumentRealtimeChannel(callsChannel, 'llamados', callsTopic);
    callsChannel.subscribe((status: string, error?: Error) => {
      if (disposed) return; // 'CLOSED' por desmontaje deliberado: no es un incidente
      describeRealtimeStatus('llamados', callsTopic, status, error);
    });

    // -----------------------------------------------------------------------
    // CANAL B · CORE → orders + order_items + restaurant_tables (3 bindings)
    // -----------------------------------------------------------------------
    const coreTopic = topicFor('core');
    const coreChannel = supabase
      .channel(coreTopic)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void resyncOrders('core');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items' }, () => {
        void resyncOrders('core');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
        void resyncTables('core');
      });
    instrumentRealtimeChannel(coreChannel, 'core', coreTopic);
    coreChannel.subscribe((status: string, error?: Error) => {
      if (disposed) return;
      describeRealtimeStatus('core', coreTopic, status, error);
    });

    // -----------------------------------------------------------------------
    // CANAL C · AVISOS → staff + system_config (2 bindings, NO crítico)
    // -----------------------------------------------------------------------
    // IMPORTANTE: estas dos tablas NO tienen Realtime habilitado en la publicación
    // `supabase_realtime` del proyecto. Al estar SOLAS en su propio canal, su rechazo
    // solo degrada este canal de avisos (los toasts de "Personal/Configuración
    // actualizada") y queda registrado en consola con la instrucción SQL exacta.
    // Al aislarlo, esa configuración incompleta ya no puede tumbar comandas ni llamados.
    const adminTopic = topicFor('avisos');
    const adminChannel = supabase
      .channel(adminTopic)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
        // Staff changes trigger cross-terminal notification
        if (disposed) return;
        realtimeCallbacksRef.current.showToast('Personal actualizado en el sistema', 'badge');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, () => {
        if (disposed) return;
        realtimeCallbacksRef.current.showToast('Configuración del sistema actualizada', 'tune');
      });
    instrumentRealtimeChannel(adminChannel, 'avisos', adminTopic);
    adminChannel.subscribe((status: string, error?: Error) => {
      if (disposed) return;
      describeRealtimeStatus('avisos', adminTopic, status, error);
    });

    return () => {
      // Teardown GARANTIZADO de los 3 canales: `disposed` evita que un callback tardío
      // vuelva a tocar el estado y cada canal se destruye también en el servidor.
      // `removeChannel` es async por diseño (async unsubscribe → teardown); como cada
      // topic es irrepetible, una instancia rezagada no puede robar eventos a la
      // siguiente ni bloquear el cleanup de React.
      disposed = true;
      console.info(`[realtime] ${realtimeStamp()} desmontando montaje ${mountId} (3 canales)`);
      void supabase.removeChannel(callsChannel);
      void supabase.removeChannel(coreChannel);
      void supabase.removeChannel(adminChannel);
    };
  }, []);

  // Load persisted state & current user on mount
  useEffect(() => {
    try {
      const savedTickets = localStorage.getItem(STORAGE_KEY_TICKETS);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- datos que solo existen en el navegador (storage/URL/red); leerlos en el render rompe la hidratación
      if (savedTickets) setTickets(JSON.parse(savedTickets));

      const savedOrders = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (savedOrders) setOrders(JSON.parse(savedOrders));

      const savedTables = localStorage.getItem(STORAGE_KEY_TABLES);
      if (savedTables) setTables(JSON.parse(savedTables));

      const savedRev = localStorage.getItem(STORAGE_KEY_REVENUE);
      if (savedRev) setTotalShiftRevenue(parseFloat(savedRev));

      const savedDiner = localStorage.getItem(STORAGE_KEY_DINER);
      if (savedDiner) setDinerActiveTicket(JSON.parse(savedDiner));

    } catch (err) {
      console.warn('Error loading GastroPulse state from storage:', err);
    }
  }, []);

  // Listen to BroadcastChannel events with strict schema and action validation
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('gastropulse_sync_bus');

    channel.onmessage = (event) => {
      const { action, payload } = event.data || {};
      
      // Strict whitelist defense against spoofed or corrupted broadcasts
      if (!action || !ALLOWED_BROADCAST_ACTIONS.includes(action)) {
        AuditLogger.log({
          eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          severity: 'CRITICAL',
          details: `Rechazado evento BroadcastChannel no autorizado: ${String(action)}`
        });
        return;
      }

      if (action === 'NEW_ORDER' && payload?.ticket && payload?.order) {
        setTickets((prev) => [payload.ticket, ...prev.filter((t) => t.id !== payload.ticket.id)]);
        setOrders((prev) => [payload.order, ...prev.filter((o) => o.id !== payload.order.id)]);
        if (Array.isArray(payload.tables)) setTables(payload.tables);
        kitchenAudio.playDispatchSound();
        realtimeCallbacksRef.current.showToast(`¡Nueva comanda recibida de ${payload.ticket.table}!`, 'soup_kitchen');
      } else if (action === 'UPDATE_TICKETS' && Array.isArray(payload?.tickets)) {
        setTickets(payload.tickets);
      } else if (action === 'UPDATE_TABLES' && Array.isArray(payload?.tables)) {
        setTables(payload.tables);
      } else if (action === 'UPDATE_RUNNERS' && Array.isArray(payload?.runners)) {
        setRunners(payload.runners);
      } else if (action === 'DINER_STATUS_UPDATE' && payload?.ticket) {
        setDinerActiveTicket(payload.ticket);
      } else if (action === 'PRIORITIZE_TABLE' && Array.isArray(payload?.tickets)) {
        setTickets(payload.tickets);
        kitchenAudio.playAllergyWarning();
        realtimeCallbacksRef.current.showToast(`¡Mesa ${payload.tableNumber} marcada con PRIORIDAD!`, 'priority_high');
      } else if (action === 'RUNNER_ALERT') {
        kitchenAudio.playRunnerAlertSound();
        realtimeCallbacksRef.current.showToast('¡Aviso a Runners en mesa de pase central!', 'campaign');
      } else if (action === 'UPDATE_ORDERS' && Array.isArray(payload?.orders)) {
        setOrders(payload.orders);
        realtimeCallbacksRef.current.syncDinerTicketStatus(payload.orders);
        if (Array.isArray(payload?.tickets)) setTickets(payload.tickets);
      }
    };

    return () => {
      channel.close();
    };
    // FIX N1: deps [] (el handler lee los callbacks vía `realtimeCallbacksRef`, que
    // siempre tiene la versión más reciente). Antes dependía de `syncDinerTicketStatus`,
    // que cambiaba con cada `dinerActiveTicket` → el bus se cerraba y se recreaba
    // constantemente, perdiendo mensajes en tránsito y alimentando el fallo del canal.
  }, []);

  // Central timer tick every 1000ms for elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setTickets((prev) => {
        const hasActive = prev.some((t) => t.status !== 'lista_despachada' && t.status !== 'archivada');
        if (!hasActive) return prev;
        return prev.map((t) => {
          if (t.status === 'lista_despachada' || t.status === 'archivada') return t;
          return { ...t, elapsedSeconds: (t.elapsedSeconds || 0) + 1 };
        });
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to persist state to local storage
  const persistState = useCallback(
    (
      newTickets?: Ticket[],
      newOrders?: OrderTicket[],
      newTables?: TableStatus[],
      newRev?: number,
      newDiner?: OrderTicket | null
    ) => {
      try {
        if (newTickets) localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(newTickets));
        if (newOrders) localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(newOrders));
        if (newTables) localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(newTables));
        if (typeof newRev === 'number') localStorage.setItem(STORAGE_KEY_REVENUE, newRev.toString());
        if (newDiner !== undefined) {
          if (newDiner) localStorage.setItem(STORAGE_KEY_DINER, JSON.stringify(newDiner));
          else localStorage.removeItem(STORAGE_KEY_DINER);
        }
      } catch (err) {
        console.warn('Storage sync error:', err);
      }
    },
    []
  );

  // Estado más reciente para callbacks asíncronos: tras un `await` el closure de
  // useCallback puede tener tickets/orders/tables viejos (el realtime los cambia).
  const latestStateRef = useRef({ tickets, orders, tables, dinerActiveTicket });
  useEffect(() => {
    latestStateRef.current = { tickets, orders, tables, dinerActiveTicket };
  }, [tickets, orders, tables, dinerActiveTicket]);

  // El comensal no tiene sesión: RLS le oculta la tabla orders, así que el
  // realtime de pedidos no le llega. Cada 15 s consulta el estado de SUS
  // pedidos con la clave que guardó su celular (get_diner_orders).
  useEffect(() => {
    if (currentUser) return;
    let cancelled = false;
    const poll = async () => {
      if (document.visibilityState !== 'visible') return;
      const { orders: current, dinerActiveTicket: diner } = latestStateRef.current;
      const refs = new Map<string, { id: string; key: string }>();
      for (const order of [...current, ...(diner ? [diner] : [])]) {
        if (order.dinerKey && /^cmd-\d+$/.test(order.id)) refs.set(order.id, { id: order.id, key: order.dinerKey });
      }
      if (refs.size === 0) return;
      try {
        const statuses = await fetchDinerOrderStatuses(Array.from(refs.values()));
        if (cancelled || statuses.size === 0) return;
        // Aviso al comensal cuando el personal revisa su pago Yape/Plin.
        const reviewed = Array.from(refs.keys())
          .map((id) => ({ before: current.find((o) => o.id === id)?.paymentVerification, after: statuses.get(id)?.paymentVerification }))
          .find(({ before, after }) => before === 'pending_verification' && (after === 'verified' || after === 'rejected'));
        if (reviewed?.after === 'verified') {
          realtimeCallbacksRef.current.showToast('Tu pago fue confirmado por el personal. ¡Gracias!', 'verified');
        } else if (reviewed?.after === 'rejected') {
          realtimeCallbacksRef.current.showToast('No pudimos verificar tu pago. Consulta al personal.', 'error');
        }
        setOrders((prev) =>
          prev.map((order) => {
            const fresh = statuses.get(order.id);
            if (
              !fresh ||
              (fresh.status === order.status &&
                (!fresh.paid || order.paymentStatus === 'paid') &&
                fresh.paymentVerification === (order.paymentVerification ?? 'none'))
            ) {
              return order;
            }
            return {
              ...order,
              status: fresh.status,
              paymentStatus: fresh.paid ? 'paid' : order.paymentStatus,
              paymentVerification: fresh.paymentVerification
            };
          })
        );
        realtimeCallbacksRef.current.syncDinerTicketStatus(
          Array.from(statuses, ([id, fresh]) => ({ id, status: fresh.status }) as OrderTicket)
        );
      } catch (err) {
        console.warn('[diner] No se pudo consultar el estado de los pedidos:', err);
      }
    };
    void poll();
    const intervalId = window.setInterval(poll, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [currentUser]);

  // 1. Send Order from Diner Carta Digital NFC (/menu)
  // El servidor (RPC place_order) decide precios, nombres y número de comanda.
  // Sin conexión, el pedido queda en cola con un id provisional y se reconcilia
  // al sincronizar (reconcileQueuedOrder). Si el servidor lo rechaza, lanza
  // OrderRejectedError para que la carta muestre el motivo y conserve el carrito.
  const sendOrderFromMenu = useCallback(
    async (
      tableStr: string,
      cartItems: { item: MenuItem; quantity: number; notes?: string }[],
      pax = 2
    ): Promise<OrderTicket> => {
      const safeTable = validateTableString(tableStr);
      const safePax = Math.max(1, Math.min(24, Math.floor(pax) || 2));
      const safeCart = cartItems.map((c) => ({
        item: c.item,
        quantity: Math.max(1, Math.min(99, Math.floor(c.quantity) || 1)),
        notes: sanitizeNotes(c.notes)
      }));
      const routes = safeCart.map((c) => routeKitchenStation(c.item));
      const input: PlaceOrderInput = {
        tableNumber: safeTable,
        items: toPlaceOrderItems(safeCart).map((item, idx) => ({ ...item, station: routes[idx].station })),
        idempotencyKey: crypto.randomUUID(),
        pax: safePax,
        // Código del QR de la mesa y ubicación: el servidor los exige al comensal.
        tableToken: getTableToken(safeTable),
        position: getRecentDinerPosition()
      };

      let placed: PlacedOrder | null = null;
      try {
        placed = await placeOrderInDb(input);
      } catch (err) {
        if (err instanceof OrderRejectedError) throw err;
        console.warn('[orders] Sin conexión: el pedido queda en cola offline.', err);
      }

      const orderId = placed?.id ?? `cmd-pendiente-${input.idempotencyKey.slice(0, 8)}`;
      if (!placed) queuePendingOrder(orderId, input);

      // Con respuesta del servidor se usan sus precios; en cola, los de la carta local
      // (provisionales: el servidor recalcula al sincronizar).
      const lines = safeCart.map((c, idx) => {
        const serverItem = placed?.items[idx];
        const quantity = serverItem?.quantity ?? c.quantity;
        return {
          name: sanitizeText(serverItem?.name ?? c.item.name, 60),
          quantity,
          lineTotal: (serverItem?.price ?? c.item.price) * quantity
        };
      });
      const totalCart = placed?.total ?? lines.reduce((acc, line) => acc + line.lineTotal, 0);
      const localTotal = safeCart.reduce((acc, c) => acc + c.item.price * c.quantity, 0);
      const nowStr = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const {
        tickets: currentTickets,
        orders: currentOrders,
        tables: currentTables,
        dinerActiveTicket: prevDiner
      } = latestStateRef.current;

      // El KDS solo recibe comandas confirmadas: las que están en cola llegan por
      // realtime cuando el servidor las acepta.
      let newKdsTicket: Ticket | null = null;
      if (placed) {
        const kdsItems: TicketItem[] = safeCart.map((c, idx) => ({
          id: placed.items[idx]?.id ?? `item-${Date.now()}-${idx}`,
          name: `${lines[idx].quantity}x ${lines[idx].name}`,
          quantity: lines[idx].quantity,
          station: routes[idx].station,
          stationBadge: routes[idx].badge,
          stationBadgeColor: routes[idx].badgeColor,
          status: 'pendiente',
          cookingNotes: c.notes ? [c.notes] : ['Pase estándar'],
          price: lines[idx].lineTotal,
          photoUrl: c.item.image,
          checked: false,
          prepTimeMinutes: parseInt(c.item.prepTime || '8') || 8
        }));
        const stationTags = Array.from(new Set(routes.map((r) => r.station)));
        newKdsTicket = {
          id: `ticket-kds-${Date.now()}`,
          orderNumber: placed.orderNumber,
          table: safeTable,
          zone: safeTable.includes('Terraza') ? 'TERRAZA' : safeTable.includes('Barra') ? 'BARRA MIXOLOGÍA' : 'SALÓN PRINCIPAL',
          serviceType: 'Carta Digital NFC',
          elapsedSeconds: 0,
          targetSeconds: 660,
          serverOrRunner: 'AUTO-COMENSAL',
          serverRole: 'PASE DIRECTO',
          totalAmount: totalCart,
          status: 'ingresada',
          items: kdsItems,
          timestamp: nowStr,
          stationFilterTags: stationTags.length > 0 ? stationTags : ['wok_saute'],
          isUrgent: false
        };
      }

      const newDinerOrder: OrderTicket = {
        id: orderId,
        // Clave secreta del pedido: con ella el comensal consulta su estado (RLS).
        dinerKey: input.idempotencyKey,
        table: safeTable,
        pax: safePax,
        timeAgo: placed ? 'Justo ahora' : 'En cola offline',
        createdTime: nowStr,
        origin: 'QR COMENSAL',
        status: 'por-validar',
        items: safeCart.map((c, idx) => ({
          id: placed?.items[idx]?.id ?? `it-${Date.now()}-${idx}`,
          name: `${lines[idx].quantity}x ${lines[idx].name}`,
          quantity: lines[idx].quantity,
          price: lines[idx].lineTotal,
          notes: c.notes,
          station: c.item.category === 'bebidas' ? 'Barra' : 'Cocina'
        })),
        subtotal: totalCart,
        total: totalCart
      };

      // Update Floor Table Status
      const cleanNum = safeTable.replace(/\D/g, '');
      const updatedTables = currentTables.map((t) => {
        if (t.number === cleanNum || safeTable.includes(t.number)) {
          return {
            ...t,
            status: 'qr' as const,
            pax: safePax,
            amount: (t.amount || 0) + totalCart,
            timeActive: '0 min (QR)',
            dishesCount: `${safeCart.length} platos`
          };
        }
        return t;
      });

      const updatedTickets = newKdsTicket ? [newKdsTicket, ...currentTickets] : currentTickets;
      const updatedOrders = [newDinerOrder, ...currentOrders];

      // Consolidar comanda activa para el comensal si ya tiene pedidos previos en esta mesa (Ronda 2, 3...)
      let consolidatedDinerOrder = newDinerOrder;
      const isSameTable = prevDiner && (
        prevDiner.table.replace(/\D/g, '') === cleanNum ||
        prevDiner.table.toLowerCase() === safeTable.toLowerCase() ||
        safeTable.toLowerCase().includes(prevDiner.table.toLowerCase())
      );

      if (prevDiner && isSameTable) {
        consolidatedDinerOrder = {
          ...newDinerOrder,
          items: [...prevDiner.items, ...newDinerOrder.items],
          subtotal: prevDiner.subtotal + newDinerOrder.subtotal,
          total: prevDiner.total + newDinerOrder.total
        };
      }

      setTickets(updatedTickets);
      setOrders(updatedOrders);
      setTables(updatedTables);
      setDinerActiveTicket(consolidatedDinerOrder);

      persistState(updatedTickets, updatedOrders, updatedTables, undefined, consolidatedDinerOrder);

      if (newKdsTicket) {
        kitchenAudio.playDispatchSound();
        broadcastSync('NEW_ORDER', {
          ticket: newKdsTicket,
          order: newDinerOrder,
          tables: updatedTables
        });
      }

      if (!placed) {
        showToast('Sin conexión: tu pedido se enviará en cuanto vuelva la señal', 'cloud_off');
      } else if (Math.abs(placed.total - localTotal) > 0.005) {
        showToast(`Comanda #${placed.orderNumber} enviada con los precios vigentes de la carta`, 'sell');
      } else {
        showToast(`¡Comanda #${placed.orderNumber} enviada a Cocina KDS desde ${safeTable}!`, 'soup_kitchen');
      }
      return newDinerOrder;
    },
    [persistState, broadcastSync, showToast]
  );

  // Una comanda que estaba en cola offline ya tiene número definitivo del servidor:
  // reemplaza el id provisional en la vista del comensal y en sus rondas.
  const reconcileQueuedOrder = useCallback(
    (localId: string, placed: PlacedOrder) => {
      const { orders: currentOrders, dinerActiveTicket: currentDiner } = latestStateRef.current;
      const updatedOrders = currentOrders.map((order) =>
        order.id === localId
          ? { ...order, id: placed.id, timeAgo: 'Justo ahora', subtotal: placed.total, total: placed.total }
          : order
      );
      setOrders(updatedOrders);
      setTableOrderRounds((rounds) =>
        rounds.map((round) => (round.orderId === localId ? { ...round, orderId: placed.id } : round))
      );
      let updatedDiner = currentDiner;
      if (currentDiner?.id === localId) {
        updatedDiner = { ...currentDiner, id: placed.id };
        setDinerActiveTicket(updatedDiner);
      }
      persistState(undefined, updatedOrders, undefined, undefined, updatedDiner);
    },
    [persistState]
  );

  const recordTableOrderRound = useCallback(
    (
      tableStr: string,
      cartItems: { item: MenuItem; quantity: number }[],
      createdAt: Date,
      orderId: string
    ) => {
      const safeTable = validateTableString(tableStr);
      const tableKey = getTableRoundKey(safeTable);

      setTableOrderRounds((previousRounds) => {
        const rounds = previousRounds.filter((round) => getTableRoundKey(round.table) === tableKey);
        const roundNumber = rounds.length + 1;
        const newRound: OrderRound = {
          id: `${tableKey}-${createdAt.getTime()}-${roundNumber}`,
          orderId,
          table: safeTable,
          createdAt: createdAt.toISOString(),
          time: createdAt.toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          items: cartItems.map((cartItem, index): OrderRoundItem => ({
            id: `${tableKey}-${createdAt.getTime()}-${index}`,
            name: cartItem.item.name,
            quantity: cartItem.quantity,
            price: cartItem.item.price,
            status: 'Recibido'
          }))
        };

        return [...previousRounds, newRound];
      });
    },
    []
  );

  // 2. Check / Toggle Item Ready in KDS
  const updateTicketItem = useCallback(
    (ticketId: string, itemId: string, explicitChecked?: boolean) => {
      let isTicketAllReady = false;
      let targetTable = '';
      let targetOrderId = '';

      const updated = tickets.map((ticket) => {
        if (ticket.id !== ticketId) return ticket;
        targetTable = ticket.table;
        targetOrderId = `cmd-${ticket.orderNumber}`;
        const updatedItems = ticket.items.map((item) => {
          if (item.id !== itemId) return item;
          const nextChecked = explicitChecked !== undefined ? explicitChecked : !item.checked;
          return {
            ...item,
            checked: nextChecked,
            status: nextChecked ? ('listo' as const) : ('pendiente' as const)
          };
        });

        isTicketAllReady = updatedItems.every((i) => i.checked);
        return {
          ...ticket,
          items: updatedItems,
          status: isTicketAllReady ? ('lista_despachada' as const) : ticket.status
        };
      });

      setTickets(updated);
      persistState(updated);
      kitchenAudio.playCheckItemSound();
      broadcastSync('UPDATE_TICKETS', { tickets: updated });

      if (isTicketAllReady && targetOrderId) {
        const matchingOrder = orders.find((order) => order.id === targetOrderId);
        if (matchingOrder) {
          const updatedOrders = orders.map((order) =>
            order.id === matchingOrder.id ? { ...order, status: 'pase-listo' as const } : order
          );
          setOrders(updatedOrders);
          persistState(updated, updatedOrders);
          broadcastSync('UPDATE_ORDERS', { orders: updatedOrders, tickets: updated });
          updateOrderStatusInDb(matchingOrder.id, 'pase-listo').catch((err) => {
            console.warn('Error updating ready order status in Supabase:', err);
          });
        }
      }

      // Persist item check in Supabase in background
      const checkedVal = explicitChecked !== undefined ? explicitChecked : true;
      updateOrderItemCheckInDb(itemId, checkedVal).catch((err) => {
        console.warn('Error updating item check in DB:', err);
      });

      if (isTicketAllReady && targetTable) {
        showToast(`Todos los platos listos para ${targetTable}`, 'done_all');
      }
    },
    [tickets, orders, persistState, broadcastSync, showToast]
  );

  // 3. Start Prep
  const startTicketPrep = useCallback(
    (ticketId: string) => {
      let targetTable = '';
      let targetOrderId = '';
      const updated = tickets.map((t) => {
        if (t.id === ticketId) {
          targetTable = t.table;
          targetOrderId = `cmd-${t.orderNumber}`;
          return { ...t, status: 'en_fuego' as const };
        }
        return t;
      });

      if (dinerActiveTicket && dinerActiveTicket.id === targetOrderId) {
        const updatedDiner: OrderTicket = { ...dinerActiveTicket, status: 'en-cocina' };
        setDinerActiveTicket(updatedDiner);
        const updatedOrders = orders.map((order) =>
          order.id === targetOrderId ? { ...order, status: 'en-cocina' as const } : order
        );
        setOrders(updatedOrders);
        persistState(updated, updatedOrders, undefined, undefined, updatedDiner);
        broadcastSync('DINER_STATUS_UPDATE', { ticket: updatedDiner });
        broadcastSync('UPDATE_ORDERS', { orders: updatedOrders, tickets: updated });
      } else {
        persistState(updated);
      }

      setTickets(updated);
      kitchenAudio.playCheckItemSound();
      broadcastSync('UPDATE_TICKETS', { tickets: updated });

      const matchingOrder = orders.find((order) => order.id === targetOrderId);
      if (matchingOrder) {
        const updatedOrders = orders.map((order) =>
          order.id === targetOrderId ? { ...order, status: 'en-cocina' as const } : order
        );
        setOrders(updatedOrders);
        persistState(updated, updatedOrders);
        broadcastSync('UPDATE_ORDERS', { orders: updatedOrders, tickets: updated });
        updateOrderStatusInDb(matchingOrder.id, 'en-cocina').catch((err) => {
          console.warn('Error updating preparation status in Supabase:', err);
        });
      }

      showToast(`Comanda de ${targetTable || 'orden'} iniciada en fuego`, 'local_fire_department');
    },
    [tickets, orders, dinerActiveTicket, persistState, broadcastSync, showToast]
  );

  // 4. Dispatch Ticket to Pase
  const dispatchTicket = useCallback(
    (ticketId: string) => {
      const ticketToDispatch = tickets.find((t) => t.id === ticketId);
      if (!ticketToDispatch) return;

      setLastDispatchedTicket(ticketToDispatch);
      kitchenAudio.playDispatchSound();

      const updatedTickets = tickets.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: 'lista_despachada' as const,
            items: t.items.map((i) => ({ ...i, checked: true, status: 'listo' as const }))
          };
        }
        return t;
      });

      const cleanTable = ticketToDispatch.table;
      const updatedOrders = orders.map((o) => {
        if (o.id === `cmd-${ticketToDispatch.orderNumber}`) {
          return { ...o, status: 'pase-listo' as const };
        }
        return o;
      });

      const cleanNum = cleanTable.replace(/\D/g, '');
      const updatedTables = tables.map((tbl) => {
        if (tbl.number === cleanNum || tbl.number === cleanTable) {
          return { ...tbl, status: 'cuenta' as const };
        }
        return tbl;
      });

      let updatedDiner = dinerActiveTicket;
      if (dinerActiveTicket?.id === `cmd-${ticketToDispatch.orderNumber}`) {
        updatedDiner = { ...dinerActiveTicket, status: 'pase-listo' };
        setDinerActiveTicket(updatedDiner);
        broadcastSync('DINER_STATUS_UPDATE', { ticket: updatedDiner });
      }

      setTickets(updatedTickets);
      setOrders(updatedOrders);
      setTables(updatedTables);

      persistState(updatedTickets, updatedOrders, updatedTables, undefined, updatedDiner);
      broadcastSync('UPDATE_TICKETS', { tickets: updatedTickets });
      broadcastSync('UPDATE_TABLES', { tables: updatedTables });
      broadcastSync('UPDATE_ORDERS', { orders: updatedOrders, tickets: updatedTickets });

      // Update matching order in Supabase
      const matchingOrder = orders.find((o) => o.id === `cmd-${ticketToDispatch.orderNumber}`);
      if (matchingOrder) {
        updateOrderStatusInDb(matchingOrder.id, 'pase-listo').catch((err) => {
          console.warn('Error updating order to pase-listo in DB:', err);
        });
      }

      showToast(`Comanda #${ticketToDispatch.orderNumber} despachada al Pase Central`, 'done_all');
    },
    [tickets, orders, tables, dinerActiveTicket, persistState, broadcastSync, showToast]
  );

  // 5. Recall Last Dispatched
  const recallLastDispatched = useCallback(() => {
    if (!lastDispatchedTicket) {
      showToast('No hay comandas recientes para recuperar', 'info');
      return;
    }
    const recalled = { ...lastDispatchedTicket, status: 'en_fuego' as const };
    const updated = tickets.map((t) => (t.id === recalled.id ? recalled : t));
    setTickets(updated);
    setLastDispatchedTicket(null);
    persistState(updated);
    kitchenAudio.playCheckItemSound();
    broadcastSync('UPDATE_TICKETS', { tickets: updated });
    showToast(`Comanda #${recalled.orderNumber} recuperada en pantalla`, 'restore');
  }, [lastDispatchedTicket, tickets, persistState, broadcastSync, showToast]);

  // 6. Prioritize Table from Floor Plan
  const prioritizeTable = useCallback(
    (tableNumber: string) => {
      const cleanNum = tableNumber.replace(/\D/g, '');

      const updatedTickets = tickets.map((t) => {
        const ticketNum = t.table.replace(/\D/g, '');
        if (ticketNum === cleanNum || t.table.includes(tableNumber)) {
          return { ...t, isUrgent: true, allergyAlert: 'PRIORIDAD SALÓN - SERVICIO RÁPIDO' };
        }
        return t;
      });

      const updatedTables = tables.map((tbl) => {
        if (tbl.number === cleanNum || tbl.number === tableNumber) {
          return { ...tbl, status: 'demora' as const };
        }
        return tbl;
      });

      setTickets(updatedTickets);
      setTables(updatedTables);
      persistState(updatedTickets, undefined, updatedTables);

      // Persist table priority alert in Supabase
      updateTableStateInDb(tableNumber, { status: 'demora' }).catch(console.warn);

      AuditLogger.log({
        eventType: 'TABLE_PRIORITIZED',
        severity: 'WARN',
        user: currentUser?.name || 'SALA TPV',
        role: currentUser?.role || 'admin',
        details: `Alerta de prioridad urgente transmitida a cocina para Mesa ${tableNumber}`
      });

      kitchenAudio.playAllergyWarning();
      broadcastSync('PRIORITIZE_TABLE', { tableNumber, tickets: updatedTickets });
      showToast(`¡Prioridad urgente transmitida a Cocina para Mesa ${tableNumber}!`, 'priority_high');
    },
    [tickets, tables, currentUser, persistState, broadcastSync, showToast]
  );

  // 7. Collect Table Bill and Free Table (Corte / Cobro)
  const collectTableBill = useCallback(
    (tableNumber: string, amount?: number) => {
      // Cobra en Supabase (mesa + pedidos) y luego recalcula la caja desde la base.
      Promise.all([settleTableInDb(tableNumber), settleOrdersForTableInDb(tableNumber)])
        .then(() => fetchShiftRevenueFromDb())
        .then((revenue) => {
          if (revenue !== null) setTotalShiftRevenue(revenue);
        })
        .catch(console.warn);
      const cleanNum = tableNumber.replace(/\D/g, '');
      // Monto real de la mesa (antes, sin monto se sumaban S/ 165 inventados).
      const tableAmount = tables.find((tbl) => tbl.number === cleanNum || tbl.number === tableNumber)?.amount;
      const billAmount = amount ?? tableAmount ?? 0;

      const updatedTables = tables.map((tbl) => {
        if (tbl.number === cleanNum || tbl.number === tableNumber) {
          return {
            ...tbl,
            status: 'disponible' as const,
            amount: 0,
            pax: 0,
            timeActive: undefined,
            dishesCount: undefined
          };
        }
        return tbl;
      });

      const updatedTickets = tickets.map((t) => {
        const ticketNum = t.table.replace(/\D/g, '');
        if (ticketNum === cleanNum || t.table.includes(tableNumber)) {
          return { ...t, status: 'archivada' as const };
        }
        return t;
      });

      if (dinerActiveTicket && (dinerActiveTicket.table === tableNumber || tableNumber.includes(dinerActiveTicket.table))) {
        setDinerActiveTicket(null);
        persistState(updatedTickets, undefined, updatedTables, totalShiftRevenue + billAmount, null);
      } else {
        persistState(updatedTickets, undefined, updatedTables, totalShiftRevenue + billAmount);
      }

      const newRev = totalShiftRevenue + billAmount;
      setTables(updatedTables);
      setTickets(updatedTickets);
      setTotalShiftRevenue(newRev);

      AuditLogger.log({
        eventType: 'TABLE_SETTLED',
        severity: 'INFO',
        user: currentUser?.name || 'SALA TPV',
        role: currentUser?.role || 'admin',
        details: `Cobro liquidado para Mesa ${tableNumber}: S/ ${billAmount.toFixed(2)}. Mesa liberada.`
      });

      kitchenAudio.playDispatchSound();
      broadcastSync('UPDATE_TABLES', { tables: updatedTables });
      broadcastSync('UPDATE_TICKETS', { tickets: updatedTickets });
      showToast(`Cobro liquidado para Mesa ${tableNumber}: S/ ${billAmount.toFixed(2)}. Mesa liberada.`, 'point_of_sale');
    },
    [tables, tickets, dinerActiveTicket, totalShiftRevenue, currentUser, persistState, broadcastSync, showToast]
  );

  // 8. Open Table in Floor Plan
  const openTable = useCallback(
    (tableNumber: string, pax = 2, waiter = 'Valeria P.') => {
      const cleanNum = tableNumber.replace(/\D/g, '');
      const safeWaiter = sanitizeText(waiter, 40) || 'Valeria P.';

      const updatedTables = tables.map((tbl) => {
        if (tbl.number === cleanNum || tbl.number === tableNumber) {
          return {
            ...tbl,
            status: 'comiendo' as const,
            pax,
            waiter: safeWaiter,
            amount: 0,
            timeActive: '0 min',
            dishesCount: 'Esperando comanda'
          };
        }
        return tbl;
      });

      setTables(updatedTables);
      persistState(undefined, undefined, updatedTables);
      broadcastSync('UPDATE_TABLES', { tables: updatedTables });
      showToast(`Mesa ${tableNumber} abierta y comensales asignados`, 'table_restaurant');

      // Persist table status in Supabase
      updateTableStateInDb(tableNumber, {
        status: 'comiendo',
        pax,
        waiter: safeWaiter
      }).catch(console.warn);
    },
    [tables, persistState, broadcastSync, showToast]
  );

  // 9. Notify Runners at Pass
  const notifyRunners = useCallback(() => {
    kitchenAudio.playRunnerAlertSound();
    broadcastSync('RUNNER_ALERT', {});
    showToast('Aviso transmitido a salón: Platos calientes esperan en mesa de pase', 'campaign');
  }, [broadcastSync, showToast]);

  // 10. Call All Runners to Central Pass
  const callAllRunners = useCallback(() => {
    kitchenAudio.playRunnerAlertSound();
    const updated = runners.map((r) => ({
      ...r,
      status: 'Libre en Pase' as const,
      location: 'Libre en Pase'
    }));
    setRunners(updated);
    broadcastSync('UPDATE_RUNNERS', { runners: updated });
    showToast('Todos los runners convocados de inmediato al Pase Central', 'campaign');
  }, [runners, broadcastSync, showToast]);

  // 11. Update Single Runner Status
  const updateRunnerStatus = useCallback(
    (runnerId: string, status: Runner['status'], table?: string) => {
      const safeTable = table ? validateTableString(table) : undefined;
      const updated = runners.map((r) => {
        if (r.id === runnerId) {
          return {
            ...r,
            status,
            currentTable: safeTable,
            location: status === 'Libre en Pase' ? 'Libre en Pase' : safeTable || 'En Mesa'
          };
        }
        return r;
      });
      setRunners(updated);
      broadcastSync('UPDATE_RUNNERS', { runners: updated });
      showToast('Estado de runner actualizado', 'person');
    },
    [runners, broadcastSync, showToast]
  );

  // 12. Toggle Kitchen Pause
  const toggleKitchenPause = useCallback(() => {
    setKitchenPaused((prev) => {
      const next = !prev;
      if (next) {
        showToast('Cocina pausada temporalmente. TPV notificará retraso a salón', 'pause');
      } else {
        showToast('Servicio y flujo de cocina reanudado con normalidad', 'play_arrow');
      }
      return next;
    });
  }, [showToast]);

  // 13. Reset All Demo Data
  // "Restablecer": borra los cachés locales de este dispositivo y vuelve a leer
  // todo de Supabase (ya no hay datos de ejemplo que restaurar).
  const resetAllDemoData = useCallback(() => {
    [STORAGE_KEY_TICKETS, STORAGE_KEY_ORDERS, STORAGE_KEY_TABLES, STORAGE_KEY_REVENUE, STORAGE_KEY_DINER].forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    });
    showToast('Cachés locales limpiados. Recargando desde el servidor…', 'restart_alt');
    setTimeout(() => window.location.reload(), 600);
  }, [showToast]);

  // 14. Simulate New Incoming Order
  const simulateNewOrder = useCallback(() => {
    const item = INITIAL_MENU_ITEMS[Math.floor(Math.random() * INITIAL_MENU_ITEMS.length)];
    const tableNum = Math.floor(Math.random() * 12) + 1;
    sendOrderFromMenu(`MESA ${tableNum.toString().padStart(2, '0')}`, [{ item, quantity: 1 }], 2).catch((err) => {
      showToast(err instanceof Error ? err.message : 'No se pudo simular el pedido', 'error');
    });
  }, [sendOrderFromMenu, showToast]);

  // 16. Update Order Status from Central de Pedidos with Persistence
  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderTicket['status']) => {
      let targetTable = '';
      const updatedOrders = orders.map((ord) => {
        if (ord.id === orderId) {
          targetTable = ord.table;
          return { ...ord, status: newStatus };
        }
        return ord;
      });

      // Synchronize corresponding KDS ticket state
      let updatedTickets = tickets;
      if (newStatus === 'en-cocina') {
        updatedTickets = tickets.map((t) => {
          if (t.table.toUpperCase() === targetTable.toUpperCase() || targetTable.includes(t.table)) {
            return { ...t, status: 'en_fuego' as const };
          }
          return t;
        });
        setTickets(updatedTickets);
      } else if (newStatus === 'pase-listo') {
        updatedTickets = tickets.map((t) => {
          if (t.table.toUpperCase() === targetTable.toUpperCase() || targetTable.includes(t.table)) {
            return {
              ...t,
              status: 'lista_despachada' as const,
              items: t.items.map((i) => ({ ...i, checked: true, status: 'listo' as const }))
            };
          }
          return t;
        });
        setTickets(updatedTickets);
      } else if (newStatus === 'entregado') {
        updatedTickets = tickets.map((t) => {
          if (t.table.toUpperCase() === targetTable.toUpperCase() || targetTable.includes(t.table)) {
            return { ...t, status: 'archivada' as const };
          }
          return t;
        });
        setTickets(updatedTickets);
      }

      setOrders(updatedOrders);
      persistState(updatedTickets, updatedOrders);
      broadcastSync('UPDATE_ORDERS', { orders: updatedOrders, tickets: updatedTickets });

      try {
        await updateOrderStatusInDb(orderId, newStatus);
      } catch (err) {
        console.warn('Error updating order status in Supabase:', err);
      }

      kitchenAudio.playCheckItemSound();
    },
    [orders, tickets, persistState, broadcastSync]
  );

  // 17. Add Note to Order with Persistence
  const addOrderNote = useCallback(
    (orderId: string, note: string) => {
      const updatedOrders = orders.map((ord) => {
        if (ord.id === orderId) {
          const updatedItems = ord.items.map((item, idx) => {
            if (idx === 0) {
              return { ...item, notes: item.notes ? `${item.notes} | ${note}` : note };
            }
            return item;
          });
          return { ...ord, items: updatedItems };
        }
        return ord;
      });
      setOrders(updatedOrders);
      persistState(undefined, updatedOrders);
      broadcastSync('UPDATE_ORDERS', { orders: updatedOrders });
      showToast('Nota agregada a la comanda', 'edit_note');
    },
    [orders, persistState, broadcastSync, showToast]
  );

  // 15. Create New Manual Ticket in KDS
  // Se guarda primero en el servidor (place_order, origen GARZÓN) y solo si
  // responde se muestra en el KDS, con el número y los precios definitivos.
  // Devuelve false (y avisa) si no se pudo registrar, para que el modal no se cierre.
  const createNewKdsTicket = useCallback(
    async (ticket: Ticket): Promise<boolean> => {
      const missingDish = ticket.items.find((i) => !i.dishId);
      if (missingDish) {
        showToast(`"${missingDish.name}" no está en la carta: no se puede cobrar`, 'error');
        return false;
      }

      let placed: PlacedOrder;
      try {
        placed = await placeOrderInDb({
          tableNumber: validateTableString(ticket.table),
          items: ticket.items.map((i) => ({
            dishId: i.dishId,
            quantity: i.quantity,
            notes: i.cookingNotes?.filter(Boolean).join(' | ') || undefined,
            station: i.station === 'all' ? undefined : i.station
          })),
          idempotencyKey: crypto.randomUUID(),
          pax: 2,
          origin: 'GARZÓN',
          waiter: ticket.serverOrRunner || undefined
        });
      } catch (err) {
        console.error('[orders] No se pudo registrar la comanda manual:', err);
        showToast(
          err instanceof OrderRejectedError
            ? err.message
            : 'Sin conexión: la comanda no se registró. Vuelve a intentarlo.',
          'error'
        );
        return false;
      }

      const confirmedItems: TicketItem[] = ticket.items.map((i, idx) => {
        const serverItem = placed.items[idx];
        return serverItem
          ? { ...i, id: serverItem.id, quantity: serverItem.quantity, price: serverItem.price * serverItem.quantity }
          : i;
      });
      const confirmedTicket: Ticket = {
        ...ticket,
        orderNumber: placed.orderNumber,
        items: confirmedItems,
        totalAmount: placed.total
      };
      const newOrder: OrderTicket = {
        id: placed.id,
        table: placed.table,
        pax: 2,
        timeAgo: 'Justo ahora',
        createdTime: ticket.timestamp || new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        origin: 'GARZÓN',
        waiter: ticket.serverOrRunner || 'Personal',
        status: 'en-cocina',
        isCritical: Boolean(ticket.isUrgent),
        preparationPercent: 25,
        items: confirmedItems.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          notes: i.cookingNotes?.join(' | '),
          station: i.stationBadge || 'Cocina',
          allergen: ticket.allergyAlert || i.allergens?.join(', ')
        })),
        subtotal: placed.subtotal,
        total: placed.total
      };

      const { tickets: currentTickets, orders: currentOrders } = latestStateRef.current;
      const updated = [confirmedTicket, ...currentTickets];
      const updatedOrders = [newOrder, ...currentOrders];

      setTickets(updated);
      setOrders(updatedOrders);
      persistState(updated, updatedOrders);

      kitchenAudio.playDispatchSound();
      broadcastSync('UPDATE_TICKETS', { tickets: updated });
      broadcastSync('UPDATE_ORDERS', { orders: updatedOrders, tickets: updated });
      showToast(`Comanda #${placed.orderNumber} creada en KDS y sincronizada con Pedidos`, 'add_circle');
      return true;
    },
    [persistState, broadcastSync, showToast]
  );

  // 18. Request Table Account from Mobile Diner Menu
  const requestTableAccount = useCallback(
    async (paymentMethod: string = 'Efectivo', tableOverride?: string, claim?: PaymentClaim): Promise<boolean> => {
      // CD-28 · Mismo defecto hermano del llamado de mozo: la cuenta también se pedía
      // siempre como "MESA 04" cuando el comensal aún no tenía comanda activa.
      const activeTable = tableOverride?.trim() || dinerActiveTicket?.table || 'MESA 04';
      
      const updatedDiner = dinerActiveTicket
        ? { ...dinerActiveTicket, accountRequested: true, paymentMethod }
        : null;
      setDinerActiveTicket(updatedDiner);

      const updatedOrders = orders.map((o) => {
        if (o.table.toUpperCase() === activeTable.toUpperCase() || activeTable.includes(o.table)) {
          return { ...o, accountRequested: true, paymentMethod };
        }
        return o;
      });
      setOrders(updatedOrders);

      const cleanNum = activeTable.replace(/\D/g, '');
      const updatedTables = tables.map((tbl) => {
        if (tbl.number === cleanNum || tbl.number === activeTable) {
          return { ...tbl, status: 'cuenta' as const };
        }
        return tbl;
      });
      setTables(updatedTables);

      persistState(undefined, updatedOrders, updatedTables, undefined, updatedDiner);
      kitchenAudio.playCheckItemSound();
      broadcastSync('UPDATE_ORDERS', { orders: updatedOrders });
      broadcastSync('UPDATE_TABLES', { tables: updatedTables });
      if (updatedDiner) {
        broadcastSync('DINER_STATUS_UPDATE', { ticket: updatedDiner });
      }

      // Optimistic background sync: no bloquear interfaz del comensal
      requestTableAccountInDb(activeTable, paymentMethod, claim).catch((err) => {
        console.warn('Background sync error requesting account in DB:', err);
      });
      showToast(`Cuenta solicitada (${paymentMethod}). Garzón en camino.`, 'receipt');
      return true;
    },
    [dinerActiveTicket, orders, tables, persistState, broadcastSync, showToast]
  );

  // 19. Call Waiter from Mobile Diner Menu
  // CD-28 · Se CONSERVA intacta toda la lógica heredada (marca la mesa en 'demora',
  // persiste en localStorage, dispara el broadcast local y su audio) y se AÑADE el
  // registro persistente del llamado con su motivo real en `waiter_calls`.
  const callWaiter = useCallback(
    async (reason: string = 'Atención en mesa', tableOverride?: string): Promise<boolean> => {
      // CD-28 · FIX de datos estáticos: la mesa llega desde el comensal (selector / QR).
      // Antes la función no la recibía y todo llamado SIN comanda previa se registraba en
      // `waiter_calls` como "Mesa 04" (el fallback), ignorando la mesa que el usuario
      // realmente seleccionó. Prioridad: mesa explícita del comensal > mesa de su comanda.
      const activeTable = tableOverride?.trim() || dinerActiveTicket?.table || 'MESA 04';
      const cleanNum = activeTable.replace(/\D/g, '');

      const updatedTables = tables.map((tbl) => {
        if (tbl.number === cleanNum || tbl.number === activeTable) {
          return { ...tbl, status: 'demora' as const };
        }
        return tbl;
      });
      setTables(updatedTables);
      persistState(undefined, undefined, updatedTables);
      kitchenAudio.playAllergyWarning();
      broadcastSync('UPDATE_TABLES', { tables: updatedTables });
      broadcastSync('RUNNER_ALERT', { message: `Llamada de mozo para ${activeTable}` });

      // 1) Lógica heredada intacta (sin cambios de comportamiento).
      await callWaiterForTableInDb(activeTable, reason);

      // 2) Capa NUEVA CD-28: INSERT en waiter_calls con el motivo del ticket.
      //    Ante un llamado duplicado (índice único parcial) es idempotente.
      await createWaiterCall(activeTable, normalizeWaiterCallReason(reason)).catch((err) => {
        console.warn('Background sync error registering waiter call:', err);
      });

      showToast(`Garzón notificado para ${activeTable}. En camino.`, 'notifications_active');
      return true;
    },
    [dinerActiveTicket, tables, persistState, broadcastSync, showToast]
  );

  // 20. CD-28 · Marcar un llamado de mesa como atendido (KDS Cocina / Panel de Salón).
  const attendWaiterCall = useCallback(
    async (callId: string): Promise<void> => {
      // Optimista: desaparece de la pantalla del personal al instante.
      setWaiterCalls((current) => current.filter((call) => call.id !== callId));
      await attendWaiterCallInDb(callId).catch((err) => {
        console.warn('Background sync error attending waiter call:', err);
      });
    },
    []
  );

  return (
    <RestaurantContext.Provider
      value={{
        tickets,
        setTickets,
        orders,
        setOrders,
        tableOrderRounds,
        tables,
        waiterCalls,
        runners,
        setRunners,
        totalShiftRevenue,
        kitchenPaused,
        dinerActiveTicket,
        audioEnabled,
        sendOrderFromMenu,
        reconcileQueuedOrder,
        recordTableOrderRound,
        updateTicketItem,
        startTicketPrep,
        dispatchTicket,
        recallLastDispatched,
        prioritizeTable,
        collectTableBill,
        openTable,
        notifyRunners,
        callAllRunners,
        updateRunnerStatus,
        toggleKitchenPause,
        toggleAudio,
        showToast,
        resetAllDemoData,
        simulateNewOrder,
        createNewKdsTicket,
        updateOrderStatus,
        addOrderNote,
        requestTableAccount,
        callWaiter,
        attendWaiterCall
      }}
    >
      {children}

    </RestaurantContext.Provider>
  );
};

export const useRestaurant = (): RestaurantContextType => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};
