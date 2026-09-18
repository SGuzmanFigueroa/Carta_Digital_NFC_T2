import React, { useState, useEffect } from 'react';
import { Ticket, StationId, Runner, TicketItem } from '../types';
import { kitchenAudio } from '../utils/audio';
import { DishDetailModal } from './DishDetailModal';
import { RunnersModal } from './RunnersModal';
import { NewOrderModal } from './NewOrderModal';

interface KDSBoardProps {
  tickets: Ticket[];
  runners: Runner[];
  onUpdateTickets: (tickets: Ticket[]) => void;
  onUpdateRunners: (runners: Runner[]) => void;
}

export const KDSBoard: React.FC<KDSBoardProps> = ({
  tickets,
  runners,
  onUpdateTickets,
  onUpdateRunners
}) => {
  const [selectedStation, setSelectedStation] = useState<StationId>('all');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [kitchenPaused, setKitchenPaused] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('14:48:22');
  
  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIcon, setToastIcon] = useState('check_circle');

  // Modals
  const [inspectedDish, setInspectedDish] = useState<{
    item: TicketItem;
    table: string;
    orderNum: number;
  } | null>(null);
  const [runnersModalOpen, setRunnersModalOpen] = useState(false);
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);

  // Recall memory
  const [lastDispatched, setLastDispatched] = useState<Ticket | null>(null);

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      // Update tickets elapsed time
      onUpdateTickets(
        tickets.map((t) => {
          if (t.status === 'lista_despachada' || t.status === 'archivada') return t;
          return { ...t, elapsedSeconds: t.elapsedSeconds + 1 };
        })
      );

      // Update current time string
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [tickets, onUpdateTickets]);

  const showToast = (msg: string, icon = 'check_circle') => {
    setToastMessage(msg);
    setToastIcon(icon);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleAudioToggle = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    kitchenAudio.enabled = next;
    if (next) {
      kitchenAudio.playCheckItemSound();
      showToast('Alertas sonoras activadas', 'volume_up');
    } else {
      showToast('Alertas silenciadas', 'volume_off');
    }
  };

  const handleToggleItemCheck = (ticketId: string, itemId: string) => {
    const updated = tickets.map((ticket) => {
      if (ticket.id !== ticketId) return ticket;
      const updatedItems = ticket.items.map((item) => {
        if (item.id !== itemId) return item;
        const newChecked = !item.checked;
        return {
          ...item,
          checked: newChecked,
          status: newChecked ? ('listo' as const) : ('pendiente' as const)
        };
      });
      return { ...ticket, items: updatedItems };
    });

    onUpdateTickets(updated);
    kitchenAudio.playCheckItemSound();
  };

  const handleDispatchOrder = (ticketId: string) => {
    const ticketToDispatch = tickets.find((t) => t.id === ticketId);
    if (!ticketToDispatch) return;

    kitchenAudio.playDispatchSound();
    setLastDispatched(ticketToDispatch);

    const updated = tickets.map((t) => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: 'lista_despachada' as const,
          items: t.items.map((i) => ({ ...i, checked: true, status: 'listo' as const }))
        };
      }
      return t;
    });

    onUpdateTickets(updated);
    showToast(`Comanda #${ticketToDispatch.orderNumber} despachada al Pase con éxito`, 'done_all');
  };

  const handleStartPrep = (ticketId: string) => {
    kitchenAudio.playCheckItemSound();
    const updated = tickets.map((t) => {
      if (t.id === ticketId) {
        return { ...t, status: 'en_fuego' as const };
      }
      return t;
    });
    onUpdateTickets(updated);
    showToast(`Orden #${tickets.find((t) => t.id === ticketId)?.orderNumber} iniciada en cocina`, 'soup_kitchen');
  };

  const handleRecallLast = () => {
    if (!lastDispatched) {
      showToast('No hay comandas despachadas recientemente para recuperar', 'info');
      return;
    }
    const recalledTicket = { ...lastDispatched, status: 'en_fuego' as const };
    const updated = tickets.map((t) => (t.id === recalledTicket.id ? recalledTicket : t));
    onUpdateTickets(updated);
    setLastDispatched(null);
    kitchenAudio.playCheckItemSound();
    showToast(`Comanda #${recalledTicket.orderNumber} recuperada en pantalla KDS`, 'restore');
  };

  const handleNotifyRunners = () => {
    kitchenAudio.playRunnerAlertSound();
    showToast('Aviso transmitido a salón: Platos calientes esperan en mesa de pase', 'campaign');
  };

  const handleToggleKitchenPause = () => {
    const next = !kitchenPaused;
    setKitchenPaused(next);
    if (next) {
      showToast('Cocina pausada temporalmente. TPV notificará retraso a salón', 'pause');
    } else {
      showToast('Servicio y flujo de cocina reanudado con normalidad', 'play_arrow');
    }
  };

  const handleCreateNewTicket = (newTicket: Ticket) => {
    onUpdateTickets([newTicket, ...tickets]);
    kitchenAudio.playDispatchSound();
    showToast(`Nueva comanda #${newTicket.orderNumber} ingresada en KDS`, 'add_circle');
  };

  const handleCallAllRunners = () => {
    kitchenAudio.playRunnerAlertSound();
    const updatedRunners = runners.map((r) => ({
      ...r,
      status: 'Libre en Pase' as const,
      location: 'Libre en Pase'
    }));
    onUpdateRunners(updatedRunners);
    showToast('Todos los runners convocados de inmediato al Pase Central', 'campaign');
  };

  const handleUpdateRunnerStatus = (runnerId: string, status: Runner['status'], table?: string) => {
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
    onUpdateRunners(updated);
    showToast('Estado de runner actualizado', 'person');
  };

  // Filter tickets by station
  const activeTickets = tickets.filter((t) => t.status !== 'archivada');
  const visibleTickets = activeTickets.filter((t) => {
    if (selectedStation === 'all') return true;
    return t.stationFilterTags.includes(selectedStation);
  });

  const activeCount = visibleTickets.filter((t) => t.status !== 'lista_despachada').length;
  const enFuegoCount = visibleTickets.filter((t) => t.status === 'en_fuego').length;
  const delayCriticalCount = visibleTickets.filter(
    (t) => t.status !== 'lista_despachada' && t.elapsedSeconds > t.targetSeconds
  ).length;

  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col w-full text-[#e5e1e4] select-none pb-28 ${highContrast ? 'contrast-125' : ''}`}>
      {/* Top Telemetry & Station Switcher Sticky Bar */}
      <div className="sticky top-16 z-40 bg-[#0e0e10]/95 backdrop-blur-xl px-4 lg:px-8 py-3.5 shadow-2xl flex flex-col gap-3 border-b border-[#353437]/40">
        {/* Row 1: Station Selector Touch Ribbon */}
        <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            {/* Todas las partidas */}
            <button
              onClick={() => setSelectedStation('all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-[13px] tracking-wider uppercase font-semibold transition-all active:scale-95 ${
                selectedStation === 'all'
                  ? 'bg-[#ff5708] text-white shadow-lg shadow-[#ff5708]/20'
                  : 'bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">view_kanban</span>
              <span>Todas las Partidas</span>
              <span className="ml-1 px-1.5 py-0.5 rounded bg-[#0e0e10]/40 font-mono-code text-[11px]">
                {activeTickets.filter((t) => t.status !== 'lista_despachada').length}
              </span>
            </button>

            {/* P1 Fuego & Grill */}
            <button
              onClick={() => setSelectedStation('fuego_grill')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-[13px] tracking-wider uppercase transition-all active:scale-95 ${
                selectedStation === 'fuego_grill'
                  ? 'bg-[#ff5708] text-white shadow-lg shadow-[#ff5708]/20 font-semibold'
                  : 'bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#ffb59c]">local_fire_department</span>
              <span>Fuego & Grill</span>
              <span className="font-mono-code text-[11px] text-[#71717a]">P1</span>
            </button>

            {/* P2 Cuarto Frío & Nikkei */}
            <button
              onClick={() => setSelectedStation('frio_nikkei')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-[13px] tracking-wider uppercase transition-all active:scale-95 ${
                selectedStation === 'frio_nikkei'
                  ? 'bg-[#0494fc] text-white shadow-lg shadow-[#0494fc]/20 font-semibold'
                  : 'bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#a1c9ff]">ac_unit</span>
              <span>Cuarto Frío & Nikkei</span>
              <span className="font-mono-code text-[11px] text-[#71717a]">P2</span>
            </button>

            {/* P3 Wok & Sauté */}
            <button
              onClick={() => setSelectedStation('wok_saute')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-[13px] tracking-wider uppercase transition-all active:scale-95 ${
                selectedStation === 'wok_saute'
                  ? 'bg-[#ff5708] text-white shadow-lg shadow-[#ff5708]/20 font-semibold'
                  : 'bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#ffb59c]">skillet</span>
              <span>Wok & Sauté</span>
              <span className="font-mono-code text-[11px] text-[#71717a]">P3</span>
            </button>

            {/* Pastelería */}
            <button
              onClick={() => setSelectedStation('pasteleria')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-[13px] tracking-wider uppercase transition-all active:scale-95 ${
                selectedStation === 'pasteleria'
                  ? 'bg-[#c6c5cf] text-[#131315] font-bold shadow-lg'
                  : 'bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#e3e1ec]">cake</span>
              <span>Pastelería</span>
            </button>

            {/* Barra Mixología */}
            <button
              onClick={() => setSelectedStation('barra_mixologia')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-[13px] tracking-wider uppercase transition-all active:scale-95 ${
                selectedStation === 'barra_mixologia'
                  ? 'bg-[#0494fc] text-white font-bold shadow-lg'
                  : 'bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#a1c9ff]">local_bar</span>
              <span>Barra Mixología</span>
            </button>
          </div>

          {/* Quick Right Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* New Comanda Trigger */}
            <button
              onClick={() => setNewOrderModalOpen(true)}
              className="h-10 px-3.5 rounded-lg bg-[#ff5708] hover:bg-orange-600 text-white font-mono-code text-[12px] font-bold uppercase flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="hidden sm:inline">Nueva Comanda</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={handleAudioToggle}
              className={`h-10 px-3.5 rounded-lg bg-[#2a2a2c] hover:bg-[#39393b] flex items-center gap-2 text-[#e5e1e4] font-mono-code text-[11px] font-bold active:scale-95 transition-all ${
                audioEnabled ? 'border border-[#ff5708]/40 text-[#ffb59c]' : 'text-[#71717a]'
              }`}
              title="Alternar alertas sonoras de cocina"
            >
              <span className="material-symbols-outlined text-[18px] text-[#ff5708]">
                {audioEnabled ? 'volume_up' : 'volume_off'}
              </span>
              <span className="hidden xl:inline uppercase">Alertas: {audioEnabled ? 'ON' : 'MUTE'}</span>
            </button>

            {/* High Contrast Toggle */}
            <button
              onClick={() => {
                setHighContrast(!highContrast);
                showToast(highContrast ? 'Modo normal restablecido' : 'Alto contraste activado', 'contrast');
              }}
              className={`h-10 px-3.5 rounded-lg bg-[#2a2a2c] hover:bg-[#39393b] flex items-center gap-2 text-[#e5e1e4] font-mono-code text-[11px] font-bold active:scale-95 transition-all ${
                highContrast ? 'border border-white text-white bg-[#353437]' : ''
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">contrast</span>
              <span className="hidden xl:inline uppercase">Alto Contraste</span>
            </button>
          </div>
        </div>

        {/* Row 2: Live KDS Metas & Operational Pulse */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#353437]/30">
          <div className="flex flex-wrap items-center gap-3 font-mono-code text-[11px]">
            {/* Active Orders Badge */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#2a2a2c]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5708] animate-pulse"></span>
              <span className="text-[#c6c5cf] tracking-wider uppercase font-semibold">Órdenes Activas:</span>
              <span className="text-white text-[17px] font-bold leading-none">{activeCount}</span>
            </div>

            {/* En Fuego */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a2a2c]">
              <span className="material-symbols-outlined text-[16px] text-[#ff5708]">local_fire_department</span>
              <span className="text-[#c6c5cf]">En Fuego:</span>
              <span className="text-[#ffb59c] font-bold text-[15px]">{enFuegoCount}</span>
            </div>

            {/* Demora Crítica */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              delayCriticalCount > 0 ? 'bg-[#93000a]/50 border border-[#ffb4ab]/40 animate-pulse' : 'bg-[#2a2a2c]'
            }`}>
              <span className="material-symbols-outlined text-[16px] text-[#ffb4ab]">warning</span>
              <span className="text-[#ffb4ab] font-bold tracking-wider">Demora Crítica:</span>
              <span className="text-[#ffb4ab] font-bold text-[15px]">{delayCriticalCount}</span>
            </div>

            {/* Target Prep Time */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a2a2c]">
              <span className="material-symbols-outlined text-[16px] text-[#a1c9ff]">avg_time</span>
              <span className="text-[#c6c5cf]">T. Medio:</span>
              <span className="text-[#a1c9ff] font-bold text-[14px]">12.4m</span>
              <span className="text-[#71717a] text-[11px]">(Meta: 14m)</span>
            </div>
          </div>

          {/* Quick Status Ticker */}
          <div className="flex items-center gap-4 text-[#c6c5cf] font-mono-code text-[11px]">
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${kitchenPaused ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`}></span>
              <span>{kitchenPaused ? 'COCINA EN PAUSA CONTROLADA' : 'SINCRONIZADO: SALÓN + DELIVERY'}</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              <span className="text-[#ff5708] font-bold">{currentTimeStr}</span>
              <span>PET</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN KANBAN BOARD: Dynamic Responsive Grid */}
      <div className="px-4 lg:px-8 pt-6 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-5 items-start">
        {visibleTickets.map((ticket) => {
          const isOverdue = ticket.elapsedSeconds > ticket.targetSeconds;
          const isDispatched = ticket.status === 'lista_despachada';
          const overdueMinutes = Math.floor((ticket.elapsedSeconds - ticket.targetSeconds) / 60);

          return (
            <div
              key={ticket.id}
              className={`flex flex-col rounded-xl shadow-2xl relative overflow-hidden transition-all duration-300 border ${
                isDispatched
                  ? 'bg-[#1c1b1d] border-[#353437] opacity-40 grayscale'
                  : ticket.isUrgent || isOverdue
                  ? 'bg-[#1c1b1d] border-[#93000a] ring-1 ring-[#ffb4ab]/40'
                  : 'bg-[#1c1b1d] border-[#353437]'
              }`}
            >
              {/* High priority alert pulse overlay */}
              {(ticket.isUrgent || isOverdue) && !isDispatched && (
                <div className="absolute inset-0 bg-[#93000a]/10 pointer-events-none animate-pulse"></div>
              )}

              {/* Ticket Header */}
              <div
                className={`p-4 flex items-start justify-between relative z-10 ${
                  isDispatched
                    ? 'bg-[#2a2a2c] text-[#a1a1aa]'
                    : ticket.isUrgent || isOverdue
                    ? 'bg-[#93000a] text-white'
                    : 'bg-[#2a2a2c] text-[#e5e1e4]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono-code text-[11px] font-bold uppercase ${
                        ticket.isUrgent || isOverdue
                          ? 'bg-white text-[#93000a]'
                          : ticket.table.includes('04')
                          ? 'bg-[#ff5708] text-white'
                          : ticket.table.includes('09')
                          ? 'bg-[#0494fc] text-white'
                          : 'bg-[#4a4b53] text-white'
                      }`}
                    >
                      {ticket.table}
                    </span>
                    <span className="font-mono-code text-[11px] tracking-widest uppercase opacity-90 text-[#e5e1e4]">
                      {ticket.zone}
                    </span>
                  </div>
                  <div className="text-[17px] font-bold tracking-tight text-white mt-1 font-sans">
                    #{ticket.orderNumber} • {ticket.serviceType}
                  </div>
                </div>

                {/* Big Timer */}
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-white">
                    {ticket.isUrgent || isOverdue ? (
                      <span className="material-symbols-outlined text-[20px] animate-bounce text-[#ffdad6]">
                        alarm
                      </span>
                    ) : ticket.status === 'en_fuego' ? (
                      <span className="material-symbols-outlined text-[20px] text-[#ffb59c]">
                        local_fire_department
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[20px] text-[#a1c9ff]">
                        schedule
                      </span>
                    )}
                    <span className="font-mono-code text-[26px] font-bold tracking-tighter leading-none">
                      {formatSeconds(ticket.elapsedSeconds)}
                    </span>
                  </div>
                  {isOverdue && !isDispatched ? (
                    <span className="font-mono-code text-[10px] uppercase tracking-wider text-[#ffb4ab] bg-[#0e0e10]/80 px-2 py-0.5 rounded inline-block mt-1 font-bold">
                      +{overdueMinutes}m sobre meta
                    </span>
                  ) : (
                    <span className="font-mono-code text-[10px] uppercase tracking-wider text-[#ffb59c] font-bold block mt-1">
                      {ticket.status === 'en_fuego' ? 'Fuego Activo' : ticket.status === 'ingresada' ? 'Ingresada' : 'En tiempo'}
                    </span>
                  )}
                </div>
              </div>

              {/* Allergen Warning Banner */}
              {ticket.allergyAlert && (
                <div className="bg-[#ff5708] px-4 py-2.5 text-white flex items-center gap-2.5 relative z-10 shadow-inner">
                  <span className="material-symbols-outlined text-[20px] shrink-0 animate-pulse text-white">
                    warning
                  </span>
                  <div className="font-sans text-[12px] font-bold uppercase tracking-wide">
                    {ticket.allergyAlert}
                  </div>
                </div>
              )}

              {/* Synchronous Departure / Special Prep Bar */}
              {ticket.synchronousDepartureNote && (
                <div className="bg-[#201f22] px-4 py-2 text-[#e5beb2] flex items-center justify-between font-mono-code text-[11px] border-b border-[#353437]/40">
                  <span className="flex items-center gap-1.5 text-[#ffb59c] font-bold">
                    <span className="material-symbols-outlined text-[15px]">sync_alt</span>
                    {ticket.synchronousDepartureNote}
                  </span>
                  {ticket.passTemp && <span className="text-[#c6c5cf]">{ticket.passTemp}</span>}
                </div>
              )}

              {ticket.specialPrepNote && (
                <div className="bg-[#201f22] px-4 py-2 text-[#e5beb2] flex items-center gap-2 font-mono-code text-[11px] border-b border-[#353437]/40">
                  <span className="material-symbols-outlined text-[15px] text-[#a1c9ff]">soup_kitchen</span>
                  <span>{ticket.specialPrepNote}</span>
                </div>
              )}

              {/* Ticket Items List */}
              <div className="p-4 flex flex-col gap-3.5 flex-1 relative z-10 bg-[#131315]">
                {ticket.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3.5 p-3 rounded-lg border transition-colors cursor-pointer ${
                      item.checked
                        ? 'bg-[#2a2a2c] border-[#353437]'
                        : 'bg-[#201f22] border-[#27272a] hover:bg-[#2a2a2c]'
                    }`}
                    onClick={() => handleToggleItemCheck(ticket.id, item.id)}
                  >
                    {/* Checkbox */}
                    <div className="shrink-0 pt-0.5">
                      <div
                        className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                          item.checked
                            ? 'bg-[#ff5708] text-white shadow-md shadow-[#ff5708]/30'
                            : 'bg-[#353437] text-transparent hover:border-[#ff5708]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px] font-bold">check</span>
                      </div>
                    </div>

                    {/* Dish Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <div
                          className={`font-sans text-[15px] font-bold text-white transition-opacity ${
                            item.checked ? 'line-through opacity-50' : ''
                          }`}
                        >
                          {item.name}
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded font-mono-code text-[10px] font-bold uppercase ${
                            item.stationBadgeColor || 'bg-[#2a2a2c] text-[#ffb59c]'
                          }`}
                        >
                          {item.stationBadge}
                        </span>
                      </div>

                      {/* Notes */}
                      <div className="mt-1 text-[#e5beb2] text-[13px] leading-snug">
                        {item.cookingNotes.map((note, nIdx) => (
                          <div key={nIdx}>• {note}</div>
                        ))}
                      </div>

                      {/* Direct image & recipe inspection trigger */}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedDish({
                              item,
                              table: ticket.table,
                              orderNum: ticket.orderNumber
                            });
                          }}
                          className="flex items-center gap-1.5 text-[11px] font-mono-code text-[#ffb59c] hover:text-white bg-[#1c1b1d] px-2 py-1 rounded border border-[#353437] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">image</span>
                          <span>Ficha & Emplatado</span>
                        </button>

                        <span className="text-[11px] font-mono-code text-[#71717a]">
                          S/ {item.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Service Note / Internal Pass Info */}
                <div className="mt-auto p-2.5 rounded-lg bg-[#1c1b1d] border border-[#27272a] flex items-center justify-between text-[#c6c5cf] font-mono-code text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#a1c9ff]">
                      {ticket.serverRole === 'BARTENDER' ? 'liquor' : 'room_service'}
                    </span>
                    <span>
                      {ticket.serverRole || 'CAMARERO'}: {ticket.serverOrRunner}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-white">S/ {ticket.totalAmount.toFixed(2)}</span> total
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3.5 bg-[#1c1b1d] border-t border-[#27272a] relative z-10">
                {isDispatched ? (
                  <div className="w-full py-3 px-4 rounded-lg bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-mono-code text-[13px] font-bold text-center flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">done_all</span>
                    <span>DESPACHADO A RUNNERS</span>
                  </div>
                ) : ticket.status === 'ingresada' && ticket.table === 'MESA 09' ? (
                  <button
                    onClick={() => handleStartPrep(ticket.id)}
                    className="w-full py-3.5 px-5 rounded-lg bg-[#0494fc] hover:bg-blue-600 text-white font-sans text-[15px] font-bold tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-[#0494fc]/20 transition-all active:scale-98"
                  >
                    <span className="material-symbols-outlined text-[22px]">play_arrow</span>
                    <span>Iniciar Preparación</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleDispatchOrder(ticket.id)}
                    className={`w-full py-3.5 px-5 rounded-lg font-sans text-[15px] font-bold tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-98 ${
                      ticket.isUrgent || isOverdue
                        ? 'bg-[#ff5708] hover:bg-orange-600 text-white shadow-[#ff5708]/30'
                        : 'bg-[#ffb59c] hover:bg-[#ffdbcf] text-[#5c1900]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      {ticket.isUrgent || isOverdue ? 'check_circle' : 'check'}
                    </span>
                    <span>
                      {ticket.isUrgent || isOverdue ? 'Marcar Listo (Despachar)' : 'Marcar Listo'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Large Visual Live Kitchen Telemetry & Pass Status Strip */}
      <div className="px-4 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Performance Chart / Throughput Gauge */}
        <div className="p-5 rounded-xl bg-[#1c1b1d] border border-[#353437] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <span className="material-symbols-outlined text-[#ff5708] text-[20px]">speed</span>
              <span>VELOCIDAD DEL PASE (ÚLTIMA HORA)</span>
            </div>
            <span className="font-mono-code text-[11px] text-emerald-400 bg-[#201f22] px-2 py-0.5 rounded border border-emerald-500/20">
              94% ÓPTIMO
            </span>
          </div>

          {/* Inline SVG Visualizer for Ticket Latency */}
          <div className="py-4">
            <svg className="w-full h-16 text-[#ff5708] overflow-visible" preserveAspectRatio="none" viewBox="0 0 300 60">
              <defs>
                <linearGradient id="latencyGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ff5708" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ff5708" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0,45 Q 40,20 80,35 T 160,15 T 240,40 T 300,10 L 300,60 L 0,60 Z"
                fill="url(#latencyGradient)"
              />
              <path
                d="M 0,45 Q 40,20 80,35 T 160,15 T 240,40 T 300,10"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="3"
              />
              <circle className="animate-ping" cx="280" cy="15" r="5" fill="#ffb4ab" stroke="#93000a" strokeWidth="2" />
              <circle cx="280" cy="15" r="4.5" fill="#ff5708" />
            </svg>
          </div>

          <div className="flex items-center justify-between font-mono-code text-[11px] text-[#c6c5cf]">
            <span>14:00 (18 Platos)</span>
            <span>14:30 (34 Platos)</span>
            <span className="text-[#ff5708] font-bold">14:48 (Pico Activo)</span>
          </div>
        </div>

        {/* Active Expediters & Runners Status */}
        <div className="p-5 rounded-xl bg-[#1c1b1d] border border-[#353437] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <span className="material-symbols-outlined text-[#a1c9ff] text-[20px]">hail</span>
              <span>ESTADO DE RUNNERS & SALÓN</span>
            </div>
            <span className="font-mono-code text-[11px] text-[#c6c5cf]">
              {runners.filter((r) => r.status === 'Libre en Pase').length} DISPONIBLES
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-3">
            {runners.slice(0, 3).map((r) => (
              <div
                key={r.id}
                onClick={() => setRunnersModalOpen(true)}
                className="p-2.5 rounded-lg bg-[#201f22] border border-[#27272a] text-center cursor-pointer hover:border-[#ff5708] transition-all"
              >
                <div
                  className={`font-mono-code text-[10px] font-bold ${
                    r.status === 'Libre en Pase' ? 'text-emerald-400' : 'text-[#ff5708]'
                  }`}
                >
                  RUNNER {r.runnerNumber}
                </div>
                <div className="text-[13px] font-semibold mt-0.5 text-white">{r.name}</div>
                <div className="text-[11px] text-[#c6c5cf] mt-1 truncate">{r.location}</div>
              </div>
            ))}
          </div>

          <div className="text-[12px] text-[#c6c5cf] flex items-center justify-between">
            <span>
              Tiempo medio despacho a mesa: <strong>1.8 min</strong>
            </span>
            <button
              onClick={() => setRunnersModalOpen(true)}
              className="text-[#a1c9ff] underline hover:text-white font-mono-code text-[11px]"
            >
              Llamar todos
            </button>
          </div>
        </div>

        {/* Station Heatmap / Balance */}
        <div className="p-5 rounded-xl bg-[#1c1b1d] border border-[#353437] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <span className="material-symbols-outlined text-[#ffb59c] text-[20px]">equalizer</span>
              <span>CARGA POR PARTIDA</span>
            </div>
            <span className="font-mono-code text-[11px] text-[#ff5708] font-bold">P1 AL 85%</span>
          </div>

          <div className="flex flex-col gap-2 py-2 font-mono-code text-[11px]">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[#c6c5cf]">P1 Fuego & Grill</span>
                <span className="text-[#ff5708] font-bold">85% (6 órdenes)</span>
              </div>
              <div className="w-full h-2 rounded bg-[#201f22] overflow-hidden">
                <div className="h-full bg-[#ff5708] w-[85%] rounded transition-all duration-500"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[#c6c5cf]">P2 Frío & Nikkei</span>
                <span className="text-[#e3e1ec] font-bold">45% (3 órdenes)</span>
              </div>
              <div className="w-full h-2 rounded bg-[#201f22] overflow-hidden">
                <div className="h-full bg-[#0494fc] w-[45%] rounded transition-all duration-500"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[#c6c5cf]">P3 Wok & Sauté</span>
                <span className="text-[#e3e1ec] font-bold">30% (2 órdenes)</span>
              </div>
              <div className="w-full h-2 rounded bg-[#201f22] overflow-hidden">
                <div className="h-full bg-[#ffb59c] w-[30%] rounded transition-all duration-500"></div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#c6c5cf]">
            Balance automático activado en TPV
          </div>
        </div>
      </div>

      {/* FIXED BOTTOM TACTILE KITCHEN CONTROL BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0e0e10]/95 backdrop-blur-xl px-4 lg:px-8 py-3 border-t border-[#353437]/50 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left Emergency & Fast Action Tactile Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRecallLast}
              className="h-12 px-5 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] active:scale-95 text-white font-sans text-[13px] uppercase font-bold flex items-center gap-2.5 transition-all shadow-md border border-[#353437]"
            >
              <span className="material-symbols-outlined text-[20px] text-[#a1c9ff]">history</span>
              <span>Recuperar Última Comanda</span>
            </button>

            <button
              onClick={handleNotifyRunners}
              className="h-12 px-5 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] active:scale-95 text-white font-sans text-[13px] uppercase font-bold flex items-center gap-2.5 transition-all shadow-md border border-[#353437]"
            >
              <span className="material-symbols-outlined text-[20px] text-[#ff5708]">campaign</span>
              <span>Avisar Runners (Pase)</span>
            </button>
          </div>

          {/* Right Pause Kitchen Rush Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleKitchenPause}
              className={`h-12 px-5 rounded-lg font-sans text-[13px] uppercase font-bold flex items-center gap-2.5 transition-all shadow-md active:scale-95 border ${
                kitchenPaused
                  ? 'bg-[#93000a] text-white border-[#ffb4ab]'
                  : 'bg-[#201f22] hover:bg-[#93000a]/20 text-[#ffb4ab] border-[#353437]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {kitchenPaused ? 'play_circle' : 'pause_circle'}
              </span>
              <span>{kitchenPaused ? 'Cocina Pausada (Reanudar)' : 'Pausar Entradas de Cocina'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded bg-[#201f22] font-mono-code text-[11px] text-[#c6c5cf] border border-[#353437]/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>MODO TOUCH: ACTIVO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-5 py-3 rounded-lg bg-[#353437] text-white shadow-2xl flex items-center gap-3 font-sans text-[13px] font-semibold border border-[#5c4037]/50 animate-fadeIn">
          <span className="material-symbols-outlined text-[#ff5708] text-[22px]">{toastIcon}</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      {inspectedDish && (
        <DishDetailModal
          item={inspectedDish.item}
          tableNumber={inspectedDish.table}
          orderNumber={inspectedDish.orderNum}
          onClose={() => setInspectedDish(null)}
          onToggleReady={(itemId) => {
            const ticket = tickets.find((t) => t.items.some((i) => i.id === itemId));
            if (ticket) handleToggleItemCheck(ticket.id, itemId);
          }}
        />
      )}

      {runnersModalOpen && (
        <RunnersModal
          runners={runners}
          onClose={() => setRunnersModalOpen(false)}
          onCallAllRunners={handleCallAllRunners}
          onUpdateRunnerStatus={handleUpdateRunnerStatus}
        />
      )}

      {newOrderModalOpen && (
        <NewOrderModal
          onClose={() => setNewOrderModalOpen(false)}
          onCreateTicket={handleCreateNewTicket}
        />
      )}
    </div>
  );
};
