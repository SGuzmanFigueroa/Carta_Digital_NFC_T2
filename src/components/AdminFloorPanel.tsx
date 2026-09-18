import React, { useState } from 'react';
import { TableStatus } from '../types';

interface AdminFloorPanelProps {
  tables: TableStatus[];
  onShowToast: (msg: string, icon?: string) => void;
  onSelectTable?: (tableId: string) => void;
}

export const AdminFloorPanel: React.FC<AdminFloorPanelProps> = ({
  tables,
  onShowToast,
  onSelectTable,
}) => {
  const [activeZone, setActiveZone] = useState<'all' | 'salon' | 'terraza' | 'barra'>('all');
  const [selectedTableDetail, setSelectedTableDetail] = useState<TableStatus | null>(null);

  const filteredTables = tables.filter((t) => {
    if (activeZone === 'all') return true;
    return t.zone === activeZone;
  });

  const occupiedCount = tables.filter((t) => t.status !== 'disponible').length;
  const criticalCount = tables.filter((t) => t.status === 'demora').length;
  const freeCount = tables.filter((t) => t.status === 'disponible').length;

  const handleSyncPOS = () => {
    onShowToast('Sincronizando estado de TPVs y terminales KDS...', 'sync');
  };

  const handleExportZ = () => {
    onShowToast('Generando reporte Z consolidado en PDF...', 'file_download');
  };

  const handleCloseShift = () => {
    const confirmClose = confirm('¿Desea iniciar el Cierre de Turno (Corte Z) para el servicio actual?');
    if (confirmClose) {
      onShowToast('Cierre de Turno Z iniciado. Balance cuadradado exitosamente: S/ 4,215.00', 'receipt_long');
    }
  };

  const handlePrioritize = (tableNum: string) => {
    onShowToast(`Alerta de prioridad enviada a Parrilla para Mesa ${tableNum}`, 'priority_high');
  };

  const handleCollectTicket = (tableNum: string, amount: number) => {
    onShowToast(`Cobro registrado para Mesa ${tableNum}: S/ ${amount.toFixed(2)}`, 'point_of_sale');
  };

  const handleOpenTable = (tableNum: string) => {
    onShowToast(`Mesa ${tableNum} abierta. Comensales asignados.`, 'table_restaurant');
  };

  const handleCheckIn = (tableNum: string, guest: string) => {
    onShowToast(`Check-In completado para reserva de ${guest} en Mesa ${tableNum}`, 'how_to_reg');
  };

  return (
    <div className="w-full flex flex-col px-4 lg:px-6 py-4 max-w-[1680px] mx-auto gap-6">
      {/* Executive Header & Meta Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-label-code text-[11px] text-[#ff5708] uppercase tracking-wider font-bold">
              Módulo Ejecutivo
            </span>
            <span className="text-[#353437] text-xs">/</span>
            <span className="font-label-code text-[11px] text-[#c6c5cf]">
              Turno Noche • Servicio 20:00 - 01:00
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-[26px] md:text-[34px] font-bold text-[#e5e1e4] tracking-tight">
              Panel Admin & Estado de Sala
            </h1>
            <span className="px-2 py-0.5 rounded-lg bg-[#1c1b1d] font-label-code text-[11px] text-[#ffb59c] border border-[#5c4037]/40 font-bold">
              ZONA ACTIVA: AUREA MAIN
            </span>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleSyncPOS}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1c1b1d] text-[#e5e1e4] hover:bg-[#2a2a2c] transition-all border border-[#5c4037]/30 text-[13px] font-medium cursor-pointer active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px] text-[#c6c5cf]">sync</span>
            <span>Sincronizar POS</span>
          </button>

          <button
            type="button"
            onClick={handleExportZ}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1c1b1d] text-[#e5e1e4] hover:bg-[#2a2a2c] transition-all border border-[#5c4037]/30 text-[13px] font-medium cursor-pointer active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px] text-[#c6c5cf]">file_download</span>
            <span>Exportar Z / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleCloseShift}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff5708] text-[#511500] font-bold text-[13px] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_-3px_rgba(255,87,8,0.35)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Cierre Turno (Corte Z)</span>
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Ventas del Día with Neon SVG Chart */}
        <div className="p-4 rounded-xl bg-[#1c1b1d] border border-[#5c4037]/25 flex flex-col justify-between relative overflow-hidden group hover:border-[#5c4037]/60 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-label-code text-[11px] text-[#c6c5cf] tracking-wider uppercase font-bold">
                VENTAS DEL DÍA
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] font-bold text-[#e5e1e4]">S/ 3,842.50</span>
                <span className="font-label-code text-[11px] text-[#ff5708] bg-[#ff5708]/15 px-1.5 py-0.5 rounded font-bold">
                  +18.4%
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#2a2a2c] flex items-center justify-center text-[#ff5708]">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>

          {/* Glowing Neon Chart */}
          <div className="my-2.5 w-full h-10">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 200 40">
              <defs>
                <linearGradient id="neonGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ff5708" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ff5708" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0,32 Q25,28 50,30 T100,18 T140,24 T170,10 T200,6 L200,40 L0,40 Z" fill="url(#neonGradient)" />
              <path d="M0,32 Q25,28 50,30 T100,18 T140,24 T170,10 T200,6" fill="none" stroke="#ff5708" strokeLinecap="round" strokeWidth="2.2" />
            </svg>
          </div>

          <div className="pt-2 border-t border-[#5c4037]/20 flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5708]" />
              <span className="text-[#c6c5cf]">Salón:</span>
              <span className="font-label-code text-[#e5e1e4] font-semibold">S/ 2,910.00</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0494fc]" />
              <span className="text-[#c6c5cf]">QR / Deliv:</span>
              <span className="font-label-code text-[#e5e1e4] font-semibold">S/ 932.50</span>
            </div>
          </div>
        </div>

        {/* Card 2: Ticket Promedio */}
        <div className="p-4 rounded-xl bg-[#1c1b1d] border border-[#5c4037]/25 flex flex-col justify-between relative group hover:border-[#5c4037]/60 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-label-code text-[11px] text-[#c6c5cf] tracking-wider uppercase font-bold">
                TICKET PROMEDIO
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] font-bold text-[#e5e1e4]">S/ 48.20</span>
                <span className="font-label-code text-[11px] text-[#c6c5cf]">PEN/comensal</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#2a2a2c] flex items-center justify-center text-[#c6c5cf]">
              <span className="material-symbols-outlined text-[20px]">analytics</span>
            </div>
          </div>

          <div className="my-2.5 flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] text-[#c6c5cf]">
              <span>Rango: S/ 24.00</span>
              <span className="text-[#e5e1e4] font-medium">Media Óptima</span>
              <span>Máx: S/ 118.00</span>
            </div>
            <div className="w-full bg-[#2a2a2c] h-2 rounded-full overflow-hidden p-0.5 flex gap-1">
              <div className="h-full rounded-full bg-[#353437] w-[25%]" />
              <div className="h-full rounded-full bg-[#ff5708] w-[50%]" />
              <div className="h-full rounded-full bg-[#353437] w-[25%]" />
            </div>
          </div>

          <div className="pt-2 border-t border-[#5c4037]/20 flex items-center justify-between text-[12px]">
            <span className="text-[#c6c5cf]">42 Órdenes liquidadas</span>
            <span className="font-label-code text-[11px] text-[#ffb59c] font-bold">Rotación: 2.1x</span>
          </div>
        </div>

        {/* Card 3: Ocupación de Mesas */}
        <div className="p-4 rounded-xl bg-[#1c1b1d] border border-[#5c4037]/25 flex flex-col justify-between relative group hover:border-[#5c4037]/60 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-label-code text-[11px] text-[#c6c5cf] tracking-wider uppercase font-bold">
                OCUPACIÓN DE MESAS
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] font-bold text-[#e5e1e4]">
                  9 <span className="text-[#c6c5cf] text-[18px] font-normal">/ 12</span>
                </span>
                <span className="font-label-code text-[11px] text-[#ff5708] bg-[#ff5708]/15 px-1.5 py-0.5 rounded font-bold">
                  75% CAP
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#2a2a2c] flex items-center justify-center text-[#ffb59c]">
              <span className="material-symbols-outlined text-[20px]">table_restaurant</span>
            </div>
          </div>

          {/* Mini table blocks 1 to 12 */}
          <div className="my-2.5 flex flex-col gap-1.5">
            <div className="grid grid-cols-12 gap-1 h-3">
              <span className="h-full rounded-xs bg-[#ff5708]" title="Mesa 1 - Ocupada" />
              <span className="h-full rounded-xs bg-[#ff5708]" title="Mesa 2 - Ocupada" />
              <span className="h-full rounded-xs bg-[#ffb4ab]" title="Mesa 3 - Demora" />
              <span className="h-full rounded-xs bg-[#ff5708]" title="Mesa 4 - Ocupada" />
              <span className="h-full rounded-xs bg-[#0494fc]" title="Mesa 5 - QR" />
              <span className="h-full rounded-xs bg-[#ff5708]" title="Mesa 6 - Ocupada" />
              <span className="h-full rounded-xs bg-[#ffb59c]" title="Mesa 7 - Cuenta" />
              <span className="h-full rounded-xs bg-[#ff5708]" title="Mesa 8 - Ocupada" />
              <span className="h-full rounded-xs bg-[#ff5708]" title="Mesa 9 - Ocupada" />
              <span className="h-full rounded-xs bg-[#353437]" title="Mesa 10 - Libre" />
              <span className="h-full rounded-xs bg-[#353437]" title="Mesa 11 - Libre" />
              <span className="h-full rounded-xs bg-[#353437]" title="Mesa 12 - Libre" />
            </div>
            <div className="flex justify-between font-label-code text-[11px] text-[#c6c5cf] pt-0.5">
              <span>7 Salón</span>
              <span>2 Terraza</span>
              <span>3 Libres</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#5c4037]/20 flex items-center justify-between text-[12px]">
            <span className="text-[#c6c5cf]">38 Comensales sentados</span>
            <span className="font-label-code text-[11px] text-[#0494fc] font-bold">1 Reserva prox (21:30)</span>
          </div>
        </div>

        {/* Card 4: Tiempo KDS Cocina */}
        <div className="p-4 rounded-xl bg-[#1c1b1d] border border-[#5c4037]/25 flex flex-col justify-between relative group hover:border-[#5c4037]/60 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-label-code text-[11px] text-[#c6c5cf] tracking-wider uppercase font-bold">
                TIEMPO KDS COCINA
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] font-bold text-[#e5e1e4]">
                  14.2 <span className="text-[#c6c5cf] text-[18px] font-normal">min</span>
                </span>
                <span className="font-label-code text-[11px] text-[#ffb59c] bg-[#ffb59c]/15 px-1.5 py-0.5 rounded font-bold">
                  -1.8m Ritmo
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#2a2a2c] flex items-center justify-center text-[#c6c5cf]">
              <span className="material-symbols-outlined text-[20px]">timer</span>
            </div>
          </div>

          <div className="my-2.5 flex flex-col gap-1">
            <div className="flex justify-between font-label-code text-[11px] text-[#c6c5cf]">
              <span>Ritmo Operativo</span>
              <span className="text-[#ffb59c] font-semibold">Meta &lt; 16.0 min</span>
            </div>
            <div className="w-full bg-[#353437] h-2 rounded-full overflow-hidden">
              <div className="bg-[#ff5708] h-full rounded-full transition-all duration-500" style={{ width: '71%' }} />
            </div>
          </div>

          <div className="pt-2 border-t border-[#5c4037]/20 flex items-center justify-between text-[12px]">
            <span className="text-[#c6c5cf]">Tickets en cola: 4</span>
            <span className="font-label-code text-[11px] text-[#ffb4ab] font-bold">1 ticket demorado</span>
          </div>
        </div>
      </div>

      {/* Main Split: Tables Floor Area (Left) + Top Selection & Station Workload (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Tables Floor Area (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Floor Sub-Tabs & Status legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl bg-[#1c1b1d] border border-[#5c4037]/20">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveZone('all')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  activeZone === 'all'
                    ? 'bg-[#2a2a2c] text-[#e5e1e4] border border-[#5c4037]/30'
                    : 'text-[#c6c5cf] hover:text-[#e5e1e4] hover:bg-[#201f22]'
                }`}
              >
                Todos ({tables.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveZone('salon')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  activeZone === 'salon'
                    ? 'bg-[#2a2a2c] text-[#e5e1e4] border border-[#5c4037]/30'
                    : 'text-[#c6c5cf] hover:text-[#e5e1e4] hover:bg-[#201f22]'
                }`}
              >
                Salón Principal (8)
              </button>
              <button
                type="button"
                onClick={() => setActiveZone('terraza')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  activeZone === 'terraza'
                    ? 'bg-[#2a2a2c] text-[#e5e1e4] border border-[#5c4037]/30'
                    : 'text-[#c6c5cf] hover:text-[#e5e1e4] hover:bg-[#201f22]'
                }`}
              >
                Terraza Lounge (4)
              </button>
              <button
                type="button"
                onClick={() => setActiveZone('barra')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  activeZone === 'barra'
                    ? 'bg-[#2a2a2c] text-[#e5e1e4] border border-[#5c4037]/30'
                    : 'text-[#c6c5cf] hover:text-[#e5e1e4] hover:bg-[#201f22]'
                }`}
              >
                Barra (6)
              </button>
            </div>

            <div className="flex items-center gap-2 px-2 font-label-code text-[11px]">
              <span className="flex items-center gap-1 text-[#e5beb2]">
                <span className="w-2 h-2 rounded-full bg-[#ff5708]" /> Ocupadas ({occupiedCount})
              </span>
              <span className="text-[#353437]">•</span>
              <span className="flex items-center gap-1 text-[#ffb4ab]">
                <span className="w-2 h-2 rounded-full bg-[#ffb4ab]" /> Crítica ({criticalCount})
              </span>
              <span className="text-[#353437]">•</span>
              <span className="flex items-center gap-1 text-[#c6c5cf]">
                <span className="w-2 h-2 rounded-full bg-[#353437]" /> Libres ({freeCount})
              </span>
            </div>
          </div>

          {/* Cards Grid: Tables Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTables.map((tbl) => {
              // Different styles depending on status
              if (tbl.status === 'demora') {
                return (
                  <div
                    key={tbl.id}
                    onClick={() => {
                      setSelectedTableDetail(tbl);
                      onSelectTable?.(tbl.id);
                    }}
                    className="rounded-xl bg-[#1c1b1d] border border-[#ffb4ab]/50 p-3.5 flex flex-col justify-between gap-3 shadow-[0_0_18px_-4px_rgba(255,180,171,0.15)] group transition-all hover:border-[#ff5708] cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-[#93000a]/30 border border-[#ffb4ab]/30 flex items-center justify-center font-label-code text-[18px] font-bold text-[#ffb4ab]">
                          {tbl.number}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-[17px] font-medium text-[#e5e1e4]">Mesa {tbl.number}</span>
                            <span className="font-label-code text-[11px] text-[#c6c5cf]">[{tbl.pax} PAX]</span>
                          </div>
                          <span className="text-[12px] text-[#c6c5cf]">Mesero: {tbl.waiter}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded font-label-code text-[11px] bg-[#93000a] text-[#ffdad6] border border-[#ffb4ab]/40 flex items-center gap-1 font-bold">
                        <span className="material-symbols-outlined text-[13px] animate-pulse">warning</span>
                        DEMORA 18m
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-[#0e0e10]/80 border border-[#ffb4ab]/20 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-label-code text-[10px] text-[#ffb4ab] font-bold uppercase">RETRASO KDS: PARRILLA</span>
                        <span className="text-[12px] text-[#e5e1e4] truncate max-w-[130px]">1x Wagyu Ribeye A5</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-label-code text-[16px] font-bold text-[#e5e1e4]">S/ {tbl.amount?.toFixed(2)}</span>
                        <span className="font-label-code text-[10px] text-[#ffb4ab] font-bold">18 min en prep</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="font-label-code text-[11px] text-[#ffb4ab] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">priority_high</span>
                        Avisar a Cocina
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrioritize(tbl.number);
                        }}
                        className="px-2.5 py-1 rounded bg-[#ffb4ab]/20 text-[#ffb4ab] hover:bg-[#ffb4ab]/30 font-label-code text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        PRIORIZAR
                      </button>
                    </div>
                  </div>
                );
              }

              if (tbl.status === 'cuenta') {
                return (
                  <div
                    key={tbl.id}
                    onClick={() => {
                      setSelectedTableDetail(tbl);
                      onSelectTable?.(tbl.id);
                    }}
                    className="rounded-xl bg-[#1c1b1d] border border-[#ffb59c]/40 p-3.5 flex flex-col justify-between gap-3 bg-gradient-to-b from-[#1c1b1d] to-[#ff5708]/5 group transition-all hover:border-[#ff5708] cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-[#ffb59c]/20 border border-[#ffb59c]/30 flex items-center justify-center font-label-code text-[18px] font-bold text-[#ffb59c]">
                          {tbl.number}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-[17px] font-medium text-[#e5e1e4]">Mesa {tbl.number}</span>
                            <span className="font-label-code text-[11px] text-[#c6c5cf]">[{tbl.pax} PAX]</span>
                          </div>
                          <span className="text-[12px] text-[#c6c5cf]">Mesero: {tbl.waiter}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded font-label-code text-[11px] bg-[#ffb59c]/20 text-[#ffb59c] border border-[#ffb59c]/40 font-bold">
                        CUENTA PEDIDA
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-[#0e0e10]/80 border border-[#5c4037]/20 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-label-code text-[10px] text-[#c6c5cf] uppercase">MÉTODO PREFERIDO</span>
                        <span className="text-[12px] text-[#e5e1e4]">Tarjeta Visa / Split (2)</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-label-code text-[17px] font-bold text-[#ff5708]">S/ {tbl.amount?.toFixed(2)}</span>
                        <span className="font-label-code text-[10px] text-[#c6c5cf]">Propina sug. S/ 51</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="font-label-code text-[11px] text-[#c6c5cf]">Ticket impreso</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCollectTicket(tbl.number, tbl.amount || 342);
                        }}
                        className="px-3 py-1 rounded-lg bg-[#ff5708] text-[#511500] font-semibold text-[12px] hover:brightness-110 transition-all cursor-pointer shadow-md"
                      >
                        Cobrar Ticket
                      </button>
                    </div>
                  </div>
                );
              }

              if (tbl.status === 'qr') {
                return (
                  <div
                    key={tbl.id}
                    onClick={() => {
                      setSelectedTableDetail(tbl);
                      onSelectTable?.(tbl.id);
                    }}
                    className="rounded-xl bg-[#1c1b1d] border border-[#0494fc]/30 p-3.5 flex flex-col justify-between gap-3 group transition-all hover:border-[#0494fc] cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-[#0494fc]/20 flex items-center justify-center font-label-code text-[18px] font-bold text-[#a1c9ff]">
                          {tbl.number}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-[17px] font-medium text-[#e5e1e4]">Mesa {tbl.number}</span>
                            <span className="font-label-code text-[11px] text-[#c6c5cf]">[{tbl.pax} PAX]</span>
                          </div>
                          <span className="text-[12px] text-[#a1c9ff]">{tbl.waiter}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded font-label-code text-[11px] bg-[#0494fc]/15 text-[#a1c9ff] border border-[#0494fc]/30 flex items-center gap-1 font-bold">
                        <span className="material-symbols-outlined text-[13px]">qr_code_scanner</span>
                        QR DISPATCH
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-[#0e0e10]/80 border border-[#5c4037]/20 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-label-code text-[10px] text-[#c6c5cf]">SESIÓN DIGITAL #209</span>
                        <span className="text-[12px] text-[#e5e1e4]">{tbl.dishesCount}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-label-code text-[16px] font-bold text-[#e5e1e4]">S/ {tbl.amount?.toFixed(2)}</span>
                        <span className="font-label-code text-[10px] text-[#c6c5cf]">{tbl.timeActive}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="font-label-code text-[11px] text-[#c6c5cf]">Validación Auto</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowToast(`Abriendo comanda QR de Mesa ${tbl.number}`, 'open_in_new');
                        }}
                        className="p-1.5 rounded-lg bg-[#2a2a2c] hover:bg-[#353437] text-[#c6c5cf] hover:text-[#e5e1e4] transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      </button>
                    </div>
                  </div>
                );
              }

              if (tbl.status === 'disponible') {
                return (
                  <div
                    key={tbl.id}
                    onClick={() => {
                      setSelectedTableDetail(tbl);
                      onSelectTable?.(tbl.id);
                    }}
                    className="rounded-xl bg-[#1c1b1d] border border-[#5c4037]/15 p-3.5 flex flex-col justify-between gap-3 opacity-85 hover:opacity-100 transition-all cursor-pointer hover:border-[#5c4037]/40"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-[#2a2a2c] flex items-center justify-center font-label-code text-[18px] font-bold text-[#c6c5cf]">
                          {tbl.number}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-[17px] font-medium text-[#e5e1e4]">Mesa {tbl.number}</span>
                            <span className="font-label-code text-[11px] text-[#c6c5cf]">[{tbl.capacity} PAX]</span>
                          </div>
                          <span className="text-[12px] text-[#c6c5cf]">{tbl.waiter}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded font-label-code text-[11px] bg-[#2a2a2c] text-[#c6c5cf]">
                        DISPONIBLE
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-[#0e0e10]/40 border border-dashed border-[#5c4037]/20 flex items-center justify-center py-4">
                      <span className="font-label-code text-[11px] text-[#c6c5cf]">
                        {tbl.reservationTime
                          ? `RESERVA: ${tbl.reservationTime} (${tbl.reservationName})`
                          : 'MESA LISTA PARA ASIGNAR'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="font-label-code text-[11px] text-[#c6c5cf]">
                        {tbl.reservationTime ? 'Hold: 45 min' : 'Limpia y sanitizada'}
                      </span>
                      {tbl.reservationTime ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckIn(tbl.number, tbl.reservationName || 'Comensal');
                          }}
                          className="px-3.5 py-1 rounded bg-[#2a2a2c] hover:bg-[#353437] text-[#e5e1e4] text-[12px] font-medium transition-colors cursor-pointer"
                        >
                          Check-In
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTable(tbl.number);
                          }}
                          className="px-3.5 py-1 rounded bg-[#2a2a2c] hover:bg-[#353437] text-[#e5e1e4] text-[12px] font-medium transition-colors cursor-pointer"
                        >
                          Abrir Mesa
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              // Standard Comiendo
              return (
                <div
                  key={tbl.id}
                  onClick={() => {
                    setSelectedTableDetail(tbl);
                    onSelectTable?.(tbl.id);
                  }}
                  className="rounded-xl bg-[#1c1b1d] border border-[#5c4037]/20 p-3.5 flex flex-col justify-between gap-3 hover:border-[#ff5708]/40 transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-[#2a2a2c] flex items-center justify-center font-label-code text-[18px] font-bold text-[#e5e1e4]">
                        {tbl.number}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="text-[17px] font-medium text-[#e5e1e4]">Mesa {tbl.number}</span>
                          <span className="font-label-code text-[11px] text-[#c6c5cf]">[{tbl.pax} PAX]</span>
                        </div>
                        <span className="text-[12px] text-[#c6c5cf]">Mesero: {tbl.waiter}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded font-label-code text-[11px] bg-[#ff5708]/15 text-[#ff5708] border border-[#ff5708]/30 font-bold">
                      COMIENDO
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#0e0e10]/80 border border-[#5c4037]/20 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-label-code text-[10px] text-[#c6c5cf]">COMANDAS #1084</span>
                      <span className="text-[12px] text-[#e5e1e4]">{tbl.dishesCount || '3 platos • 2 maridajes'}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-label-code text-[16px] font-bold text-[#e5e1e4]">S/ {tbl.amount?.toFixed(2)}</span>
                      <span className="font-label-code text-[10px] text-[#c6c5cf]">{tbl.timeActive || '32 min act.'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1 font-label-code text-[11px] text-[#c6c5cf]">
                      <span className="material-symbols-outlined text-[15px] text-[#a1c9ff]">check_circle</span>
                      <span>Platos Servidos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowToast(`Visualizando comanda activa de Mesa ${tbl.number}`, 'visibility');
                        }}
                        className="p-1.5 rounded-lg bg-[#2a2a2c] hover:bg-[#353437] text-[#c6c5cf] hover:text-[#e5e1e4] transition-colors cursor-pointer"
                        title="Ver Comanda"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCollectTicket(tbl.number, tbl.amount || 168);
                        }}
                        className="p-1.5 rounded-lg bg-[#2a2a2c] hover:bg-[#353437] text-[#c6c5cf] hover:text-[#e5e1e4] transition-colors cursor-pointer"
                        title="Cobrar / Precuenta"
                      >
                        <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Top Selection & Station Workload (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Top Selection: Platos Populares Hoy */}
          <div className="p-4 rounded-xl bg-[#1c1b1d] border border-[#5c4037]/25 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-code text-[11px] text-[#ff5708] font-bold tracking-wider uppercase">
                  TOP SELECTION
                </span>
                <h2 className="text-[18px] text-[#e5e1e4] font-semibold">Platos Populares Hoy</h2>
              </div>
              <span className="material-symbols-outlined text-[#c6c5cf] text-[20px]">local_fire_department</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Dish 1 */}
              <div className="p-2 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] transition-colors flex items-center gap-3">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDcYPFrcetdgC1dazh0ANWzgwRHx4V-L3cnceNamoMrs5PbK6Pj0OxoLpB3w9BBpc-2x3NTwXneDFMMfHNl2qNkle7Y1vbe6ziJYqyI84o_9MSrl4zNTm-VJKLATujDUKDux_S5dT5aDZ4eKuxcyNs-D4iIMfoEElxRqe49eBMjs0yIVqMaNq_iYLU5IJf8tPiNhU1LTXAGOUwV9q6fYDF9ZXhbcu1x3Ou4VX1ebIGsV9pHlD-fwZNFJQ"
                  alt="Wagyu Ribeye A5"
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] text-[#e5e1e4] font-medium truncate">Wagyu Ribeye A5</h3>
                    <span className="font-label-code text-[12px] text-[#ff5708] font-bold">S/ 361.00</span>
                  </div>
                  <div className="w-full bg-[#0e0e10] h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-[#ff5708] h-full rounded-full" style={{ width: '41%' }} />
                  </div>
                  <div className="flex items-center justify-between font-label-code text-[10px] text-[#c6c5cf] mt-1">
                    <span>24 órdenes</span>
                    <span>41% share</span>
                  </div>
                </div>
              </div>

              {/* Dish 2 */}
              <div className="p-2 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] transition-colors flex items-center gap-3">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4aai31UClJq9jeVmvV9BCGReZlaeCyrj4ntsAczyaUucISIFKWxMcAsGrzch_4sLC7hilL5ojNXjDM5lE90-Nn5tM7CYc2Fxk5s71v_P2UAXvh2f5yOaKMuaDcXhF6v2cReqmoT6WzMxjdMPzmuXSvxzAfNiYPs9ntMkbVL5JEcB_RxcjskoiN4iZxFYOnWV7whfJyKbajABDeDU2-9gJ4Xdj1o-s2nwDXJ5UcWtMKADa5zx2H2P4VA"
                  alt="Tartar Nikkei Atún"
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] text-[#e5e1e4] font-medium truncate">Tartar Nikkei Atún</h3>
                    <span className="font-label-code text-[12px] text-[#e5e1e4] font-bold">S/ 361.00</span>
                  </div>
                  <div className="w-full bg-[#0e0e10] h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-[#ffb59c] h-full rounded-full" style={{ width: '32%' }} />
                  </div>
                  <div className="flex items-center justify-between font-label-code text-[10px] text-[#c6c5cf] mt-1">
                    <span>19 órdenes</span>
                    <span>32% share</span>
                  </div>
                </div>
              </div>

              {/* Dish 3 */}
              <div className="p-2 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] transition-colors flex items-center gap-3">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMKtviznLSzjme1WY4qwziJVcdvyRsrswTTveII2tFwGTpfeAPDBaSKFv5dMvO0m4VftFrK5Fas1JHet4bb1c2lVAe0xVWz9kvh-tYOG8K3v06o9Js5bMI9SsRCT20Dz7-BORwOTllIxwuSiu3-w4PyQ7Iz-zFbyc0-B1XoiCR9ZHXL-mNSU5lYZhs5AL0AgYE3upip_vS1hhdj_-VGpsnU7B-3i1cWmVRfdPS4KBKVfbeF723hWlY2Q"
                  alt="Smoked Old Fashioned"
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] text-[#e5e1e4] font-medium truncate">Smoked Old Fashioned</h3>
                    <span className="font-label-code text-[12px] text-[#0494fc] font-bold">S/ 434.00</span>
                  </div>
                  <div className="w-full bg-[#0e0e10] h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-[#0494fc] h-full rounded-full" style={{ width: '54%' }} />
                  </div>
                  <div className="flex items-center justify-between font-label-code text-[10px] text-[#c6c5cf] mt-1">
                    <span>31 órdenes (Bar)</span>
                    <span>54% share</span>
                  </div>
                </div>
              </div>

              {/* Dish 4 */}
              <div className="p-2 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] transition-colors flex items-center gap-3">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmpeSzAzpL0X6rxaGI6vuZscglQ_dMm_6EV-6bcY2LVaBxN4wVcqQnZI6Vc1zK3r8nnjF9lAEunz1lTMIEPJD7aA__RCksdcKUwYi6kwfhs-qSueHQzt44hnE8oeqtWgwpNc02b6ry1W5t86EkjocLNSZAslwyNO4bO9iLVoBppJ-V30Ez9H5V6pN8Kk-wPVqXcp0Zq0aP10dwuxMW0NVxzsMBnpV_5HT2FG2EwwS0PDTM9zRFTi2ZSA"
                  alt="Pulpo a la Brasa"
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] text-[#e5e1e4] font-medium truncate">Pulpo a la Brasa</h3>
                    <span className="font-label-code text-[12px] text-[#e5e1e4] font-bold">S/ 336.00</span>
                  </div>
                  <div className="w-full bg-[#0e0e10] h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-[#c6c5cf] h-full rounded-full" style={{ width: '24%' }} />
                  </div>
                  <div className="flex items-center justify-between font-label-code text-[10px] text-[#c6c5cf] mt-1">
                    <span>14 órdenes</span>
                    <span>24% share</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Carga de Trabajo (Estaciones KDS) & Sugerencia IA */}
          <div className="p-4 rounded-xl bg-[#1c1b1d] border border-[#5c4037]/25 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-code text-[11px] text-[#c6c5cf] tracking-wider uppercase font-bold">
                CARGA DE TRABAJO (ESTACIONES KDS)
              </span>
              <span className="w-2 h-2 rounded-full bg-[#ff5708] animate-pulse" />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#e5e1e4]">Parrilla & Horno Josper</span>
                  <span className="font-label-code text-[12px] text-[#ffb4ab] font-bold">85% (Alta Presión)</span>
                </div>
                <div className="w-full bg-[#2a2a2c] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#ff5708] h-full rounded-full" style={{ width: '85%' }} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#e5e1e4]">Cuarto Frío & Entrantes</span>
                  <span className="font-label-code text-[12px] text-[#ffb59c] font-bold">40% (Óptimo)</span>
                </div>
                <div className="w-full bg-[#2a2a2c] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#ffb59c] h-full rounded-full" style={{ width: '40%' }} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#e5e1e4]">Barra & Coctelería de Autor</span>
                  <span className="font-label-code text-[12px] text-[#a1c9ff] font-bold">25% (Fluido)</span>
                </div>
                <div className="w-full bg-[#2a2a2c] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#0494fc] h-full rounded-full" style={{ width: '25%' }} />
                </div>
              </div>
            </div>

            {/* AI Recommendation callout */}
            <div className="p-3 rounded-lg bg-[#0e0e10]/90 border border-[#5c4037]/25 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#ff5708] text-[20px] shrink-0 mt-0.5">
                smart_toy
              </span>
              <p className="text-[12px] text-[#c6c5cf] leading-relaxed">
                <strong className="text-[#e5e1e4]">Sugerencia IA:</strong> Derivar entrantes fríos para nivelar el tiempo de salida de carnes en parrilla y desahogar el pase térmico.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Footer Bar */}
      <footer className="w-full bg-[#0e0e10] py-3 px-4 rounded-xl border border-[#353437]/40 shadow-sm mt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-label-code">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5708]" />
              <span className="text-[#e5beb2]">SISTEMA OPERATIVO: NORMAL</span>
            </div>
            <span className="text-[#353437]">•</span>
            <span className="text-[#c6c5cf]">RED DISPATCHER LATENCY: 24ms</span>
            <span className="text-[#353437] hidden md:inline">•</span>
            <span className="text-[#c6c5cf] hidden md:inline">SYNC ENGINE: SECURE SSE</span>
          </div>
          <div className="flex items-center gap-3 text-[#c6c5cf]">
            <span className="text-[#ffb59c]">GastroPulse v2.4.0-prod</span>
            <span className="text-[#353437]">•</span>
            <span className="font-sans text-[12px]">© 2024 GastroPulse POS Technologies</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
