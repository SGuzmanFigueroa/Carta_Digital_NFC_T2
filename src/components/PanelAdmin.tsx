import React from 'react';
import { INITIAL_STATION_LOADS, CATALOG_DISHES } from '../data/initialData';

export const PanelAdmin: React.FC = () => {
  return (
    <div className="p-4 lg:p-8 max-w-[1920px] mx-auto space-y-6 text-[#e5e1e4]">
      {/* Header */}
      <div className="bg-[#18181b] p-6 rounded-2xl border border-[#27272a] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5708]"></span>
            <span className="text-[12px] font-mono-code uppercase tracking-wider text-[#ffb59c] font-bold">
              Telemetría de Cocina & Rendimiento
            </span>
          </div>
          <h1 className="text-[28px] font-bold text-white mt-1 font-sans">
            Panel de Control Ejecutivo
          </h1>
          <p className="text-[14px] text-[#a1a1aa] mt-0.5">
            Métricas de pase, tiempos de cocción por partida y control de mermas
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono-code text-[12px]">
          <span className="px-3 py-1.5 rounded-lg bg-[#201f22] border border-[#27272a] text-[#a1a1aa]">
            TURNO: ALMUERZO / CENA
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-bold">
            PASE AL 94% EFICIENCIA
          </span>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#18181b] border border-[#27272a]">
          <div className="flex items-center justify-between text-[#a1a1aa] text-[12px] font-mono-code">
            <span>TIEMPO MEDIO DE PREPARACIÓN</span>
            <span className="material-symbols-outlined text-[#ff5708] text-[18px]">timer</span>
          </div>
          <div className="text-[32px] font-mono-code font-bold text-white mt-2">12.4 min</div>
          <div className="text-[11px] text-emerald-400 font-mono-code mt-1">
            -1.6 min por debajo de la meta máxima (14m)
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#18181b] border border-[#27272a]">
          <div className="flex items-center justify-between text-[#a1a1aa] text-[12px] font-mono-code">
            <span>PLATOS DESPACHADOS HOY</span>
            <span className="material-symbols-outlined text-[#a1c9ff] text-[18px]">restaurant</span>
          </div>
          <div className="text-[32px] font-mono-code font-bold text-white mt-2">248</div>
          <div className="text-[11px] text-[#a1a1aa] font-mono-code mt-1">
            Pico activo: 14:30 - 15:15 (68 platos)
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#18181b] border border-[#27272a]">
          <div className="flex items-center justify-between text-[#a1a1aa] text-[12px] font-mono-code">
            <span>INCIDENCIAS DE ALÉRGENOS</span>
            <span className="material-symbols-outlined text-[#ffb4ab] text-[18px]">warning</span>
          </div>
          <div className="text-[32px] font-mono-code font-bold text-[#ffb4ab] mt-2">0 ERROR</div>
          <div className="text-[11px] text-emerald-400 font-mono-code mt-1">
            4 protocolos de frutos secos y mariscos ejecutados
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#18181b] border border-[#27272a]">
          <div className="flex items-center justify-between text-[#a1a1aa] text-[12px] font-mono-code">
            <span>VELOCIDAD DEL RUNNER</span>
            <span className="material-symbols-outlined text-[#ffb59c] text-[18px]">hail</span>
          </div>
          <div className="text-[32px] font-mono-code font-bold text-white mt-2">1.8 min</div>
          <div className="text-[11px] text-[#a1a1aa] font-mono-code mt-1">
            Desde pase caliente hasta mesa de comensal
          </div>
        </div>
      </div>

      {/* Station Loads & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Load per Station */}
        <div className="p-6 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-white font-sans">
              Capacidad & Demanda por Partida
            </h2>
            <span className="text-[11px] font-mono-code text-[#ff5708]">
              P1 FUEGO AL MÁXIMO
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {INITIAL_STATION_LOADS.map((station) => (
              <div key={station.id} className="p-3.5 rounded-xl bg-[#121215] border border-[#27272a]">
                <div className="flex items-center justify-between mb-2 font-mono-code text-[13px]">
                  <span className="font-bold text-white">{station.name}</span>
                  <span className="text-[#ffb59c] font-bold">{station.loadPercentage}% Carga</span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-[#201f22] overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${station.loadPercentage}%`,
                      backgroundColor: station.color
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono-code text-[#71717a]">
                  <span>Órdenes en cola: {station.activeOrders}</span>
                  <span>Tiempo promedio: {station.avgPrepMinutes}m</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Plating Accuracy & Top Dishes */}
        <div className="p-6 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-white font-sans">
              Platos con Mayor Demanda en el Servicio
            </h2>
            <span className="text-[11px] font-mono-code text-[#a1c9ff]">TOP ROTACIÓN</span>
          </div>

          <div className="space-y-3 pt-2">
            {CATALOG_DISHES.slice(0, 4).map((dish, i) => (
              <div
                key={dish.id}
                className="flex items-center gap-3.5 p-3 rounded-xl bg-[#121215] border border-[#27272a]"
              >
                <span className="w-6 text-center font-mono-code font-bold text-[14px] text-[#ff5708]">
                  #{i + 1}
                </span>
                <img
                  src={dish.photoUrl}
                  alt={dish.name}
                  className="w-12 h-12 rounded-lg object-cover border border-[#353437] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[14px] text-white truncate">{dish.name}</div>
                  <div className="text-[11px] font-mono-code text-[#71717a]">
                    {dish.category} • T. Pase: {dish.prepTime}
                  </div>
                </div>
                <div className="text-right font-mono-code">
                  <div className="text-[13px] font-bold text-[#ffb59c]">S/ {dish.price.toFixed(2)}</div>
                  <div className="text-[10px] text-emerald-400">98% satisfacción</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
