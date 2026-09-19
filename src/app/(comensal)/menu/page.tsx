'use client';

import React from 'react';
import { QRMenuViewer } from '@/components/QRMenuViewer';
import { INITIAL_MENU_ITEMS } from '@/data/mockData';
import { useRestaurant } from '@/context/RestaurantContext';
import { OrderTicket } from '@/types';
import { CheckCircle2 } from 'lucide-react';

export default function MenuPage() {
  const {
    sendOrderFromMenu,
    dinerActiveTicket,
    tables,
    toast,
    showToast
  } = useRestaurant();

  const handleAddNewOrder = (newTicket: OrderTicket) => {
    // Already handled via sendOrderFromMenu inside QRMenuViewer
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-[#e5e1e4]">
      <QRMenuViewer
        menuItems={INITIAL_MENU_ITEMS}
        onAddNewOrder={handleAddNewOrder}
        onShowToast={showToast}
        activeTicket={dinerActiveTicket}
        tables={tables}
        onSendOrderFromMenu={sendOrderFromMenu}
      />

      {/* Floating Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e2029] border border-[#ff5708] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-[13px] font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#ff5708]" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
