'use client';

import React from 'react';
import { OrdersCentral } from '@/components/OrdersCentral';
import { Header } from '@/components/Header';
import { useRestaurant } from '@/context/RestaurantContext';
import { OrderTicket } from '@/types';
import { useRouter } from 'next/navigation';
import { usePaidOrderHistory } from '@/hooks/usePaidOrderHistory';
import { mergePaymentOrders } from '@/features/orders/paymentFilter';
import { reviewTablePaymentInDb } from '@/services/orderService';

export default function PedidosPage() {
  const router = useRouter();
  const { orders, updateOrderStatus, addOrderNote, toast, showToast } = useRestaurant();
  const history = usePaidOrderHistory();
  const accountOrders = mergePaymentOrders(orders, history.paidOrders);

  const handleUpdateStatus = (orderId: string, newStatus: OrderTicket['status']) => {
    updateOrderStatus(orderId, newStatus);
    showToast(`Comanda actualizada a estado: ${newStatus}`, 'check_circle');
  };

  // Pago Yape/Plin declarado por el comensal: se confirma solo tras verlo en la app del banco.
  const handleReviewPayment = async (table: string, approve: boolean) => {
    try {
      const count = await reviewTablePaymentInDb(table, approve);
      showToast(
        count === 0
          ? `${table}: no hay pagos pendientes de verificar`
          : approve
          ? `Pago de ${table} confirmado`
          : `Pago de ${table} rechazado: la mesa debe volver a pagar`,
        approve ? 'verified' : 'error'
      );
    } catch {
      showToast('No se pudo registrar la verificación del pago', 'error');
    }
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
          orders={accountOrders}
          paymentHistoryLoading={history.loading}
          paymentHistoryError={history.error}
          onUpdateOrderStatus={handleUpdateStatus}
          onShowToast={showToast}
          onAddOrderNote={addOrderNote}
          onReviewPayment={handleReviewPayment}
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
