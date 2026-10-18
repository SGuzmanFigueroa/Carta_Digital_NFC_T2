'use client';

import React, { useState } from 'react';
import { PanelAdmin } from '@/components/PanelAdmin';
import { AdminFloorPanel } from '@/components/AdminFloorPanel';
import { Header } from '@/components/Header';
import { useRouter } from 'next/navigation';
import { useRestaurant } from '@/context/RestaurantContext';
import { useToast } from '@/context/ToastContext';

export default function DashboardPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'floor' | 'metrics'>('floor');
  const {
    tables,
    tickets,
    orders,
    totalShiftRevenue,
    prioritizeTable,
    collectTableBill,
    openTable,
    showToast
  } = useRestaurant();
  const { toast } = useToast();

  // Active tickets count
  const activeCount = tickets.filter(
    (t) => t.status !== 'lista_despachada' && t.status !== 'archivada'
  ).length;
  const urgentCount = tickets.filter(
    (t) =>
      t.status !== 'lista_despachada' &&
      (t.isUrgent || t.elapsedSeconds > t.targetSeconds)
  ).length;

  const handleSelectTab = (tab: string) => {
    if (tab === 'cocina_kds') router.push('/kds');
    else if (tab === 'gestion_usuarios') router.push('/personal');
    else if (tab === 'configuracion') router.push('/configuracion');
    else if (tab === 'panel_admin') router.push('/dashboard');
    else if (tab === 'central_pedidos') router.push('/pedidos');
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-[#e5e1e4] font-sans">
      <Header
        currentTab="panel_admin"
        onSelectTab={handleSelectTab}
        activeOrdersCount={activeCount}
        urgentCount={urgentCount}
      />

      <main className="w-full pt-16 min-h-screen">
        {/* Top View Mode Switcher */}
        <div className="bg-[#121318] border-b border-[#22242d] px-4 lg:px-8 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('floor')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'floor'
                  ? 'bg-[#ff5708] text-white shadow-md shadow-[#ff5708]/30'
                  : 'bg-[#181920] text-[#9ca3af] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">table_restaurant</span>
              <span>Plano de Mesas &amp; 3D</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('metrics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'metrics'
                  ? 'bg-[#ff5708] text-white shadow-md shadow-[#ff5708]/30'
                  : 'bg-[#181920] text-[#9ca3af] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">monitoring</span>
              <span>Métricas de Negocio</span>
            </button>
          </div>

          <div className="text-[11px] text-[#8e909d] font-mono-code hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span>SISTEMA DE SALÓN EN VIVO</span>
          </div>
        </div>

        {viewMode === 'floor' ? (
          <AdminFloorPanel
            tables={tables}
            tickets={tickets}
            orders={orders}
            totalShiftRevenue={totalShiftRevenue}
            onShowToast={showToast}
            onPrioritizeTable={prioritizeTable}
            onCollectTableBill={collectTableBill}
            onOpenTable={openTable}
          />
        ) : (
          <PanelAdmin />
        )}
      </main>

      {/* Floating Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e2029] border border-[#ff5708] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-[13px] font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="material-symbols-outlined text-[#ff5708] text-[20px]">
            {toast.icon || 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
