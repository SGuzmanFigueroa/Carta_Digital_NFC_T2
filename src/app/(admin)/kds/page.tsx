'use client';

import { useState } from 'react';
import { ScreenTab } from '@/types';
import { Header } from '@/components/Header';
import { KDSBoard } from '@/components/KDSBoard';
import { CentralPedidos } from '@/components/CentralPedidos';
import { PanelAdmin } from '@/components/PanelAdmin';
import { GestionUsuarios } from '@/components/GestionUsuarios';
import { Configuracion } from '@/components/Configuracion';
import { useRestaurant } from '@/context/RestaurantContext';

export default function KDSRefinedPage() {
  const [currentTab, setCurrentTab] = useState<ScreenTab>('cocina_kds');
  const {
    tickets,
    setTickets,
    runners,
    setRunners,
    simulateNewOrder,
    resetAllDemoData,
    toast
  } = useRestaurant();

  // Active tickets count
  const activeCount = tickets.filter(
    (t) => t.status !== 'lista_despachada' && t.status !== 'archivada'
  ).length;
  const urgentCount = tickets.filter(
    (t) =>
      t.status !== 'lista_despachada' &&
      (t.isUrgent || t.elapsedSeconds > t.targetSeconds)
  ).length;

  const handleCreateTicket = (newTicket: any) => {
    setTickets((prev) => [newTicket, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-[#e5e1e4] font-sans">
      {/* Top Main Navigation Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeOrdersCount={activeCount}
        urgentCount={urgentCount}
      />

      {/* Main View Area */}
      <main className="w-full pt-16 min-h-screen">
        {currentTab === 'cocina_kds' && (
          <KDSBoard
            tickets={tickets}
            runners={runners}
            onUpdateTickets={setTickets}
            onUpdateRunners={setRunners}
          />
        )}

        {currentTab === 'central_pedidos' && (
          <CentralPedidos
            tickets={tickets}
            onCreateTicket={handleCreateTicket}
            onOpenKDS={() => setCurrentTab('cocina_kds')}
          />
        )}

        {currentTab === 'panel_admin' && <PanelAdmin />}

        {currentTab === 'gestion_usuarios' && <GestionUsuarios />}

        {currentTab === 'configuracion' && (
          <Configuracion
            onResetData={resetAllDemoData}
            onSimulateNewOrder={simulateNewOrder}
          />
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
