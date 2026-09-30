import React, { useState } from 'react';
import { Ticket } from '../types';
import { NewOrderModal } from './NewOrderModal';

interface CentralPedidosProps {
  tickets: Ticket[];
  onCreateTicket: (ticket: Ticket) => void;
  onOpenKDS: () => void;
}

export const CentralPedidos: React.FC<CentralPedidosProps> = ({
  tickets,
  onCreateTicket,
  onOpenKDS
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'en_fuego' | 'ingresada' | 'lista_despachada'>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.orderNumber.toString().includes(searchTerm) ||
      t.table.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.serverOrRunner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.items.some((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesZone = zoneFilter === 'all' || t.zone === zoneFilter;

    return matchesSearch && matchesStatus && matchesZone;
  });

  const totalSales = tickets.reduce((sum, t) => sum + t.totalAmount, 0);
  const avgTicket = tickets.length ? totalSales / tickets.length : 0;

  return (
    <div className="w-full max-w-full overflow-x-hidden p-3.5 sm:p-6 lg:p-8 max-w-[1920px] mx-auto space-y-4 sm:space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#18181b] p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[#27272a] shadow-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5708] animate-pulse shrink-0"></span>
            <span className="text-[11px] sm:text-[12px] font-mono-code uppercase tracking-wider text-[#ffb59c] font-bold truncate">
              Despacho de Sala & Delivery
            </span>
          </div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-white mt-1 font-sans tracking-tight">
            Central de Pedidos
          </h1>
          <p className="text-[13px] sm:text-[14px] text-[#a1a1aa] mt-0.5 leading-relaxed">
            Monitoreo unificado de comandas de salón, pedidos remotos y flujo hacia cocina
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
          <button
            onClick={onOpenKDS}
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-white font-mono-code text-[12px] sm:text-[13px] font-bold border border-[#3f3f46] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px] text-[#ff5708]">soup_kitchen</span>
            <span>Ver Cocina KDS</span>
          </button>
          <button
            onClick={() => setNewOrderModalOpen(true)}
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2.5 rounded-lg bg-[#ff5708] hover:bg-[#e04800] text-white font-mono-code text-[12px] sm:text-[13px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#ff5708]/20 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Nueva Comanda</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#18181b] border border-[#27272a]">
          <span className="text-[11px] font-mono-code uppercase text-[#a1a1aa] block font-bold">
            Comandas en Proceso
          </span>
          <div className="text-[24px] sm:text-[28px] font-mono-code font-bold text-white mt-1">
            {tickets.filter((t) => t.status !== 'lista_despachada').length}
          </div>
          <span className="text-[11px] text-[#ffb59c] font-mono-code">En preparación en KDS</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-[#18181b] border border-[#27272a]">
          <span className="text-[11px] font-mono-code uppercase text-[#a1a1aa] block font-bold">
            Facturación en Curso
          </span>
          <div className="text-[24px] sm:text-[28px] font-mono-code font-bold text-[#ffb59c] mt-1">
            S/ {totalSales.toFixed(2)}
          </div>
          <span className="text-[11px] text-[#a1a1aa] font-mono-code">{tickets.length} órdenes registradas</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-[#18181b] border border-[#27272a]">
          <span className="text-[11px] font-mono-code uppercase text-[#a1a1aa] block font-bold">
            Ticket Promedio
          </span>
          <div className="text-[24px] sm:text-[28px] font-mono-code font-bold text-emerald-400 mt-1">
            S/ {avgTicket.toFixed(2)}
          </div>
          <span className="text-[11px] text-[#a1a1aa] font-mono-code">Experiencia bistró</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-[#18181b] border border-[#27272a]">
          <span className="text-[11px] font-mono-code uppercase text-[#a1a1aa] block font-bold">
            Despachadas al Pase
          </span>
          <div className="text-[24px] sm:text-[28px] font-mono-code font-bold text-white mt-1">
            {tickets.filter((t) => t.status === 'lista_despachada').length}
          </div>
          <span className="text-[11px] text-emerald-400 font-mono-code">100% listas para runner</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#18181b] p-3.5 sm:p-4 rounded-xl border border-[#27272a]">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#71717a] text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por mesa, plato, mozo..."
            className="w-full bg-[#121215] border border-[#27272a] rounded-lg pl-9 pr-3 py-2 text-[13px] text-white placeholder-[#71717a] focus:border-[#ff5708] focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-full md:w-auto font-mono-code text-[11px] pb-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'all' ? 'bg-[#ff5708] text-white' : 'bg-[#121215] text-[#a1a1aa] hover:text-white'
            }`}
          >
            Todas ({tickets.length})
          </button>
          <button
            onClick={() => setStatusFilter('en_fuego')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'en_fuego' ? 'bg-[#ff5708] text-white' : 'bg-[#121215] text-[#a1a1aa] hover:text-white'
            }`}
          >
            En Fuego ({tickets.filter((t) => t.status === 'en_fuego').length})
          </button>
          <button
            onClick={() => setStatusFilter('ingresada')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'ingresada' ? 'bg-[#0494fc] text-white' : 'bg-[#121215] text-[#a1a1aa] hover:text-white'
            }`}
          >
            Ingresadas ({tickets.filter((t) => t.status === 'ingresada').length})
          </button>
          <button
            onClick={() => setStatusFilter('lista_despachada')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'lista_despachada' ? 'bg-emerald-600 text-white' : 'bg-[#121215] text-[#a1a1aa] hover:text-white'
            }`}
          >
            Despachadas ({tickets.filter((t) => t.status === 'lista_despachada').length})
          </button>
        </div>
      </div>

      {/* Orders Table / Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {filteredTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="p-4 sm:p-5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-all flex flex-col justify-between space-y-4"
          >
            {/* Card Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#27272a] text-[#ffb59c] font-mono-code text-[11px] font-bold shrink-0">
                    {ticket.table}
                  </span>
                  <span className="text-[12px] font-mono-code text-[#71717a] uppercase truncate">
                    {ticket.zone}
                  </span>
                </div>
                <h3 className="text-[16px] sm:text-[17px] font-bold text-white mt-1 font-sans truncate">
                  #{ticket.orderNumber} • {ticket.serviceType}
                </h3>
              </div>

              <span
                className={`px-2.5 py-1 rounded text-[11px] font-mono-code font-bold uppercase shrink-0 ${
                  ticket.status === 'lista_despachada'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : ticket.status === 'en_fuego'
                    ? 'bg-[#ff5708]/20 text-[#ffb59c] border border-[#ff5708]/40'
                    : 'bg-[#0494fc]/20 text-[#a1c9ff] border border-[#0494fc]/40'
                }`}
              >
                {ticket.status.replace('_', ' ')}
              </span>
            </div>

            {/* Dishes with direct image thumbnails */}
            <div className="space-y-2 border-t border-b border-[#27272a] py-3">
              {ticket.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="w-10 h-10 rounded object-cover border border-[#353437] shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] font-mono-code text-[#71717a]">
                      {item.stationBadge} • S/ {item.price.toFixed(2)}
                    </div>
                  </div>
                  <span className={`text-[11px] font-mono-code font-bold shrink-0 ${item.checked ? 'text-emerald-400' : 'text-[#ffb59c]'}`}>
                    {item.checked ? 'Listo' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between font-mono-code text-[12px] gap-2">
              <div className="text-[#a1a1aa] min-w-0 truncate">
                Responsable: <span className="text-white font-semibold">{ticket.serverOrRunner}</span>
              </div>
              <div className="text-[15px] font-bold text-[#ffb59c] shrink-0">
                S/ {ticket.totalAmount.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {newOrderModalOpen && (
        <NewOrderModal
          onClose={() => setNewOrderModalOpen(false)}
          onCreateTicket={onCreateTicket}
        />
      )}
    </div>
  );
};
