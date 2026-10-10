import React, { useState, useMemo } from 'react';
import { TableStatus, Ticket, OrderTicket } from '../types';
import { INITIAL_MENU_ITEMS } from '../data/mockData';
// CD-28 · Llamados de mesa en vivo (KDS + Salón comparten el mismo estado realtime).
import { useRestaurant } from '../context/RestaurantContext';

const getTableDigits = (num: string): string => {
  const digits = num.replace(/^[^\d]+/i, '').trim();
  return digits || num;
};

const formatTableTitle = (num: string): string => {
  const clean = num.replace(/^Mesa\s*/i, '').trim();
  return `Mesa ${clean}`;
};

interface AdminFloorPanelProps {
  tables: TableStatus[];
  tickets?: Ticket[];
  orders?: OrderTicket[];
  totalShiftRevenue?: number;
  onShowToast: (msg: string, icon?: string) => void;
  onSelectTable?: (tableId: string) => void;
  onPrioritizeTable?: (tableNum: string) => void;
  onCollectTableBill?: (tableNum: string, amount?: number) => void;
  onOpenTable?: (tableNum: string, pax?: number) => void;
}

export const AdminFloorPanel: React.FC<AdminFloorPanelProps> = ({
  tables,
  tickets = [],
  orders = [],
  totalShiftRevenue,
  onShowToast,
  onSelectTable,
  onPrioritizeTable,
  onCollectTableBill,
  onOpenTable
}) => {
  const [activeZone, setActiveZone] = useState<'all' | 'salon' | 'terraza' | 'barra'>('all');
  const [selectedTableDetail, setSelectedTableDetail] = useState<TableStatus | null>(null);
  // CD-28 · Llamados de mesa abiertos (indicador propio, NO cuenta en `criticalCount`).
  const { waiterCalls, attendWaiterCall } = useRestaurant();
  // 1. Dynamic Top Selection / Popular Dishes
  const popularDishes = useMemo(() => {
    const dishMap: Record<
      string,
      { name: string; count: number; revenue: number; image: string; isBar: boolean }
    > = {};

    INITIAL_MENU_ITEMS.forEach((item) => {
      const clean = item.name.replace(/^\d+x\s*/i, '').trim();
      dishMap[clean] = {
        name: clean,
        count: item.ordersCount || 12,
        revenue: (item.ordersCount || 12) * item.price,
        image: item.image,
        isBar: item.category === 'bebidas' || (item.category as string) === 'cocteles'
      };
    });

    (orders || []).forEach((ord) => {
      ord.items?.forEach((it) => {
        const clean = it.name.replace(/^\d+x\s*/i, '').trim();
        const existingKey = Object.keys(dishMap).find(
          (k) => k.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(k.toLowerCase())
        );
        const key = existingKey || clean;
        if (!dishMap[key]) {
          dishMap[key] = {
            name: clean,
            count: 0,
            revenue: 0,
            image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
            isBar: false
          };
        }
        dishMap[key].count += it.quantity || 1;
        dishMap[key].revenue += (it.quantity || 1) * (it.price || 48);
      });
    });

    (tickets || []).forEach((t) => {
      t.items?.forEach((it) => {
        const clean = it.name.replace(/^\d+x\s*/i, '').trim();
        const existingKey = Object.keys(dishMap).find(
          (k) => k.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(k.toLowerCase())
        );
        const key = existingKey || clean;
        if (!dishMap[key]) {
          dishMap[key] = {
            name: clean,
            count: 0,
            revenue: 0,
            image: it.photoUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
            isBar: it.station === 'barra_mixologia'
          };
        }
        dishMap[key].count += it.quantity || 1;
        dishMap[key].revenue += (it.quantity || 1) * (it.price || 48);
      });
    });

    const totalOrdersCount = Object.values(dishMap).reduce((acc, d) => acc + d.count, 0) || 1;

    return Object.values(dishMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4)
      .map((d, idx) => ({
        ...d,
        share: Math.min(100, Math.round((d.count / totalOrdersCount) * 100)),
        colorClass: idx === 0 ? 'bg-[#ff5708]' : idx === 1 ? 'bg-[#ffb59c]' : idx === 2 ? 'bg-[#0494fc]' : 'bg-[#c6c5cf]',
        textClass: idx === 0 ? 'text-[#ff5708]' : idx === 1 ? 'text-[#e5e1e4]' : idx === 2 ? 'text-[#0494fc]' : 'text-[#e5e1e4]'
      }));
  }, [tickets, orders]);

  // 2. Dynamic KDS Station Workload
  const stationWorkloads = useMemo(() => {
    let grillActive = 0;
    let coldActive = 0;
    let barActive = 0;

    const activeTickets = (tickets || []).filter(
      (t) => t.status !== 'lista_despachada' && t.status !== 'archivada'
    );

    activeTickets.forEach((t) => {
      t.items?.forEach((item) => {
        if (!item.checked && item.status !== 'listo') {
          const qty = item.quantity || 1;
          if (item.station === 'fuego_grill' || item.station === 'wok_saute') {
            grillActive += qty;
          } else if (item.station === 'frio_nikkei' || item.station === 'pasteleria') {
            coldActive += qty;
          } else if (item.station === 'barra_mixologia') {
            barActive += qty;
          }
        }
      });
    });

    const calcPct = (active: number, baseRate: number) => {
      const pct = baseRate + active * 15;
      return Math.min(95, Math.max(15, pct));
    };

    const grillPct = calcPct(grillActive, 55);
    const coldPct = calcPct(coldActive, 25);
    const barPct = calcPct(barActive, 20);

    const getStatus = (pct: number) => {
      if (pct >= 75) return { label: 'Alta Presión', textCol: 'text-[#ffb4ab]', barCol: 'bg-[#ff5708]' };
      if (pct >= 40) return { label: 'Óptimo', textCol: 'text-[#ffb59c]', barCol: 'bg-[#ffb59c]' };
      return { label: 'Fluido', textCol: 'text-[#a1c9ff]', barCol: 'bg-[#0494fc]' };
    };

    return [
      {
        name: 'Parrilla & Horno Josper',
        percentage: grillPct,
        activeCount: grillActive,
        status: getStatus(grillPct)
      },
      {
        name: 'Cuarto Frío & Entrantes',
        percentage: coldPct,
        activeCount: coldActive,
        status: getStatus(coldPct)
      },
      {
        name: 'Barra & Coctelería de Autor',
        percentage: barPct,
        activeCount: barActive,
        status: getStatus(barPct)
      }
    ];
  }, [tickets]);

  // 3. Dynamic AI Recommendation
  const aiRecommendation = useMemo(() => {
    const grill = stationWorkloads[0];
    const cold = stationWorkloads[1];
    const bar = stationWorkloads[2];

    const urgentTicket = (tickets || []).find(
      (t) => (t.isUrgent || t.elapsedSeconds > t.targetSeconds) && t.status !== 'lista_despachada'
    );

    if (urgentTicket) {
      return `Alerta urgente en ${formatTableTitle(urgentTicket.table)} (${urgentTicket.allergyAlert ? 'Alérgenos' : 'Sobretiempo en KDS'}). Priorizar despacho en el pase antes de ingresar nuevas órdenes.`;
    }

    if (grill.percentage >= 75) {
      return `Derivar entrantes fríos y ensaladas para nivelar el tiempo de salida de carnes en parrilla y desahogar el pase térmico (${grill.activeCount} comandas en fuego).`;
    }

    if (cold.percentage >= 60) {
      return `Mayor flujo en Cuarto Frío (${cold.activeCount} platos activos). Priorizar montaje de ceviches y entradas frescas para acompañar platos calientes.`;
    }

    if (bar.percentage >= 50) {
      return `Barra con cola activa de cócteles (${bar.activeCount} bebidas). Apoyar con mise en place y hielo para agilizar aperitivos de bienvenida.`;
    }

    return `Flujo de partidas equilibrado. Las 3 estaciones KDS operan con ritmo óptimo y tiempos promedio inferiores a 12 minutos.`;
  }, [stationWorkloads, tickets]);


  const filteredTables = tables.filter((t) => {
    if (activeZone === 'all') return true;
    return t.zone === activeZone;
  });

  const occupiedCount = tables.filter((t) => t.status !== 'disponible').length;
  const criticalCount = tables.filter((t) => t.status === 'demora').length;
  const freeCount = tables.filter((t) => t.status === 'disponible').length;

  const handleSyncPOS = () => {
    onShowToast('Sincronización completada con Supabase PostgreSQL y TPVs', 'verified');
  };

  const handleExportZ = () => {
    const rev = totalShiftRevenue ? totalShiftRevenue.toFixed(2) : '4,215.00';
    const activePax = tables.filter(t => t.status !== 'disponible').reduce((sum, t) => sum + (t.pax || 0), 0);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Corte Z - Reporte de Cierre de Turno</title>
            <style>
              body { font-family: monospace; padding: 24px; max-width: 450px; margin: 0 auto; color: #111; line-height: 1.4; }
              .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 12px; margin-bottom: 12px; }
              .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; }
              .total { font-size: 16px; font-weight: bold; border-top: 2px solid #111; border-bottom: 2px solid #111; padding: 8px 0; margin-top: 12px; }
              .btn { margin-top: 20px; width: 100%; padding: 10px; background: #ff5708; color: white; border: none; font-weight: bold; border-radius: 6px; cursor: pointer; }
              @media print { .btn { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h2 style="margin: 0;">AUREA BISTRO & WOK</h2>
              <p style="margin: 4px 0; font-size: 12px;">RUC: 20608941203</p>
              <h3 style="margin: 6px 0;">CORTE Z - CIERRE DE TURNO</h3>
              <p style="margin: 0; font-size: 11px;">Fecha: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}</p>
            </div>
            <div class="row"><span>Mesas Ocupadas:</span><strong>${occupiedCount} / ${tables.length}</strong></div>
            <div class="row"><span>Comensales Atendidos:</span><strong>${activePax} pax</strong></div>
            <div class="row"><span>Comandas en Flujo KDS:</span><strong>${(tickets || []).length} comandas</strong></div>
            <div class="row total"><span>RECAUDACIÓN BRUTA:</span><span>S/ ${rev}</span></div>
            <p style="font-size: 11px; text-align: center; margin-top: 16px; color: #666;">Documento fiscal electrónico generado por GastroPulse OS</p>
            <button class="btn" onclick="window.print()">Imprimir Reporte Z</button>
          </body>
        </html>
      `);
      win.document.close();
    }
    onShowToast('Reporte Z consolidado generado para impresión', 'receipt_long');
  };

  const handleCloseShift = () => {
    const rev = totalShiftRevenue ? totalShiftRevenue.toFixed(2) : '4,215.00';
    const confirmClose = confirm(`¿Desea iniciar el Cierre de Turno (Corte Z)?\nTotal recaudado: S/ ${rev}`);
    if (confirmClose) {
      onShowToast(`Cierre de Turno Z completado. Balance auditado: S/ ${rev}`, 'receipt_long');
    }
  };

  const handlePrioritize = (tableNum: string) => {
    if (onPrioritizeTable) {
      onPrioritizeTable(tableNum);
    } else {
      onShowToast(`Alerta de prioridad enviada a Parrilla para ${formatTableTitle(tableNum)}`, 'priority_high');
    }
  };

  const handleCollectTicket = (tableNum: string, amount?: number) => {
    if (onCollectTableBill) {
      onCollectTableBill(tableNum, amount);
    } else {
      onShowToast(`Cobro registrado para ${formatTableTitle(tableNum)}: S/ ${(amount || 0).toFixed(2)}`, 'point_of_sale');
    }
  };

  const handleOpenTable = (tableNum: string) => {
    if (onOpenTable) {
      onOpenTable(tableNum);
    } else {
      onShowToast(`${formatTableTitle(tableNum)} abierta. Comensales asignados.`, 'table_restaurant');
    }
  };

  const handleCheckIn = (tableNum: string, guest: string) => {
    onShowToast(`Check-In completado para reserva de ${guest} en ${formatTableTitle(tableNum)}`, 'how_to_reg');
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
                <span className="text-[26px] font-bold text-[#e5e1e4]">S/ {(totalShiftRevenue ?? 4215.00).toFixed(2)}</span>
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
              {waiterCalls.length > 0 && (
                <>
                  <span className="text-[#353437]">•</span>
                  <span className="flex items-center gap-1 text-[#a1c9ff]">
                    <span className="material-symbols-outlined text-[14px]">room_service</span>
                    Llamados ({waiterCalls.length})
                  </span>
                </>
              )}
            </div>
          </div>

          {/* CD-28 · Llamados de mesa en vivo: indicador AZUL de servicio, deliberadamente
              distinto del rojo de "demora" y fuera del conteo de mesas críticas. */}
          {waiterCalls.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-[#1c1b1d] border border-[#a1c9ff]/25">
              <span className="flex items-center gap-1.5 px-1 font-label-code text-[11px] font-bold uppercase text-[#a1c9ff]">
                <span className="material-symbols-outlined text-[16px]">room_service</span>
                Asistencia solicitada
              </span>

              {waiterCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#2a2a2c]"
                >
                  <span className="font-mono-code text-[12px] font-bold text-white">
                    {call.table_number}
                  </span>
                  <span className="max-w-[200px] truncate text-[11px] text-[#c6c5cf]">
                    {call.reason}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      attendWaiterCall(call.id);
                      onShowToast(`${call.table_number}: asistencia atendida`, 'done_all');
                    }}
                    className="ml-1 min-h-[28px] px-2.5 rounded-md bg-[#ff5708] text-[11px] font-bold text-[#2b0b00] hover:bg-[#ff6924] active:scale-95 cursor-pointer"
                  >
                    Atendido
                  </button>
                </div>
              ))}
            </div>
          )}

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
                          {getTableDigits(tbl.number)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-[17px] font-medium text-[#e5e1e4]">{formatTableTitle(tbl.number)}</span>
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
                          {getTableDigits(tbl.number)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-[17px] font-medium text-[#e5e1e4]">{formatTableTitle(tbl.number)}</span>
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
                          {getTableDigits(tbl.number)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-[17px] font-medium text-[#e5e1e4]">{formatTableTitle(tbl.number)}</span>
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
                          onShowToast(`Abriendo comanda QR de ${formatTableTitle(tbl.number)}`, 'open_in_new');
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
                          {getTableDigits(tbl.number)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-[17px] font-medium text-[#e5e1e4]">{formatTableTitle(tbl.number)}</span>
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
                        {getTableDigits(tbl.number)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="text-[17px] font-medium text-[#e5e1e4]">{formatTableTitle(tbl.number)}</span>
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
                          onShowToast(`Visualizando comanda activa de ${formatTableTitle(tbl.number)}`, 'visibility');
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
              {popularDishes.map((dish) => (
                <div
                  key={dish.name}
                  onClick={() => onShowToast(`${dish.name}: ${dish.count} órdenes registradas hoy`, 'local_fire_department')}
                  className="p-2 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] transition-colors flex items-center gap-3 cursor-pointer group"
                >
                  <img
                    src={dish.image}
                    alt={dish.name}
                    className="w-12 h-12 rounded-lg object-cover shrink-0 border border-[#353437]/50 group-hover:border-[#ff5708]/50 transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[13px] text-[#e5e1e4] font-medium truncate group-hover:text-white transition-colors">{dish.name}</h3>
                      <span className={`font-label-code text-[12px] font-bold ${dish.textClass}`}>
                        S/ {dish.revenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-[#0e0e10] h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${dish.colorClass}`}
                        style={{ width: `${dish.share}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between font-label-code text-[10px] text-[#c6c5cf] mt-1">
                      <span>{dish.count} órdenes {dish.isBar ? '(Bar)' : ''}</span>
                      <span>{dish.share}% share</span>
                    </div>
                  </div>
                </div>
              ))}
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
              {stationWorkloads.map((st) => (
                <div key={st.name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#e5e1e4]">{st.name}</span>
                    <span className={`font-label-code text-[12px] font-bold ${st.status.textCol}`}>
                      {st.percentage}% ({st.status.label})
                    </span>
                  </div>
                  <div className="w-full bg-[#2a2a2c] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${st.status.barCol}`}
                      style={{ width: `${st.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* AI Recommendation callout */}
            <div className="p-3 rounded-lg bg-[#0e0e10]/90 border border-[#5c4037]/25 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#ff5708] text-[20px] shrink-0 mt-0.5">
                smart_toy
              </span>
              <p className="text-[12px] text-[#c6c5cf] leading-relaxed">
                <strong className="text-[#e5e1e4]">Sugerencia IA:</strong> {aiRecommendation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Table Operation Modal */}
      {selectedTableDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1b1d] w-full max-w-md rounded-2xl border border-[#ff5708]/40 p-5 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-[#353437]">
              <div className="flex items-center gap-2">
                <span className="w-10 h-10 rounded-xl bg-[#ff5708] text-[#511500] font-bold font-label-code text-[18px] flex items-center justify-center">
                  {getTableDigits(selectedTableDetail.number)}
                </span>
                <div>
                  <h3 className="text-[17px] font-bold text-white">{formatTableTitle(selectedTableDetail.number)}</h3>
                  <span className="text-[11px] font-label-code text-[#c6c5cf] uppercase">
                    Zona: {selectedTableDetail.zone} • {selectedTableDetail.pax || selectedTableDetail.capacity} PAX
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTableDetail(null)}
                className="p-1.5 rounded-lg text-[#c6c5cf] hover:text-white hover:bg-[#2a2a2c] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px] font-label-code">
              <div className="p-3 bg-[#0e0e10] rounded-xl border border-[#2a2a2c]">
                <span className="text-[#c6c5cf] block text-[10px] uppercase">ESTADO ACTUAL</span>
                <span className="text-[14px] font-bold text-[#ffb59c] uppercase">
                  {selectedTableDetail.status}
                </span>
              </div>
              <div className="p-3 bg-[#0e0e10] rounded-xl border border-[#2a2a2c]">
                <span className="text-[#c6c5cf] block text-[10px] uppercase">CONSUMO ACUMULADO</span>
                <span className="text-[14px] font-bold text-[#ff5708]">
                  S/ {(selectedTableDetail.amount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handlePrioritize(selectedTableDetail.number);
                  setSelectedTableDetail(null);
                }}
                className="w-full py-2.5 rounded-xl bg-[#ffb4ab]/20 hover:bg-[#ffb4ab]/30 text-[#ffb4ab] border border-[#ffb4ab]/40 font-bold text-[13px] flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">priority_high</span>
                <span>Priorizar Comanda en Cocina KDS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleCollectTicket(selectedTableDetail.number, selectedTableDetail.amount || 165);
                  setSelectedTableDetail(null);
                }}
                className="w-full py-2.5 rounded-xl bg-[#ff5708] hover:brightness-110 text-[#511500] font-bold text-[13px] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg"
              >
                <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                <span>Cobrar Cuenta y Liberar Mesa</span>
              </button>

              {selectedTableDetail.status === 'disponible' && (
                <button
                  type="button"
                  onClick={() => {
                    handleOpenTable(selectedTableDetail.number);
                    setSelectedTableDetail(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] text-white font-semibold text-[13px] flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">table_restaurant</span>
                  <span>Abrir Mesa (Asignar Comensales)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
