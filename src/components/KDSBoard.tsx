import React, { useState, useEffect, useRef } from 'react';
import { Ticket, StationId, Runner, TicketItem } from '../types';
import { kitchenAudio } from '../utils/audio';
import { DishDetailModal } from './DishDetailModal';
import { RunnersModal } from './RunnersModal';
import { NewOrderModal } from './NewOrderModal';
import { useRestaurant } from '../context/RestaurantContext';

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
  const {
    dispatchTicket: contextDispatchTicket,
    startTicketPrep: contextStartTicketPrep,
    updateTicketItem: contextUpdateTicketItem,
    recallLastDispatched: contextRecallLastDispatched,
    notifyRunners: contextNotifyRunners,
    callAllRunners: contextCallAllRunners,
    updateRunnerStatus: contextUpdateRunnerStatus,
    toggleKitchenPause: contextToggleKitchenPause,
    kitchenPaused: contextKitchenPaused,
    audioEnabled: contextAudioEnabled,
    toggleAudio: contextToggleAudio
  } = useRestaurant();

  const [selectedStation, setSelectedStation] = useState<StationId>('all');
  const [highContrast, setHighContrast] = useState(false);
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

  // Station picker (phones): a button that opens the full list of partidas
  const [stationMenuOpen, setStationMenuOpen] = useState(false);
  const stationMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stationMenuOpen) return;
    const handleOutside = (e: PointerEvent) => {
      if (stationMenuRef.current && !stationMenuRef.current.contains(e.target as Node)) {
        setStationMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [stationMenuOpen]);

  const stationOptions: Array<{
    id: StationId;
    label: string;
    icon: string;
    iconColor: string;
    tag?: string;
    activeClass: string;
  }> = [
    { id: 'all', label: 'Todas las Partidas', icon: 'view_kanban', iconColor: '', activeClass: 'bg-[#ff5708] text-white shadow-lg shadow-[#ff5708]/20 font-semibold' },
    { id: 'fuego_grill', label: 'Fuego & Grill', icon: 'local_fire_department', iconColor: 'text-[#ffb59c]', tag: 'P1', activeClass: 'bg-[#ff5708] text-white shadow-lg shadow-[#ff5708]/20 font-semibold' },
    { id: 'frio_nikkei', label: 'Cuarto Frío & Nikkei', icon: 'ac_unit', iconColor: 'text-[#a1c9ff]', tag: 'P2', activeClass: 'bg-[#0494fc] text-white shadow-lg shadow-[#0494fc]/20 font-semibold' },
    { id: 'wok_saute', label: 'Wok & Sauté', icon: 'skillet', iconColor: 'text-[#ffb59c]', tag: 'P3', activeClass: 'bg-[#ff5708] text-white shadow-lg shadow-[#ff5708]/20 font-semibold' },
    { id: 'pasteleria', label: 'Pastelería', icon: 'cake', iconColor: 'text-[#e3e1ec]', activeClass: 'bg-[#c6c5cf] text-[#131315] font-bold shadow-lg' },
    { id: 'barra_mixologia', label: 'Barra Mixología', icon: 'local_bar', iconColor: 'text-[#a1c9ff]', activeClass: 'bg-[#0494fc] text-white font-bold shadow-lg' }
  ];
  const currentStation = stationOptions.find((o) => o.id === selectedStation) ?? stationOptions[0];

  // Live timer tick every second for wall clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string, icon = 'check_circle') => {
    setToastMessage(msg);
    setToastIcon(icon);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleAudioToggle = () => {
    contextToggleAudio();
  };

  const handleToggleItemCheck = (ticketId: string, itemId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    const item = ticket?.items.find((i) => i.id === itemId);
    if (!ticket || !item) return;
    contextUpdateTicketItem(ticketId, itemId, !item.checked);
  };

  const handleDispatchOrder = (ticketId: string) => {
    contextDispatchTicket(ticketId);
  };

  const handleStartPrep = (ticketId: string) => {
    contextStartTicketPrep(ticketId);
  };

  const handleRecallLast = () => {
    contextRecallLastDispatched();
  };

  const handleNotifyRunners = () => {
    contextNotifyRunners();
  };

  const handleToggleKitchenPause = () => {
    contextToggleKitchenPause();
  };

  const handleCreateNewTicket = (newTicket: Ticket) => {
    onUpdateTickets([newTicket, ...tickets]);
    kitchenAudio.playDispatchSound();
    showToast(`Nueva comanda #${newTicket.orderNumber} ingresada en KDS`, 'add_circle');
  };

  const handleCallAllRunners = () => {
    contextCallAllRunners();
  };

  const handleUpdateRunnerStatus = (runnerId: string, status: Runner['status'], table?: string) => {
    contextUpdateRunnerStatus(runnerId, status, table);
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
    <div className={`flex flex-col w-full text-[#e5e1e4] select-none pb-[calc(6.25rem+env(safe-area-inset-bottom))] sm:pb-28 ${highContrast ? 'contrast-125' : ''}`}>
      {/* Top Telemetry & Station Switcher Bar
          Sticky from tablet up. On phones it scrolls with the page so it doesn't eat half of the screen. */}
      <div className="relative md:sticky md:top-16 z-40 bg-[#0e0e10]/95 backdrop-blur-xl px-3 sm:px-4 lg:px-8 py-3 shadow-2xl flex flex-col gap-2.5 border-b border-[#353437]/40 w-full">
        {/* Row 1: Station Selector Touch Ribbon */}
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2.5 w-full">
          {/* Phones: one button that shows the active partida and opens the full list */}
          <div ref={stationMenuRef} className="relative w-full md:hidden">
            <button
              onClick={() => setStationMenuOpen(!stationMenuOpen)}
              className={`w-full min-h-10 flex items-center gap-2 px-3.5 py-2.5 rounded-lg font-sans text-[13px] tracking-wider uppercase transition-all active:scale-95 ${currentStation.activeClass}`}
              aria-haspopup="listbox"
              aria-expanded={stationMenuOpen}
              aria-label="Elegir partida"
            >
              <span className={`material-symbols-outlined text-[18px] shrink-0 ${currentStation.iconColor}`}>
                {currentStation.icon}
              </span>
              <span className="truncate">{currentStation.label}</span>
              {selectedStation === 'all' && (
                <span className="px-1.5 py-0.5 rounded bg-[#0e0e10]/40 font-mono-code text-[11px] shrink-0">
                  {activeTickets.filter((t) => t.status !== 'lista_despachada').length}
                </span>
              )}
              <span
                className={`material-symbols-outlined text-[20px] ml-auto shrink-0 transition-transform ${
                  stationMenuOpen ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>

            {stationMenuOpen && (
              <div
                role="listbox"
                className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#1c1b1d] border border-[#353437] rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 animate-fadeIn"
              >
                {stationOptions.map((opt) => (
                  <button
                    key={opt.id}
                    role="option"
                    aria-selected={selectedStation === opt.id}
                    onClick={() => {
                      setSelectedStation(opt.id);
                      setStationMenuOpen(false);
                    }}
                    className={`w-full min-h-11 flex items-center gap-2.5 px-3 rounded-lg font-sans text-[13px] tracking-wider uppercase text-left transition-all active:scale-[0.98] ${
                      selectedStation === opt.id
                        ? opt.activeClass
                        : 'bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] hover:text-white'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] shrink-0 ${opt.iconColor}`}>
                      {opt.icon}
                    </span>
                    <span className="truncate">{opt.label}</span>
                    {opt.id === 'all' ? (
                      <span className="ml-auto px-1.5 py-0.5 rounded bg-[#0e0e10]/40 font-mono-code text-[11px] shrink-0">
                        {activeTickets.filter((t) => t.status !== 'lista_despachada').length}
                      </span>
                    ) : (
                      opt.tag && (
                        <span className="ml-auto font-mono-code text-[11px] text-[#a1a1aa] shrink-0">{opt.tag}</span>
                      )
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tablet and up: the original chips ribbon */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0 [mask-image:linear-gradient(to_right,#000_calc(100%-20px),transparent)]">
            {/* Todas las partidas */}
            <button
              onClick={() => setSelectedStation('all')}
              className={`shrink-0 whitespace-nowrap min-h-10 flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-[13px] tracking-wider uppercase font-semibold transition-all active:scale-95 ${
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
              className={`shrink-0 whitespace-nowrap min-h-10 flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-[13px] tracking-wider uppercase transition-all active:scale-95 ${
                selectedStation === 'fuego_grill'
                  ? 'bg-[#ff5708] text-white shadow-lg shadow-[#ff5708]/20 font-semibold'
                  : 'bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#ffb59c]">local_fire_department</span>
              <span>Fuego & Grill</span>
              <span className="font-mono-code text-[11px] text-[#a1a1aa]">P1</span>
            </button>

            {/* P2 Cuarto Frío & Nikkei */}
            <button
              onClick={() => setSelectedStation('frio_nikkei')}
              className={`shrink-0 whitespace-nowrap min-h-10 flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-[13px] tracking-wider uppercase transition-all active:scale-95 ${
                selectedStation === 'frio_nikkei'
                  ? 'bg-[#0494fc] text-white shadow-lg shadow-[#0494fc]/20 font-semibold'
                  : 'bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#a1c9ff]">ac_unit</span>
              <span>Cuarto Frío & Nikkei</span>
              <span className="font-mono-code text-[11px] text-[#a1a1aa]">P2</span>
            </button>

            {/* P3 Wok & Sauté */}
            <button
              onClick={() => setSelectedStation('wok_saute')}
              className={`shrink-0 whitespace-nowrap min-h-10 flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-[13px] tracking-wider uppercase transition-all active:scale-95 ${
                selectedStation === 'wok_saute'
                  ? 'bg-[#ff5708] text-white shadow-lg shadow-[#ff5708]/20 font-semibold'
                  : 'bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#ffb59c]">skillet</span>
              <span>Wok & Sauté</span>
              <span className="font-mono-code text-[11px] text-[#a1a1aa]">P3</span>
            </button>

            {/* Pastelería */}
            <button
              onClick={() => setSelectedStation('pasteleria')}
              className={`shrink-0 whitespace-nowrap min-h-10 flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-[13px] tracking-wider uppercase transition-all active:scale-95 ${
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
              className={`shrink-0 whitespace-nowrap min-h-10 flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-[13px] tracking-wider uppercase transition-all active:scale-95 ${
                selectedStation === 'barra_mixologia'
                  ? 'bg-[#0494fc] text-white font-bold shadow-lg'
                  : 'bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#a1c9ff]">local_bar</span>
              <span>Barra Mixología</span>
            </button>
          </div>

          {/* Quick Right Action Buttons (Always visible and pinned) */}
          <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:flex md:items-center md:gap-2.5 md:shrink-0">
            {/* New Comanda Trigger */}
            <button
              onClick={() => setNewOrderModalOpen(true)}
              className="h-10 min-w-10 justify-center px-3 sm:px-3.5 rounded-lg bg-[#ff5708] hover:bg-orange-600 text-white font-mono-code text-[11px] sm:text-[12px] font-bold uppercase flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
              aria-label="Nueva comanda"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px]">add</span>
              <span className="hidden sm:inline">Nueva Comanda</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={handleAudioToggle}
              className={`h-10 min-w-10 justify-center px-3 sm:px-3.5 rounded-lg bg-[#2a2a2c] hover:bg-[#39393b] flex items-center gap-1.5 text-[#e5e1e4] font-mono-code text-[11px] font-bold active:scale-95 transition-all shrink-0 cursor-pointer ${
                contextAudioEnabled ? 'border border-[#ff5708]/40 text-[#ffb59c]' : 'text-[#a1a1aa]'
              }`}
              title="Alternar alertas sonoras de cocina"
              aria-label="Alternar alertas sonoras de cocina"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] text-[#ff5708]">
                {contextAudioEnabled ? 'volume_up' : 'volume_off'}
              </span>
              <span className="hidden 2xl:inline uppercase">Alertas: {contextAudioEnabled ? 'ON' : 'MUTE'}</span>
            </button>

            {/* High Contrast Toggle */}
            <button
              onClick={() => {
                setHighContrast(!highContrast);
                showToast(highContrast ? 'Modo normal restablecido' : 'Alto contraste activado', 'contrast');
              }}
              className={`h-10 min-w-10 justify-center px-3 sm:px-3.5 rounded-lg bg-[#2a2a2c] hover:bg-[#39393b] flex items-center gap-1.5 text-[#e5e1e4] font-mono-code text-[11px] font-bold active:scale-95 transition-all shrink-0 cursor-pointer ${
                highContrast ? 'border border-white text-white bg-[#353437]' : ''
              }`}
              title="Alternar modo alto contraste"
              aria-label="Alternar modo alto contraste"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px]">contrast</span>
              <span className="hidden 2xl:inline uppercase">Alto Contraste</span>
            </button>
          </div>
        </div>

        {/* Row 2: Live KDS Metas & Operational Pulse */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 pt-2.5 sm:pt-1 border-t border-[#353437]/30">
          {/* Phones: tidy grid of equal-width cards. Tablet and up: the original inline pills. */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:gap-3 font-mono-code text-[11px]">
            {/* Active Orders Badge */}
            <div className="col-span-2 flex items-center gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#2a2a2c]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5708] animate-pulse shrink-0"></span>
              <span className="text-[#c6c5cf] tracking-wider uppercase font-semibold">Órdenes Activas:</span>
              <span className="ml-auto sm:ml-0 text-white text-[17px] font-bold leading-none">{activeCount}</span>
            </div>

            {/* En Fuego */}
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#2a2a2c]">
              <span className="material-symbols-outlined text-[16px] text-[#ff5708]">local_fire_department</span>
              <span className="text-[#c6c5cf]">En Fuego:</span>
              <span className="ml-auto sm:ml-0 text-[#ffb59c] font-bold text-[15px]">{enFuegoCount}</span>
            </div>

            {/* Demora Crítica */}
            <div
              className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all ${
                delayCriticalCount > 0 ? 'bg-[#93000a]/50 border border-[#ffb4ab]/40 animate-pulse' : 'bg-[#2a2a2c]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-[#ffb4ab]">warning</span>
              <span className="text-[#ffb4ab] font-bold sm:tracking-wider whitespace-nowrap">Demora Crítica:</span>
              <span className="ml-auto sm:ml-0 text-[#ffb4ab] font-bold text-[15px]">{delayCriticalCount}</span>
            </div>

            {/* Target Prep Time */}
            <div className="col-span-2 flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#2a2a2c]">
              <span className="material-symbols-outlined text-[16px] text-[#a1c9ff]">avg_time</span>
              <span className="text-[#c6c5cf]">T. Medio:</span>
              <span className="ml-auto sm:ml-0 text-[#a1c9ff] font-bold text-[14px]">12.4m</span>
              <span className="text-[#a1a1aa] text-[11px]">(Meta: 14m)</span>
            </div>
          </div>

          {/* Quick Status Ticker */}
          <div className="flex items-center gap-4 text-[#c6c5cf] font-mono-code text-[11px] w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                  contextKitchenPaused ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'
                }`}
              ></span>
              <span>{contextKitchenPaused ? 'COCINA EN PAUSA CONTROLADA' : 'SINCRONIZADO: SALÓN + DELIVERY'}</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              <span className="text-[#ff5708] font-bold">{currentTimeStr}</span>
              <span>PET</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN KANBAN BOARD: Dynamic Responsive Grid */}
      <div className="px-3 sm:px-4 lg:px-8 pt-4 sm:pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 items-start">
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
                className={`p-3.5 sm:p-4 flex items-start justify-between gap-3 relative z-10 ${
                  isDispatched
                    ? 'bg-[#2a2a2c] text-[#a1a1aa]'
                    : ticket.isUrgent || isOverdue
                    ? 'bg-[#93000a] text-white'
                    : 'bg-[#2a2a2c] text-[#e5e1e4]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
                <div className="text-right shrink-0">
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
                    <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#ffb4ab] bg-[#0e0e10]/80 px-2 py-0.5 rounded inline-block mt-1 font-bold">
                      +{overdueMinutes}m sobre meta
                    </span>
                  ) : (
                    <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#ffb59c] font-bold block mt-1">
                      {ticket.status === 'en_fuego' ? 'Fuego Activo' : ticket.status === 'ingresada' ? 'Ingresada' : 'En tiempo'}
                    </span>
                  )}
                </div>
              </div>

              {/* Allergen Warning Banner */}
              {ticket.allergyAlert && (
                <div className="bg-[#ff5708] px-3.5 sm:px-4 py-2.5 text-white flex items-center gap-2.5 relative z-10 shadow-inner">
                  <span className="material-symbols-outlined text-[20px] shrink-0 animate-pulse text-white">
                    warning
                  </span>
                  <div className="font-sans text-[12px] font-bold uppercase tracking-wide min-w-0">
                    {ticket.allergyAlert}
                  </div>
                </div>
              )}

              {/* Synchronous Departure / Special Prep Bar */}
              {ticket.synchronousDepartureNote && (
                <div className="bg-[#201f22] px-3.5 sm:px-4 py-2 text-[#e5beb2] flex items-center justify-between gap-2 font-mono-code text-[11px] border-b border-[#353437]/40">
                  <span className="flex items-center gap-1.5 text-[#ffb59c] font-bold min-w-0">
                    <span className="material-symbols-outlined text-[15px] shrink-0">sync_alt</span>
                    {ticket.synchronousDepartureNote}
                  </span>
                  {ticket.passTemp && <span className="text-[#c6c5cf] shrink-0">{ticket.passTemp}</span>}
                </div>
              )}

              {ticket.specialPrepNote && (
                <div className="bg-[#201f22] px-3.5 sm:px-4 py-2 text-[#e5beb2] flex items-center gap-2 font-mono-code text-[11px] border-b border-[#353437]/40">
                  <span className="material-symbols-outlined text-[15px] text-[#a1c9ff] shrink-0">soup_kitchen</span>
                  <span className="min-w-0">{ticket.specialPrepNote}</span>
                </div>
              )}

              {/* Ticket Items List */}
              <div className="p-3 sm:p-4 flex flex-col gap-3 sm:gap-3.5 flex-1 relative z-10 bg-[#131315]">
                {ticket.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 sm:gap-3.5 p-3 rounded-lg border transition-colors cursor-pointer ${
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
                          className={`min-w-0 break-words font-sans text-[15px] font-bold text-white transition-opacity ${
                            item.checked ? 'line-through opacity-50' : ''
                          }`}
                        >
                          {item.name}
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded font-mono-code text-[11px] font-bold uppercase ${
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
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
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
                          className="flex items-center gap-1.5 text-[11px] font-mono-code text-[#ffb59c] hover:text-white bg-[#1c1b1d] px-2.5 py-1.5 sm:px-2 sm:py-1 min-h-9 sm:min-h-0 rounded border border-[#353437] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">image</span>
                          <span>Ficha & Emplatado</span>
                        </button>

                        <span className="text-[11px] font-mono-code text-[#a1a1aa]">
                          S/ {item.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Service Note / Internal Pass Info */}
                <div className="mt-auto p-2.5 rounded-lg bg-[#1c1b1d] border border-[#27272a] flex items-center justify-between gap-2 text-[#c6c5cf] font-mono-code text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-[15px] text-[#a1c9ff] shrink-0">
                      {ticket.serverRole === 'BARTENDER' ? 'liquor' : 'room_service'}
                    </span>
                    <span className="truncate">
                      {ticket.serverRole || 'CAMARERO'}: {ticket.serverOrRunner}
                    </span>
                  </div>
                  <div className="shrink-0">
                    <span className="font-bold text-white">S/ {ticket.totalAmount.toFixed(2)}</span> total
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 sm:p-3.5 bg-[#1c1b1d] border-t border-[#27272a] relative z-10">
                {isDispatched ? (
                  <div className="w-full py-3 px-4 rounded-lg bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-mono-code text-[13px] font-bold text-center flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">done_all</span>
                    <span>DESPACHADO A RUNNERS</span>
                  </div>
                ) : ticket.status === 'ingresada' ? (
                  <button
                    onClick={() => handleStartPrep(ticket.id)}
                    className="w-full py-3.5 px-5 rounded-lg bg-[#0494fc] hover:bg-blue-600 text-white font-sans text-[15px] font-bold tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-[#0494fc]/20 transition-all active:scale-98 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[22px]">play_arrow</span>
                    <span>Iniciar Preparación</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleDispatchOrder(ticket.id)}
                    className={`w-full py-3.5 px-5 rounded-lg font-sans text-[15px] font-bold tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-98 cursor-pointer ${
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
      <div className="px-3 sm:px-4 lg:px-8 mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Quick Performance Chart / Throughput Gauge */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#1c1b1d] border border-[#353437] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white min-w-0">
              <span className="material-symbols-outlined text-[#ff5708] text-[20px] shrink-0">speed</span>
              <span>VELOCIDAD DEL PASE (ÚLTIMA HORA)</span>
            </div>
            <span className="shrink-0 whitespace-nowrap font-mono-code text-[11px] text-emerald-400 bg-[#201f22] px-2 py-0.5 rounded border border-emerald-500/20">
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

          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono-code text-[11px] text-[#c6c5cf]">
            <span>14:00 (18 Platos)</span>
            <span>14:30 (34 Platos)</span>
            <span className="text-[#ff5708] font-bold">14:48 (Pico Activo)</span>
          </div>
        </div>

        {/* Active Expediters & Runners Status */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#1c1b1d] border border-[#353437] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white min-w-0">
              <span className="material-symbols-outlined text-[#a1c9ff] text-[20px] shrink-0">hail</span>
              <span>ESTADO DE RUNNERS & SALÓN</span>
            </div>
            <span className="shrink-0 whitespace-nowrap font-mono-code text-[11px] text-[#c6c5cf]">
              {runners.filter((r) => r.status === 'Libre en Pase').length} DISPONIBLES
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-3">
            {runners.slice(0, 3).map((r) => (
              <div
                key={r.id}
                onClick={() => setRunnersModalOpen(true)}
                className="min-w-0 p-2.5 rounded-lg bg-[#201f22] border border-[#27272a] text-center cursor-pointer hover:border-[#ff5708] transition-all"
              >
                <div
                  className={`font-mono-code text-[10px] font-bold ${
                    r.status === 'Libre en Pase' ? 'text-emerald-400' : 'text-[#ff5708]'
                  }`}
                >
                  RUNNER {r.runnerNumber}
                </div>
                <div className="text-[13px] font-semibold mt-0.5 text-white truncate">{r.name}</div>
                <div className="text-[11px] text-[#c6c5cf] mt-1 truncate">{r.location}</div>
              </div>
            ))}
          </div>

          <div className="text-[12px] text-[#c6c5cf] flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span>
              Tiempo medio despacho a mesa: <strong>1.8 min</strong>
            </span>
            <button
              onClick={() => setRunnersModalOpen(true)}
              className="text-[#a1c9ff] underline hover:text-white font-mono-code text-[11px] py-1"
            >
              Llamar todos
            </button>
          </div>
        </div>

        {/* Station Heatmap / Balance */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#1c1b1d] border border-[#353437] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white min-w-0">
              <span className="material-symbols-outlined text-[#ffb59c] text-[20px] shrink-0">equalizer</span>
              <span>CARGA POR PARTIDA</span>
            </div>
            <span className="shrink-0 whitespace-nowrap font-mono-code text-[11px] text-[#ff5708] font-bold">P1 AL 85%</span>
          </div>

          <div className="flex flex-col gap-2 py-2 font-mono-code text-[11px]">
            <div>
              <div className="flex justify-between gap-2 mb-1">
                <span className="text-[#c6c5cf]">P1 Fuego & Grill</span>
                <span className="text-[#ff5708] font-bold">85% (6 órdenes)</span>
              </div>
              <div className="w-full h-2 rounded bg-[#201f22] overflow-hidden">
                <div className="h-full bg-[#ff5708] w-[85%] rounded transition-all duration-500"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between gap-2 mb-1">
                <span className="text-[#c6c5cf]">P2 Frío & Nikkei</span>
                <span className="text-[#e3e1ec] font-bold">45% (3 órdenes)</span>
              </div>
              <div className="w-full h-2 rounded bg-[#201f22] overflow-hidden">
                <div className="h-full bg-[#0494fc] w-[45%] rounded transition-all duration-500"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between gap-2 mb-1">
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

      {/* FIXED BOTTOM TACTILE KITCHEN CONTROL BAR
          Phones: 3 equal columns in a single row (icon over label). Tablet and up: original layout. */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0e0e10]/95 backdrop-blur-xl px-3 sm:px-4 lg:px-8 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:pt-3 sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-[#353437]/50 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-[1920px] mx-auto grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          {/* Left Emergency & Fast Action Tactile Buttons */}
          <div className="contents sm:flex sm:items-center sm:gap-3 sm:flex-wrap">
            <button
              onClick={handleRecallLast}
              className="h-14 sm:h-12 px-1.5 sm:px-5 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] active:scale-95 text-white font-sans text-[11px] sm:text-[13px] leading-tight text-center uppercase font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 transition-all shadow-md border border-[#353437] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[#a1c9ff]">history</span>
              <span><span className="hidden sm:inline">Recuperar </span>Última Comanda</span>
            </button>

            <button
              onClick={handleNotifyRunners}
              className="h-14 sm:h-12 px-1.5 sm:px-5 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] active:scale-95 text-white font-sans text-[11px] sm:text-[13px] leading-tight text-center uppercase font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 transition-all shadow-md border border-[#353437] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[#ff5708]">campaign</span>
              <span><span className="hidden sm:inline">Avisar </span>Runners<span className="hidden md:inline"> (Pase)</span></span>
            </button>
          </div>

          {/* Right Pause Kitchen Rush Button */}
          <div className="contents sm:flex sm:items-center sm:gap-3 sm:shrink-0 sm:ml-auto">
            <button
              onClick={handleToggleKitchenPause}
              className={`h-14 sm:h-12 px-1.5 sm:px-5 rounded-lg font-sans text-[11px] sm:text-[13px] leading-tight text-center uppercase font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 transition-all shadow-md active:scale-95 border cursor-pointer ${
                contextKitchenPaused
                  ? 'bg-[#93000a] text-white border-[#ffb4ab]'
                  : 'bg-[#201f22] hover:bg-[#93000a]/20 text-[#ffb4ab] border-[#353437]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                {contextKitchenPaused ? 'play_circle' : 'pause_circle'}
              </span>
              <span>{contextKitchenPaused ? 'Reanudar Cocina' : 'Pausar Cocina'}</span>
            </button>

            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded bg-[#201f22] font-mono-code text-[11px] text-[#c6c5cf] border border-[#353437]/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>MODO TOUCH</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed top-20 left-3 right-3 sm:left-auto sm:right-6 z-50 px-5 py-3 rounded-lg bg-[#353437] text-white shadow-2xl flex items-center gap-3 font-sans text-[13px] font-semibold border border-[#5c4037]/50 animate-fadeIn">
          <span className="material-symbols-outlined text-[#ff5708] text-[22px] shrink-0">{toastIcon}</span>
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
