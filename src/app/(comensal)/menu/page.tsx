'use client';

import React, { useState } from 'react';
import { QRMenuViewer } from '@/components/QRMenuViewer';
import { INITIAL_MENU_ITEMS } from '@/data/mockData';
import { OrderTicket } from '@/types';

export default function MenuPage() {
  const [toast, setToast] = useState<{ message: string; icon?: string } | null>(null);

  const handleAddNewOrder = (newTicket: OrderTicket) => {
    // Save to localStorage for real-time pickup in KDS
    try {
      const existing = localStorage.getItem('gastropulse_orders');
      const orders = existing ? JSON.parse(existing) : [];
      orders.unshift(newTicket);
      localStorage.setItem('gastropulse_orders', JSON.stringify(orders));
    } catch (e) {
      console.warn('Could not save order to storage', e);
    }
  };

  const showToast = (message: string, icon = 'info') => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-[#e5e1e4]">
      <QRMenuViewer
        menuItems={INITIAL_MENU_ITEMS}
        onAddNewOrder={handleAddNewOrder}
        onShowToast={showToast}
      />

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
