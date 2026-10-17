import React, { useState } from 'react';
import { OrderTicket } from '../types';
import { OrderPaymentFilters } from '@/components/OrderPaymentFilters';
import { filterOrdersByPayment, paymentFilterCounts, orderPaymentStatus, type PaymentFilter } from '@/features/orders/paymentFilter';

interface OrdersCentralProps {
  orders: OrderTicket[];
  paymentHistoryLoading?: boolean;
  paymentHistoryError?: boolean;
  onUpdateOrderStatus: (id: string, newStatus: OrderTicket['status']) => void;
  onShowToast: (msg: string, icon?: string) => void;
  onOpenKitchenNoteModal?: (orderId: string) => void;
  onAddOrderNote?: (orderId: string, note: string) => void;
  /** Confirmar (true) o rechazar (false) el pago Yape/Plin declarado por la mesa. */
  onReviewPayment?: (table: string, approve: boolean) => Promise<void>;
}

export const OrdersCentral: React.FC<OrdersCentralProps> = ({
  orders,
  onUpdateOrderStatus,
  onShowToast,
  onAddOrderNote,
  onReviewPayment,
  paymentHistoryLoading = false,
  paymentHistoryError = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('cmd-0482');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccessAlert, setPrintSuccessAlert] = useState(false);
  const [activeStationFilter, setActiveStationFilter] = useState<'all' | 'parrilla' | 'wok' | 'barra'>('all');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [activePaymentFilter, setActivePaymentFilter] = useState<PaymentFilter>('all');

  const matchingOrders = orders.filter((o) => {
    const matchesSearch =
      o.table.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (activeStationFilter === 'all') return true;
    if (activeStationFilter === 'parrilla') {
      return o.items.some((i) => i.station?.toLowerCase().includes('parrilla') || o.stationTarget?.toLowerCase().includes('parrilla'));
    }
    if (activeStationFilter === 'wok') {
      return o.items.some((i) => i.station?.toLowerCase().includes('wok') || o.stationTarget?.toLowerCase().includes('wok'));
    }
    if (activeStationFilter === 'barra') {
      return o.items.some((i) => i.station?.toLowerCase().includes('bar') || o.stationTarget?.toLowerCase().includes('bar'));
    }
    return true;
  });
  const paymentCounts = paymentFilterCounts(matchingOrders);
  const filteredOrders = filterOrdersByPayment(matchingOrders, activePaymentFilter);

  const porValidar = filteredOrders.filter((o) => o.status === 'por-validar' && orderPaymentStatus(o) === 'pending');
  const enCocina = filteredOrders.filter((o) => o.status === 'en-cocina' && orderPaymentStatus(o) === 'pending');
  const paseListo = filteredOrders.filter((o) => o.status === 'pase-listo' && orderPaymentStatus(o) === 'pending');
  const closedOrDining = filteredOrders.filter(o => o.status === 'entregado' || orderPaymentStatus(o) === 'paid');

  // Contadores por partida / estación para feedback operacional en vivo
  const activeOrders = orders.filter((o) =>
    orderPaymentStatus(o) === 'pending' && (o.status === 'por-validar' || o.status === 'en-cocina' || o.status === 'pase-listo')
  );
  const countAll = activeOrders.length;
  const countParrilla = activeOrders.filter((o) =>
    o.items.some((i) => i.station?.toLowerCase().includes('parrilla') || o.stationTarget?.toLowerCase().includes('parrilla'))
  ).length;
  const countWok = activeOrders.filter((o) =>
    o.items.some((i) => i.station?.toLowerCase().includes('wok') || o.stationTarget?.toLowerCase().includes('wok'))
  ).length;
  const countBarra = activeOrders.filter((o) =>
    o.items.some((i) => i.station?.toLowerCase().includes('bar') || o.stationTarget?.toLowerCase().includes('bar'))
  ).length;

  const activeTicket = filteredOrders.find(o => o.id === selectedTicketId) || filteredOrders[0];

  const handleTestPrint = () => {
    if (!activeTicket) return;
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccessAlert(true);
      onShowToast(`Ticket ${activeTicket.table} enviado a comandera térmica 80mm`, 'print');
      setTimeout(() => {
        setPrintSuccessAlert(false);
      }, 3500);
    }, 450);
  };

  const handleOpenAddNote = () => {
    setNoteInput('');
    setIsNoteModalOpen(true);
  };

  const handleSaveKitchenNote = (presetNote?: string) => {
    if (!activeTicket || orderPaymentStatus(activeTicket) === 'paid') return;
    const finalNote = (presetNote || noteInput).trim();
    if (!finalNote) return;

    if (onAddOrderNote) {
      onAddOrderNote(activeTicket.id, finalNote);
    }
    onShowToast(`Nota agregada a comanda ${activeTicket.table}: "${finalNote}"`, 'edit_note');
    setIsNoteModalOpen(false);
    setNoteInput('');
  };

  return (
    <div className="w-full flex flex-col px-4 lg:px-6 py-4 max-w-[1680px] mx-auto">
      {/* Live Operational Telemetry Bar */}
      <section className="w-full pt-1 pb-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 border-b border-[#353437]/40 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#1c1b1d] px-3 py-1.5 rounded-lg border border-[#353437]/30 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5708] animate-ping" />
            <span className="font-label-code text-[12px] text-[#e5e1e4] tracking-wider uppercase font-bold">
              En Vivo: {countAll} Comandas Activas
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1b1d] rounded-lg border border-[#353437]/30">
            <span className="material-symbols-outlined text-[#c6c5cf] text-[18px]">avg_pace</span>
            <span className="text-[13px] text-[#c6c5cf]">T. Medio Servicio:</span>
            <span className="font-label-code text-[13px] text-[#a1c9ff] font-bold">11.8 min</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1b1d] rounded-lg border border-[#353437]/30">
            <span className="material-symbols-outlined text-[#c6c5cf] text-[18px]">payments</span>
            <span className="text-[13px] text-[#c6c5cf]">Facturación Turno:</span>
            <span className="font-label-code text-[13px] text-[#ff5708] font-bold">
              S/ {(4215 + orders.filter(o => orderPaymentStatus(o) === 'pending').reduce((sum, o) => sum + o.total, 0)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
          </div>

          
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2 w-full xl:w-auto justify-start xl:justify-end">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#c6c5cf] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar mesa, comanda o ítem..."
              className="w-full bg-[#1c1b1d] text-[#e5e1e4] pl-9 pr-3 py-1.5 rounded-lg text-[13px] placeholder:text-[#c6c5cf]/60 focus:outline-none focus:ring-1 focus:ring-[#ff5708] border border-[#353437]/40 transition-all"
            />
          </div>

          {/* Station filter pills con contexto claro */}
          <div className="flex items-center gap-1.5 bg-[#1c1b1d] p-1 rounded-lg border border-[#353437]/30">
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-[#c6c5cf] px-1.5 font-medium select-none">
              <span className="material-symbols-outlined text-[15px] text-[#ff5708]">restaurant</span>
              <span>Partida:</span>
            </span>
            <button
              onClick={() => setActiveStationFilter('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-label-code transition-all cursor-pointer flex items-center gap-1 ${
                activeStationFilter === 'all'
                  ? 'bg-[#ff5708] text-[#511500] font-bold shadow-md'
                  : 'text-[#c6c5cf] hover:text-white hover:bg-[#2a2a2c]'
              }`}
              title="Ver todas las comandas de todas las partidas de cocina"
            >
              <span>Todas</span>
              <span className={`text-[10px] px-1 rounded-full font-bold ${
                activeStationFilter === 'all' ? 'bg-[#511500]/25 text-[#511500]' : 'bg-[#2a2a2c] text-[#a1a1aa]'
              }`}>
                {countAll}
              </span>
            </button>
            <button
              onClick={() => setActiveStationFilter('parrilla')}
              className={`px-2.5 py-1 rounded text-[11px] font-label-code transition-all cursor-pointer flex items-center gap-1 ${
                activeStationFilter === 'parrilla'
                  ? 'bg-[#ff5708] text-[#511500] font-bold shadow-md'
                  : 'text-[#c6c5cf] hover:text-white hover:bg-[#2a2a2c]'
              }`}
              title="Filtrar platos y carnes de la estación Parrilla & Carbón"
            >
              <span>Parrilla</span>
              <span className={`text-[10px] px-1 rounded-full font-bold ${
                activeStationFilter === 'parrilla' ? 'bg-[#511500]/25 text-[#511500]' : 'bg-[#2a2a2c] text-[#a1a1aa]'
              }`}>
                {countParrilla}
              </span>
            </button>
            <button
              onClick={() => setActiveStationFilter('wok')}
              className={`px-2.5 py-1 rounded text-[11px] font-label-code transition-all cursor-pointer flex items-center gap-1 ${
                activeStationFilter === 'wok'
                  ? 'bg-[#ff5708] text-[#511500] font-bold shadow-md'
                  : 'text-[#c6c5cf] hover:text-white hover:bg-[#2a2a2c]'
              }`}
              title="Filtrar salteados y arroces de la estación Wok & Sauté"
            >
              <span>Wok</span>
              <span className={`text-[10px] px-1 rounded-full font-bold ${
                activeStationFilter === 'wok' ? 'bg-[#511500]/25 text-[#511500]' : 'bg-[#2a2a2c] text-[#a1a1aa]'
              }`}>
                {countWok}
              </span>
            </button>
            <button
              onClick={() => setActiveStationFilter('barra')}
              className={`px-2.5 py-1 rounded text-[11px] font-label-code transition-all cursor-pointer flex items-center gap-1 ${
                activeStationFilter === 'barra'
                  ? 'bg-[#ff5708] text-[#511500] font-bold shadow-md'
                  : 'text-[#c6c5cf] hover:text-white hover:bg-[#2a2a2c]'
              }`}
              title="Filtrar bebidas, coctelería y vinos de Barra"
            >
              <span>Barra</span>
              <span className={`text-[10px] px-1 rounded-full font-bold ${
                activeStationFilter === 'barra' ? 'bg-[#511500]/25 text-[#511500]' : 'bg-[#2a2a2c] text-[#a1a1aa]'
              }`}>
                {countBarra}
              </span>
            </button>
          </div>
        </div>
      </section>

      <OrderPaymentFilters value={activePaymentFilter} counts={paymentCounts} onChange={value => {
        setActivePaymentFilter(value); setIsNoteModalOpen(false);
      }} />
      {paymentHistoryLoading && <p role="status" className="text-[12px] text-[#c6c5cf] mb-3">Cargando cuentas cobradas…</p>}
      {paymentHistoryError && <p role="status" className="text-[12px] text-[#ffb59c] mb-3">No se pudo actualizar el historial de cobros. Las comandas activas siguen disponibles.</p>}
      {filteredOrders.length === 0 && <p role="status" className="text-[13px] text-[#c6c5cf] mb-4">No hay comandas que coincidan con estos filtros.</p>}

      {/* Main Kanban Grid + ESC/POS Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Kanban Board Columns (1 to 9) */}
        <div className="lg:col-span-8 xl:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {activeStationFilter !== 'all' && filteredOrders.length === 0 && (
            <div className="md:col-span-3 p-4 bg-[#1c1b1d] rounded-xl border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px] text-[#e5e1e4]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-[20px]">info</span>
                <span>
                  No hay comandas para la partida <strong className="text-[#ff5708] capitalize">{activeStationFilter}</strong> con el estado de cuenta seleccionado.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveStationFilter('all')}
                className="px-3 py-1.5 bg-[#ff5708] hover:brightness-110 text-[#511500] font-bold rounded-lg text-[12px] cursor-pointer transition-all shadow"
              >
                Ver Todas las Comandas ({orders.length})
              </button>
            </div>
          )}
          {activePaymentFilter !== 'paid' && <>
          {/* COLUMN 1: POR VALIDAR */}
          <section className="flex flex-col bg-[#0e0e10] rounded-xl p-2.5 gap-3 border border-[#2a2a2c]">
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#1c1b1d] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ff5708]" />
                <span className="font-label-code text-[11px] uppercase tracking-wider text-[#e5e1e4] font-bold">
                  1. Por Validar
                </span>
              </div>
              <span className="font-label-code text-[11px] text-[#ff5708] bg-[#ff5708]/20 px-2 py-0.5 rounded font-bold">
                {porValidar.length} PND
              </span>
            </div>

            {porValidar.length === 0 ? (
              <div className="p-6 text-center text-[#c6c5cf] text-[13px] italic bg-[#1c1b1d]/40 rounded-lg">
                No hay comandas pendientes de validación
              </div>
            ) : (
              porValidar.map((ticket) => (
                <article
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`flex flex-col bg-[#201f22] p-3.5 rounded-xl transition-all shadow-md relative overflow-hidden group cursor-pointer border ${
                    selectedTicketId === ticket.id
                      ? 'border-[#ff5708] ring-1 ring-[#ff5708]/50 shadow-[0_0_20px_-4px_rgba(255,87,8,0.25)]'
                      : 'border-[#353437]/30 hover:border-[#ffb59c]/50'
                  }`}
                >
                  <div className="flex items-start justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] font-bold text-[#e5e1e4]">{ticket.table}</span>
                      <span className="bg-[#2a2a2c] text-[#a1c9ff] px-1.5 py-0.5 rounded font-label-code text-[10px]">
                        {ticket.origin}
                      </span>
                    </div>
                    <span className="font-label-code text-[11px] text-[#ff5708] bg-[#0e0e10] px-1.5 py-0.5 rounded font-bold">
                      {ticket.timeAgo}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2 text-[12px] text-[#c6c5cf]">
                    <span>Pax: {ticket.pax}</span>
                    <span>•</span>
                    <span className="font-label-code text-[11px] text-[#e5beb2] font-bold">CMD #{ticket.id.replace('cmd-', '')}</span>
                  </div>

                  {/* Dishes Ordered */}
                  <div className="space-y-1 bg-[#1c1b1d] p-2 rounded-lg my-1 text-[13px]">
                    {ticket.items.map((it) => (
                      <div key={it.id} className="flex justify-between items-baseline gap-2">
                        <span className="text-[#e5e1e4] font-medium truncate">{it.name}</span>
                        {it.notes && (
                          <span className="font-label-code text-[10px] text-[#c6c5cf] shrink-0">{it.notes}</span>
                        )}
                        {it.allergen && (
                          <span className="bg-[#93000a] text-[#ffdad6] px-1 rounded font-label-code text-[9px] uppercase font-bold shrink-0">
                            {it.allergen}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Price & Actions */}
                  <div className="pt-2 flex items-center justify-between mt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#c6c5cf] uppercase tracking-wider font-label-code">Subtotal</span>
                      <span className="font-label-code text-[16px] text-[#e5e1e4] font-bold">
                        S/ {ticket.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicketId(ticket.id);
                          onShowToast(`Abriendo comanda ${ticket.table} para edición`, 'edit');
                        }}
                        className="px-2.5 py-1.5 bg-[#2a2a2c] hover:bg-[#353437] text-[#e5e1e4] rounded-lg text-[12px] font-medium transition-colors cursor-pointer"
                      >
                        Modificar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateOrderStatus(ticket.id, 'en-cocina');
                          onShowToast(`Comanda ${ticket.table} enviada a cocina KDS`, 'check_circle');
                        }}
                        className="px-3 py-1.5 bg-[#ff5708] hover:brightness-110 text-[#511500] font-bold rounded-lg text-[12px] shadow-sm transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Aceptar</span>
                        <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>

          {/* COLUMN 2: EN COCINA */}
          <section className="flex flex-col bg-[#0e0e10] rounded-xl p-2.5 gap-3 border border-[#2a2a2c]">
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#1c1b1d] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#a1c9ff]" />
                <span className="font-label-code text-[11px] uppercase tracking-wider text-[#e5e1e4] font-bold">
                  2. En Cocina
                </span>
              </div>
              <span className="font-label-code text-[11px] text-[#a1c9ff] bg-[#2a2a2c] px-2 py-0.5 rounded font-bold">
                {enCocina.length} PROC
              </span>
            </div>

            {enCocina.length === 0 ? (
              <div className="p-6 text-center text-[#c6c5cf] text-[13px] italic bg-[#1c1b1d]/40 rounded-lg">
                No hay comandas en preparación
              </div>
            ) : (
              enCocina.map((ticket) => (
                <article
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`flex flex-col bg-[#201f22] p-3.5 rounded-xl transition-all shadow-md relative overflow-hidden group cursor-pointer border ${
                    ticket.isCritical
                      ? 'border-[#ffb4ab]/60 bg-gradient-to-r from-[#93000a]/20 to-[#201f22]'
                      : selectedTicketId === ticket.id
                      ? 'border-[#ff5708] ring-1 ring-[#ff5708]/50'
                      : 'border-[#353437]/30 hover:border-[#ffb59c]/50'
                  }`}
                >
                  {ticket.isCritical && (
                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#ff5708]" />
                  )}

                  <div className="flex items-start justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] font-bold text-[#e5e1e4]">{ticket.table}</span>
                      {ticket.isCritical && (
                        <span className="bg-[#93000a] text-[#ffdad6] px-1.5 py-0.5 rounded font-label-code text-[10px] uppercase font-bold animate-pulse">
                          Demora Crítica
                        </span>
                      )}
                      {!ticket.isCritical && (
                        <span className="bg-[#2a2a2c] text-[#c6c5cf] px-1.5 py-0.5 rounded font-label-code text-[10px]">
                          {ticket.stationTarget || 'ESTACIÓN KDS'}
                        </span>
                      )}
                    </div>
                    <span
                      className={`font-label-code text-[11px] px-1.5 py-0.5 rounded font-bold ${
                        ticket.isCritical ? 'text-[#ffb4ab] bg-[#93000a]' : 'text-[#c6c5cf] bg-[#0e0e10]'
                      }`}
                    >
                      {ticket.timeAgo}
                    </span>
                  </div>

                  <div className="mb-1 text-[12px] text-[#c6c5cf] flex items-center justify-between">
                    <span>Mesero: {ticket.waiter || 'General'}</span>
                    <span className="font-label-code text-[10px] text-[#a1c9ff]">
                      {ticket.stationTarget}
                    </span>
                  </div>

                  <div className="space-y-1 bg-[#1c1b1d] p-2 rounded-lg my-1 text-[13px]">
                    {ticket.items.map((it) => (
                      <div key={it.id} className="flex justify-between items-baseline gap-2">
                        <span className="text-[#e5e1e4] font-medium truncate">{it.name}</span>
                        <span className="text-[#c6c5cf] font-label-code text-[10px] shrink-0">{it.station || 'Cocina'}</span>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-1 space-y-1">
                    <div className="flex justify-between items-center font-label-code text-[10px] text-[#c6c5cf]">
                      <span>ESTADO PREPARACIÓN</span>
                      <span className={ticket.isCritical ? 'text-[#ffb4ab] font-bold' : 'text-[#a1c9ff] font-bold'}>
                        {ticket.preparationPercent || 40}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#2a2a2c] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ticket.isCritical ? 'bg-[#ff5708]' : 'bg-[#0494fc]'
                        }`}
                        style={{ width: `${ticket.preparationPercent || 40}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex items-center gap-2">
                    {ticket.isCritical ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowToast(`Prioridad urgente enviada a estación Parrilla & Sauté para ${ticket.table}`, 'priority_high');
                        }}
                        className="flex-1 py-1.5 bg-[#93000a] hover:bg-[#ff5708] hover:text-[#511500] text-white font-bold rounded-lg text-[12px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">priority_high</span>
                        <span>Priorizar en Pase</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateOrderStatus(ticket.id, 'pase-listo');
                        onShowToast(`Comanda ${ticket.table} lista en pase de despacho`, 'notifications_active');
                      }}
                      className="flex-1 py-1.5 bg-[#2a2a2c] hover:bg-[#ff5708] hover:text-[#511500] text-[#e5e1e4] font-bold rounded-lg text-[12px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">done</span>
                      <span>Marcar Listo</span>
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>

          {/* COLUMN 3: PASE LISTO */}
          <section className="flex flex-col bg-[#0e0e10] rounded-xl p-2.5 gap-3 border border-[#2a2a2c]">
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#1c1b1d] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c6c5cf]" />
                <span className="font-label-code text-[11px] uppercase tracking-wider text-[#e5e1e4] font-bold">
                  3. Pase Listo
                </span>
              </div>
              <span className="font-label-code text-[11px] text-[#e5e1e4] bg-[#2a2a2c] px-2 py-0.5 rounded font-bold">
                {paseListo.length} LISTOS
              </span>
            </div>

            {paseListo.length === 0 ? (
              <div className="p-6 text-center text-[#c6c5cf] text-[13px] italic bg-[#1c1b1d]/40 rounded-lg">
                No hay platos listos pendientes de entrega
              </div>
            ) : (
              paseListo.map((ticket) => (
                <article
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`flex flex-col bg-[#201f22] p-3.5 rounded-xl transition-all shadow-md relative overflow-hidden group cursor-pointer border ${
                    selectedTicketId === ticket.id
                      ? 'border-[#ff5708] ring-1 ring-[#ff5708]/50'
                      : 'border-[#353437]/30 hover:border-[#ffb59c]/50'
                  }`}
                >
                  <div className="flex items-start justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] font-bold text-[#e5e1e4]">{ticket.table}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-label-code text-[10px] font-bold ${
                          ticket.accountRequested
                            ? 'bg-[#ff5708] text-[#511500]'
                            : 'bg-[#2a2a2c] text-[#e5e1e4]'
                        }`}
                      >
                        {ticket.accountRequested ? 'CUENTA SOLICITADA' : 'PASE COMPLETADO'}
                      </span>
                    </div>
                    <span className="font-label-code text-[11px] text-[#ffb59c] bg-[#0e0e10] px-1.5 py-0.5 rounded font-bold">
                      {ticket.timeAgo}
                    </span>
                  </div>

                  {ticket.runnerAssigned && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-[#c6c5cf] text-[12px]">
                      <span className="material-symbols-outlined text-[15px] text-[#ff5708]">person_pin_circle</span>
                      <span>Runner Asignado: <strong className="text-[#e5e1e4]">{ticket.runnerAssigned}</strong></span>
                    </div>
                  )}

                  {ticket.accountRequested && (
                    <div className="space-y-1 bg-[#1c1b1d] p-2 rounded-lg my-1 text-[13px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] text-[#c6c5cf]">Método:</span>
                        <span className="font-label-code text-[12px] text-[#e5e1e4] font-semibold">{ticket.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] text-[#c6c5cf]">Importe Neto:</span>
                        <span className="font-label-code text-[16px] text-[#ff5708] font-bold">
                          S/ {ticket.total.toFixed(2)}
                        </span>
                      </div>
                      {ticket.paymentVerification === 'pending_verification' && (
                        <div className="mt-1.5 p-2 rounded-lg border border-amber-500/60 bg-amber-950/40 space-y-2" role="status">
                          <div className="flex items-center gap-1.5 text-amber-200 text-[12px] font-bold">
                            <span className="material-symbols-outlined text-[16px] text-amber-400">hourglass_top</span>
                            <span>PAGO POR VERIFICAR</span>
                          </div>
                          <p className="text-[11px] text-amber-100/90 leading-snug">
                            Revisa en tu app de Yape/Plin que llegó el pago
                            {ticket.paymentReference ? <> con la operación <strong className="font-label-code">{ticket.paymentReference}</strong></> : ' (sin código: pide el voucher)'}.
                          </p>
                          {onReviewPayment && (
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void onReviewPayment(ticket.table, true);
                                }}
                                className="py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Confirmar recibido
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void onReviewPayment(ticket.table, false);
                                }}
                                className="py-1.5 rounded-md bg-[#2a2a2c] hover:bg-[#353437] text-red-300 text-[11px] font-bold cursor-pointer border border-red-500/40"
                              >
                                No llegó
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {ticket.paymentVerification === 'verified' && (
                        <div className="mt-1 flex items-center gap-1.5 text-emerald-300 text-[11px] font-bold">
                          <span className="material-symbols-outlined text-[15px]">verified</span>
                          <span>Pago digital verificado{ticket.paymentReference ? ` · OP ${ticket.paymentReference}` : ''}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {ticket.paymentVerification === 'rejected' && !ticket.accountRequested && (
                    <div className="my-1 flex items-center gap-1.5 text-red-300 text-[11px] font-bold" role="status">
                      <span className="material-symbols-outlined text-[15px]">error</span>
                      <span>Pago digital rechazado: la mesa debe volver a pagar</span>
                    </div>
                  )}

                  {!ticket.accountRequested && (
                    <div className="space-y-1 bg-[#1c1b1d] p-2 rounded-lg my-1 text-[13px]">
                      {ticket.items.map((it) => (
                        <div key={it.id} className="flex justify-between items-baseline gap-2">
                          <span className="text-[#e5e1e4] font-medium truncate">{it.name}</span>
                          <span className="text-[#c6c5cf] font-label-code text-[10px] shrink-0">{it.station || 'Campana'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    {ticket.accountRequested ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateOrderStatus(ticket.id, 'entregado');
                          onShowToast(`Comprobante emitido y ${ticket.table} liberada`, 'receipt_long');
                        }}
                        className="w-full py-2 bg-[#ff5708] hover:brightness-110 text-[#511500] font-bold rounded-lg text-[13px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        <span className="material-symbols-outlined text-[17px]">receipt_long</span>
                        <span>Comprobante Emitido</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateOrderStatus(ticket.id, 'entregado');
                          onShowToast(`Platos entregados a mesa ${ticket.table}`, 'done_all');
                        }}
                        className="w-full py-2 bg-[#2a2a2c] hover:bg-[#353437] text-[#e5e1e4] font-bold rounded-lg text-[13px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[17px] text-[#a1c9ff]">done_all</span>
                        <span>Marcar Entregado a Mesa</span>
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </section>
          </>}
          {closedOrDining.length > 0 && (
            <section aria-label="Comandas en consumo o finalizadas" className="md:col-span-3 space-y-2">
              <h3 className="font-label-code text-[12px] text-[#c6c5cf] uppercase tracking-wider mb-2">
                {activePaymentFilter === 'paid' ? 'Cobradas / Finalizadas' : 'En consumo / Finalizadas'}
              </h3>
              {closedOrDining.map(ticket => (
                <button key={ticket.id} type="button" onClick={() => setSelectedTicketId(ticket.id)}
                  aria-label={`Ver comanda ${ticket.id}, ${ticket.table}, ${orderPaymentStatus(ticket) === 'paid' ? 'cobrada' : 'por cobrar'}`}
                  className={`w-full flex flex-wrap items-center justify-between gap-2 py-3 px-2 text-left bg-transparent border-b cursor-pointer ${activeTicket?.id === ticket.id ? 'border-[#ff5708]' : 'border-[#353437]/40'}`}>
                  <span className="text-[13px] text-[#e5e1e4] font-semibold">{ticket.table} · {ticket.id}</span>
                  <span className="text-[12px] text-[#c6c5cf]">{ticket.createdTime} · {ticket.items.reduce((sum, item) => sum + item.quantity, 0)} platos</span>
                  <span className="text-[12px] text-[#ffb59c]">{orderPaymentStatus(ticket) === 'paid' ? 'Cobrada' : 'Por cobrar · En consumo'}</span>
                  <span className="font-label-code text-[13px]">S/ {ticket.total.toFixed(2)}</span>
                </button>
              ))}
            </section>
          )}
        </div>

        {/* Right Sidebar: ESC/POS Thermal Live Inspector & Station Load (10 to 12) */}
        {activeTicket && <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 sticky top-20">
          {/* Thermal Ticket Viewer Card */}
          <div className="bg-[#201f22] p-4 rounded-xl shadow-xl flex flex-col border border-[#353437]/40">
            <div className="flex items-center justify-between pb-2 border-b border-[#353437]/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff5708] text-[18px]">receipt</span>
                <span className="font-label-code text-[11px] uppercase tracking-wider text-[#e5e1e4] font-bold">
                  Inspección de Ticket
                </span>
              </div>
              <span className="font-label-code text-[10px] text-[#c6c5cf] bg-[#0e0e10] px-1.5 py-0.5 rounded">
                ID: #{activeTicket.id.replace('cmd-', '')}
              </span>
            </div>

            {/* Simulated ESC/POS Thermal Receipt Paper */}
            <div
              className={`mt-3 bg-[#fafafa] text-neutral-900 p-4 rounded-lg font-label-code text-[11px] leading-[15px] shadow-lg transition-transform border border-neutral-300 ${
                isPrinting ? 'scale-95 brightness-90 opacity-70' : 'scale-100'
              }`}
            >
              <div className="text-center font-bold pb-2 border-b border-dashed border-neutral-400">
                <p className="text-[13px] tracking-tight">=== AUREA BISTRO ===</p>
                <p className="text-[10px] text-neutral-600 font-normal">RUC: 20601239841</p>
                <p className="text-[10px] text-neutral-600 font-normal">MIRAFLORES, LIMA - SALÓN 1</p>
              </div>

              <div className="py-1.5 flex justify-between text-[10px] text-neutral-600 border-b border-dashed border-neutral-400 font-medium">
                <span>MESA: {activeTicket.table.replace('MESA ', '')} (PAX {activeTicket.pax})</span>
                <span>{activeTicket.createdTime || '20:42:15'}</span>
              </div>

              {/* Line items */}
              <div className="py-2 space-y-1.5 border-b border-dashed border-neutral-400">
                {activeTicket.items.map((it) => (
                  <div key={it.id} className="flex flex-col">
                    <div className="flex justify-between items-start font-bold">
                      <span className="truncate max-w-[160px]">{it.name}</span>
                      <span className="shrink-0">S/ {it.price.toFixed(2)}</span>
                    </div>
                    {it.notes && <p className="text-[9px] text-neutral-600 pl-2">- {it.notes}</p>}
                    {it.allergen && (
                      <p className="text-[9px] bg-red-100 text-red-700 px-1 rounded font-bold inline-block self-start mt-0.5">
                        [!] {it.allergen}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Math breakdown */}
              <div className="pt-2 space-y-0.5 text-[10px]">
                <div className="flex justify-between text-neutral-600">
                  <span>OP. GRAVADA (IGV 18%):</span>
                  <span>S/ {(activeTicket.total / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>IGV (18%):</span>
                  <span>S/ {(activeTicket.total - activeTicket.total / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-900 font-bold text-[13px] pt-1 border-t border-neutral-300">
                  <span>TOTAL SOLES:</span>
                  <span className="text-[#ff5708]">S/ {activeTicket.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[9px] text-neutral-500 tracking-wider">
                *** COMANDA ENVIADA A KDS ESTACIÓN 01 ***
              </div>
            </div>

            {printSuccessAlert && (
              <div className="mt-2 p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-label-code text-[11px] text-center flex items-center justify-center gap-1.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>TICKET ENVIADO A 192.168.1.120:9100</span>
              </div>
            )}

            {/* ESC/POS Actions */}
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleTestPrint}
                className="w-full py-2 bg-[#2a2a2c] hover:bg-[#353437] text-[#e5e1e4] font-medium rounded-lg text-[13px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#353437]/40 active:scale-98"
              >
                <span className="material-symbols-outlined text-[17px] text-[#ff5708]">print</span>
                <span>Reimprimir ESC/POS (Térmica 80mm)</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddNote}
                disabled={orderPaymentStatus(activeTicket) === 'paid'}
                className="w-full py-2 bg-transparent hover:bg-[#1c1b1d] text-[#c6c5cf] hover:text-[#e5e1e4] font-medium rounded-lg text-[13px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#353437]/20"
              >
                <span className="material-symbols-outlined text-[17px]">edit_note</span>
                <span>Agregar Nota de Cocina</span>
              </button>
            </div>
          </div>

          {/* Station Load Telemetry Mini-Card */}
          <div className="bg-[#201f22] p-4 rounded-xl shadow-sm space-y-3 border border-[#353437]/40">
            <div className="flex items-center justify-between">
              <span className="font-label-code text-[11px] uppercase text-[#c6c5cf] font-bold">
                Carga en Estaciones
              </span>
              <span className="font-label-code text-[10px] text-[#a1c9ff] bg-[#0494fc]/15 px-1.5 py-0.5 rounded">
                TIEMPO REAL
              </span>
            </div>

            <div className="space-y-2.5 text-[13px]">
              <div>
                <div className="flex justify-between pb-1">
                  <span className="text-[#e5e1e4]">Parrilla & Carbón</span>
                  <span className="font-label-code text-[11px] text-[#ffb4ab] font-bold">88%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0e0e10] rounded-full overflow-hidden">
                  <div className="h-full bg-[#ff5708] rounded-full" style={{ width: '88%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between pb-1">
                  <span className="text-[#e5e1e4]">Wok / Sauté</span>
                  <span className="font-label-code text-[11px] text-[#ffb59c] font-bold">62%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0e0e10] rounded-full overflow-hidden">
                  <div className="h-full bg-[#ff5708]/80 rounded-full" style={{ width: '62%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between pb-1">
                  <span className="text-[#e5e1e4]">Barra / Mixología</span>
                  <span className="font-label-code text-[11px] text-[#a1c9ff] font-bold">34%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0e0e10] rounded-full overflow-hidden">
                  <div className="h-full bg-[#0494fc] rounded-full" style={{ width: '34%' }} />
                </div>
              </div>
            </div>
          </div>
        </aside>}
      </div>

      {/* MODAL NATIVO: AGREGAR NOTA ESPECIAL DE COCINA */}
      {isNoteModalOpen && activeTicket && orderPaymentStatus(activeTicket) === 'pending' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1c1b1d] border border-[#353437] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-[#201f22] border-b border-[#353437]/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#ff5708] text-[26px]">edit_note</span>
                <div>
                  <h3 className="text-[15px] font-bold text-[#e5e1e4]">Agregar Nota Especial a Cocina</h3>
                  <p className="text-[12px] text-[#c6c5cf]">
                    Comanda <strong className="text-[#ffb59c]">#{activeTicket.id.replace('cmd-', '')}</strong> • Mesa <strong className="text-[#ffb59c]">{activeTicket.table}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-[#2a2a2c] text-[#c6c5cf] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider font-label-code text-[#a1a1aa] font-bold block mb-2">
                  Atajos Rápidos de Cocina (1 clic):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Término 3/4',
                    'Término Medio',
                    'Bien Cocido',
                    'Alergia Severa (Sin Sésamo)',
                    'Sin Gluten / Celiaco',
                    'Urgente: Mesa con Prisa',
                    'Sin Sal / Bajo en Sodio',
                    'Plato de Niño (Servir Primero)',
                    'Servir Junto con Bebidas'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNoteInput((prev) => (prev ? `${prev} | ${preset}` : preset))}
                      className="px-2.5 py-1 bg-[#2a2a2c] hover:bg-[#353437] text-[#e5e1e4] hover:text-white rounded-lg text-[11px] font-medium border border-[#353437]/40 transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider font-label-code text-[#a1a1aa] font-bold block mb-1.5">
                  Instrucción Detallada para Jefe de Cocina / KDS:
                </label>
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Ej: El cliente solicita que el corte venga con salsa aparte y término exacto..."
                  rows={3}
                  className="w-full bg-[#121214] text-[#e5e1e4] p-3 rounded-xl border border-[#353437] text-[13px] placeholder:text-[#71717a] focus:outline-none focus:ring-1 focus:ring-[#ff5708] resize-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#201f22] border-t border-[#353437]/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="px-4 py-2 bg-[#2a2a2c] hover:bg-[#353437] text-[#c6c5cf] hover:text-white rounded-xl text-[13px] font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveKitchenNote()}
                disabled={!noteInput.trim()}
                className="px-5 py-2 bg-[#ff5708] hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none text-[#511500] font-bold rounded-xl text-[13px] flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-[#ff5708]/20"
              >
                <span className="material-symbols-outlined text-[17px]">check</span>
                <span>Guardar Nota en Comanda</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
