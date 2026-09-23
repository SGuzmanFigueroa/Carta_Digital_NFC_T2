'use client';

import React, { useState, useEffect } from 'react';
import { QRMenuViewer } from '@/components/QRMenuViewer';
import { INITIAL_MENU_ITEMS } from '@/data/mockData';
import { useRestaurant } from '@/context/RestaurantContext';
import { OrderTicket, MenuItem } from '@/types';
import { fetchDishesFromDb } from '@/services/menuService';

export default function MenuPage() {
  const {
    sendOrderFromMenu,
    dinerActiveTicket,
    tables,
    toast,
    showToast,
    requestTableAccount,
    callWaiter
  } = useRestaurant();

  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);

  useEffect(() => {
    fetchDishesFromDb()
      .then((dishes) => {
        if (dishes && dishes.length > 0) {
          setMenuItems(dishes);
        }
      })
      .catch((err) => {
        console.warn('Fallback to INITIAL_MENU_ITEMS:', err);
      });
  }, []);

  const handleAddNewOrder = (newTicket: OrderTicket) => {
    // Handled via sendOrderFromMenu inside QRMenuViewer
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-[#e5e1e4]">
      <QRMenuViewer
        menuItems={menuItems}
        onAddNewOrder={handleAddNewOrder}
        onShowToast={showToast}
        activeTicket={dinerActiveTicket}
        tables={tables}
        onSendOrderFromMenu={sendOrderFromMenu}
        onRequestTableAccount={requestTableAccount}
        onCallWaiter={callWaiter}
        onDishCreated={(newDish) => setMenuItems((prev) => [newDish, ...prev])}
        onRefreshDishes={() => {
          fetchDishesFromDb().then((dishes) => {
            if (dishes && dishes.length > 0) setMenuItems(dishes);
          }).catch(console.warn);
        }}
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
