'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Ticket, OrderTicket, TableStatus, Runner, MenuItem, StationId, TicketItem } from '../types';
import { INITIAL_TICKETS, INITIAL_RUNNERS } from '../data/initialData';
import { INITIAL_ORDERS, INITIAL_TABLES, INITIAL_MENU_ITEMS } from '../data/mockData';
import { kitchenAudio } from '../utils/audio';

interface RestaurantContextType {
  // State
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  orders: OrderTicket[];
  tables: TableStatus[];
  runners: Runner[];
  setRunners: React.Dispatch<React.SetStateAction<Runner[]>>;
  totalShiftRevenue: number;
  kitchenPaused: boolean;
  toast: { message: string; icon?: string } | null;
  dinerActiveTicket: OrderTicket | null;
  audioEnabled: boolean;

  // Actions
  sendOrderFromMenu: (tableStr: string, cartItems: { item: MenuItem; quantity: number; notes?: string }[], pax?: number) => OrderTicket;
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
  createNewKdsTicket: (ticket: Ticket) => void;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

const STORAGE_KEY_TICKETS = 'gastropulse_kds_tickets_v1';
const STORAGE_KEY_ORDERS = 'gastropulse_orders_v1';
const STORAGE_KEY_TABLES = 'gastropulse_tables_v1';
const STORAGE_KEY_REVENUE = 'gastropulse_revenue_v1';
const STORAGE_KEY_DINER = 'gastropulse_diner_ticket_v1';

export const RestaurantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [orders, setOrders] = useState<OrderTicket[]>(INITIAL_ORDERS);
  const [tables, setTables] = useState<TableStatus[]>(INITIAL_TABLES);
  const [runners, setRunners] = useState<Runner[]>(INITIAL_RUNNERS);
  const [totalShiftRevenue, setTotalShiftRevenue] = useState<number>(4215.00);
  const [kitchenPaused, setKitchenPaused] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [lastDispatchedTicket, setLastDispatchedTicket] = useState<Ticket | null>(null);
  const [toast, setToast] = useState<{ message: string; icon?: string } | null>(null);
  const [dinerActiveTicket, setDinerActiveTicket] = useState<OrderTicket | null>(null);
  const [isClient, setIsClient] = useState(false);

  const showToast = useCallback((message: string, icon = 'check_circle') => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 3500);
  }, []);

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
  const broadcastSync = useCallback((action: string, payload: any) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('gastropulse_sync_bus');
        channel.postMessage({ action, payload, timestamp: Date.now() });
        channel.close();
      }
    } catch (err) {
      // BroadcastChannel optional fallback
    }
  }, []);

  // Load persisted state on mount
  useEffect(() => {
    setIsClient(true);
    try {
      const savedTickets = localStorage.getItem(STORAGE_KEY_TICKETS);
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

  // Listen to BroadcastChannel events from other tabs (e.g. Menu order placed from diner tab)
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('gastropulse_sync_bus');

    channel.onmessage = (event) => {
      const { action, payload } = event.data;
      if (action === 'NEW_ORDER') {
        setTickets((prev) => [payload.ticket, ...prev.filter((t) => t.id !== payload.ticket.id)]);
        setOrders((prev) => [payload.order, ...prev.filter((o) => o.id !== payload.order.id)]);
        setTables(payload.tables);
        kitchenAudio.playDispatchSound();
        showToast(`¡Nueva comanda recibida de ${payload.ticket.table}!`, 'soup_kitchen');
      } else if (action === 'UPDATE_TICKETS') {
        setTickets(payload.tickets);
      } else if (action === 'UPDATE_TABLES') {
        setTables(payload.tables);
      } else if (action === 'UPDATE_RUNNERS') {
        setRunners(payload.runners);
      } else if (action === 'DINER_STATUS_UPDATE') {
        setDinerActiveTicket(payload.ticket);
      } else if (action === 'PRIORITIZE_TABLE') {
        setTickets(payload.tickets);
        kitchenAudio.playAllergyWarning();
        showToast(`¡Mesa ${payload.tableNumber} marcada con PRIORIDAD!`, 'priority_high');
      } else if (action === 'RUNNER_ALERT') {
        kitchenAudio.playRunnerAlertSound();
        showToast('¡Aviso a Runners en mesa de pase central!', 'campaign');
      }
    };

    return () => {
      channel.close();
    };
  }, [showToast]);

  // Central timer tick every 1000ms for elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setTickets((prev) =>
        prev.map((t) => {
          if (t.status === 'lista_despachada' || t.status === 'archivada') return t;
          return { ...t, elapsedSeconds: (t.elapsedSeconds || 0) + 1 };
        })
      );
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

  // 1. Send Order from Diner Carta Digital NFC (/menu)
  const sendOrderFromMenu = useCallback(
    (
      tableStr: string,
      cartItems: { item: MenuItem; quantity: number; notes?: string }[],
      pax = 2
    ): OrderTicket => {
      const orderNum = Math.floor(100 + Math.random() * 899);
      const ticketId = `ticket-kds-${Date.now()}`;
      const cmdId = `cmd-${orderNum}`;
      const nowStr = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

      // Determine stations from cart
      const stationTags: StationId[] = [];
      const kdsItems: TicketItem[] = cartItems.map((c, idx) => {
        let station: StationId = 'wok_saute';
        let badge = 'WOK & SAUTÉ';
        let badgeColor = 'bg-[#ff5708] text-white';

        if (c.item.category === 'bebidas') {
          station = 'barra_mixologia';
          badge = 'BARRA';
          badgeColor = 'bg-[#0494fc] text-white';
        } else if (c.item.category === 'entradas') {
          station = 'frio_nikkei';
          badge = 'FRÍO & NIKKEI';
          badgeColor = 'bg-[#0494fc] text-white';
        } else if (c.item.category === 'postres') {
          station = 'pasteleria';
          badge = 'PASTELERÍA';
          badgeColor = 'bg-[#c6c5cf] text-[#131315]';
        } else if (c.item.name.toLowerCase().includes('wagyu') || c.item.name.toLowerCase().includes('pulpo') || c.item.name.toLowerCase().includes('lomo')) {
          station = 'fuego_grill';
          badge = 'FUEGO & GRILL';
          badgeColor = 'bg-[#ff5708] text-white';
        }

        if (!stationTags.includes(station)) stationTags.push(station);

        return {
          id: `item-${Date.now()}-${idx}`,
          name: `${c.quantity}x ${c.item.name}`,
          quantity: c.quantity,
          station,
          stationBadge: badge,
          stationBadgeColor: badgeColor,
          status: 'pendiente',
          cookingNotes: c.notes ? [c.notes] : ['Pase estándar'],
          price: c.item.price * c.quantity,
          photoUrl: c.item.image,
          checked: false,
          prepTimeMinutes: parseInt(c.item.prepTime || '8') || 8
        };
      });

      const totalCart = cartItems.reduce((acc, c) => acc + c.item.price * c.quantity, 0);

      // Create KDS Ticket
      const newKdsTicket: Ticket = {
        id: ticketId,
        orderNumber: orderNum,
        table: tableStr,
        zone: tableStr.includes('06') ? 'TERRAZA' : tableStr.includes('07') ? 'BARRA MIXOLOGÍA' : 'SALÓN PRINCIPAL',
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

      // Create Diner View OrderTicket
      const newDinerOrder: OrderTicket = {
        id: cmdId,
        table: tableStr,
        pax,
        timeAgo: 'Justo ahora',
        createdTime: nowStr,
        origin: 'QR COMENSAL',
        status: 'por-validar',
        items: cartItems.map((c, idx) => ({
          id: `it-${Date.now()}-${idx}`,
          name: `${c.quantity}x ${c.item.name}`,
          quantity: c.quantity,
          price: c.item.price * c.quantity,
          notes: c.notes,
          station: c.item.category === 'bebidas' ? 'Barra' : 'Cocina'
        })),
        subtotal: totalCart,
        total: totalCart
      };

      // Update Floor Table Status
      const cleanNum = tableStr.replace(/\D/g, '');
      const updatedTables = tables.map((t) => {
        if (t.number === cleanNum || t.number === tableStr) {
          return {
            ...t,
            status: 'qr' as const,
            pax,
            amount: (t.amount || 0) + totalCart,
            timeActive: '0 min (QR)',
            dishesCount: `${kdsItems.length} platos`
          };
        }
        return t;
      });

      const updatedTickets = [newKdsTicket, ...tickets];
      const updatedOrders = [newDinerOrder, ...orders];

      setTickets(updatedTickets);
      setOrders(updatedOrders);
      setTables(updatedTables);
      setDinerActiveTicket(newDinerOrder);

      persistState(updatedTickets, updatedOrders, updatedTables, undefined, newDinerOrder);

      // Play chime sound
      kitchenAudio.playDispatchSound();

      // Cross-tab broadcast
      broadcastSync('NEW_ORDER', {
        ticket: newKdsTicket,
        order: newDinerOrder,
        tables: updatedTables
      });

      showToast(`¡Comanda #${orderNum} enviada a Cocina KDS desde ${tableStr}!`, 'soup_kitchen');
      return newDinerOrder;
    },
    [tickets, orders, tables, persistState, broadcastSync, showToast]
  );

  // 2. Check / Toggle Item Ready in KDS
  const updateTicketItem = useCallback(
    (ticketId: string, itemId: string, explicitChecked?: boolean) => {
      let isTicketAllReady = false;
      let targetTable = '';

      const updated = tickets.map((ticket) => {
        if (ticket.id !== ticketId) return ticket;
        targetTable = ticket.table;
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

      if (isTicketAllReady && targetTable) {
        showToast(`Todos los platos listos para ${targetTable}`, 'done_all');
      }
    },
    [tickets, persistState, broadcastSync, showToast]
  );

  // 3. Start Prep
  const startTicketPrep = useCallback(
    (ticketId: string) => {
      let targetTable = '';
      const updated = tickets.map((t) => {
        if (t.id === ticketId) {
          targetTable = t.table;
          return { ...t, status: 'en_fuego' as const };
        }
        return t;
      });

      // Update diner ticket status to 'en-cocina'
      if (dinerActiveTicket && (dinerActiveTicket.table === targetTable || targetTable.includes(dinerActiveTicket.table))) {
        const updatedDiner: OrderTicket = { ...dinerActiveTicket, status: 'en-cocina' };
        setDinerActiveTicket(updatedDiner);
        persistState(updated, undefined, undefined, undefined, updatedDiner);
        broadcastSync('DINER_STATUS_UPDATE', { ticket: updatedDiner });
      } else {
        persistState(updated);
      }

      setTickets(updated);
      kitchenAudio.playCheckItemSound();
      broadcastSync('UPDATE_TICKETS', { tickets: updated });
      showToast(`Comanda de ${targetTable || 'orden'} iniciada en fuego`, 'local_fire_department');
    },
    [tickets, dinerActiveTicket, persistState, broadcastSync, showToast]
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

      // Update matching order in Central de Pedidos to 'pase-listo'
      const cleanTable = ticketToDispatch.table;
      const updatedOrders = orders.map((o) => {
        if (o.table.toUpperCase() === cleanTable.toUpperCase()) {
          return { ...o, status: 'pase-listo' as const };
        }
        return o;
      });

      // Update table in Floor Plan to show 'cuenta' (ready for service/billing)
      const cleanNum = cleanTable.replace(/\D/g, '');
      const updatedTables = tables.map((tbl) => {
        if (tbl.number === cleanNum || tbl.number === cleanTable) {
          return { ...tbl, status: 'cuenta' as const };
        }
        return tbl;
      });

      // If diner has this ticket active, update status to 'pase-listo'
      let updatedDiner = dinerActiveTicket;
      if (dinerActiveTicket && (dinerActiveTicket.table === cleanTable || cleanTable.includes(dinerActiveTicket.table))) {
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

      kitchenAudio.playAllergyWarning();
      broadcastSync('PRIORITIZE_TABLE', { tableNumber, tickets: updatedTickets });
      showToast(`¡Prioridad urgente transmitida a Cocina para Mesa ${tableNumber}!`, 'priority_high');
    },
    [tickets, tables, persistState, broadcastSync, showToast]
  );

  // 7. Collect Table Bill and Free Table (Corte / Cobro)
  const collectTableBill = useCallback(
    (tableNumber: string, amount?: number) => {
      const cleanNum = tableNumber.replace(/\D/g, '');
      const billAmount = amount || 165.00;

      // Mark table as free
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

      // Archive tickets for this table
      const updatedTickets = tickets.map((t) => {
        const ticketNum = t.table.replace(/\D/g, '');
        if (ticketNum === cleanNum || t.table.includes(tableNumber)) {
          return { ...t, status: 'archivada' as const };
        }
        return t;
      });

      // If this was diner's active ticket, clear it
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

      kitchenAudio.playDispatchSound();
      broadcastSync('UPDATE_TABLES', { tables: updatedTables });
      broadcastSync('UPDATE_TICKETS', { tickets: updatedTickets });
      showToast(`Cobro liquidado para Mesa ${tableNumber}: S/ ${billAmount.toFixed(2)}. Mesa liberada.`, 'point_of_sale');
    },
    [tables, tickets, dinerActiveTicket, totalShiftRevenue, persistState, broadcastSync, showToast]
  );

  // 8. Open Table in Floor Plan
  const openTable = useCallback(
    (tableNumber: string, pax = 2, waiter = 'Valeria P.') => {
      const cleanNum = tableNumber.replace(/\D/g, '');
      const updatedTables = tables.map((tbl) => {
        if (tbl.number === cleanNum || tbl.number === tableNumber) {
          return {
            ...tbl,
            status: 'comiendo' as const,
            pax,
            waiter,
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
      const updated = runners.map((r) => {
        if (r.id === runnerId) {
          return {
            ...r,
            status,
            currentTable: table,
            location: status === 'Libre en Pase' ? 'Libre en Pase' : table || 'En Mesa'
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
  const resetAllDemoData = useCallback(() => {
    setTickets(INITIAL_TICKETS);
    setOrders(INITIAL_ORDERS);
    setTables(INITIAL_TABLES);
    setRunners(INITIAL_RUNNERS);
    setTotalShiftRevenue(4215.00);
    setDinerActiveTicket(null);
    localStorage.removeItem(STORAGE_KEY_TICKETS);
    localStorage.removeItem(STORAGE_KEY_ORDERS);
    localStorage.removeItem(STORAGE_KEY_TABLES);
    localStorage.removeItem(STORAGE_KEY_REVENUE);
    localStorage.removeItem(STORAGE_KEY_DINER);
    kitchenAudio.playDispatchSound();
    showToast('Datos de demostración restablecidos', 'restart_alt');
  }, [showToast]);

  // 14. Simulate New Incoming Order
  const simulateNewOrder = useCallback(() => {
    const item = INITIAL_MENU_ITEMS[Math.floor(Math.random() * INITIAL_MENU_ITEMS.length)];
    const tableNum = Math.floor(Math.random() * 12) + 1;
    sendOrderFromMenu(`MESA ${tableNum.toString().padStart(2, '0')}`, [{ item, quantity: 1 }], 2);
  }, [sendOrderFromMenu]);

  // 15. Create New Manual Ticket in KDS
  const createNewKdsTicket = useCallback(
    (ticket: Ticket) => {
      const updated = [ticket, ...tickets];
      setTickets(updated);
      persistState(updated);
      kitchenAudio.playDispatchSound();
      broadcastSync('UPDATE_TICKETS', { tickets: updated });
      showToast(`Comanda #${ticket.orderNumber} creada en KDS`, 'add_circle');
    },
    [tickets, persistState, broadcastSync, showToast]
  );

  return (
    <RestaurantContext.Provider
      value={{
        tickets,
        setTickets,
        orders,
        tables,
        runners,
        setRunners,
        totalShiftRevenue,
        kitchenPaused,
        toast,
        dinerActiveTicket,
        audioEnabled,
        sendOrderFromMenu,
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
        createNewKdsTicket
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
