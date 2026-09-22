'use client';

import React, { useState } from 'react';
import { OrdersCentral } from '@/components/OrdersCentral';
import { Header } from '@/components/Header';
import { useRestaurant } from '@/context/RestaurantContext';
import { OrderTicket } from '@/types';
import { useRouter } from 'next/navigation';

export default function PedidosPage() {
  const router = useRouter();
  const { orders, setOrders, toast, showToast } = useRestaurant();

  // showToast provided by useRestaurant context

  const handleUpdateStatus = (orderId: string, newStatus: OrderTicket['status']) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );
    showToast(`Comanda actualizada a estado: ${newStatus}`, 'check_circle');
  };

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
        currentTab="central_pedidos"
        onSelectTab={handleSelectTab}
        activeOrdersCount={orders.filter((o) => o.status !== 'entregado').length}
        urgentCount={orders.filter((o) => o.isCritical).length}
      />
      <main className="w-full pt-16 min-h-screen">
        <OrdersCentral
          orders={orders}
          onUpdateOrderStatus={handleUpdateStatus}
          onShowToast={showToast}
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
