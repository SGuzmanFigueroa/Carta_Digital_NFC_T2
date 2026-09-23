'use client';

import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { KDSBoard } from '@/components/KDSBoard';
import { useRestaurant } from '@/context/RestaurantContext';

export default function KDSRefinedPage() {
  const router = useRouter();
  const {
    tickets,
    setTickets,
    runners,
    setRunners,
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

  const handleSelectTab = (tab: string) => {
    if (tab === 'cocina_kds') router.push('/kds');
    else if (tab === 'gestion_usuarios') router.push('/personal');
    else if (tab === 'configuracion') router.push('/configuracion');
    else if (tab === 'panel_admin') router.push('/dashboard');
    else if (tab === 'central_pedidos') router.push('/pedidos');
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-[#e5e1e4] font-sans">
      {/* Top Main Navigation Header */}
      <Header
        currentTab="cocina_kds"
        onSelectTab={handleSelectTab}
        activeOrdersCount={activeCount}
        urgentCount={urgentCount}
      />

      {/* Main View Area */}
      <main className="w-full pt-16 min-h-screen">
        <KDSBoard
          tickets={tickets}
          runners={runners}
          onUpdateTickets={setTickets}
          onUpdateRunners={setRunners}
        />
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
