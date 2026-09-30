'use client';

import React, { useState, useEffect } from 'react';
import { QRMenuViewer } from '@/components/QRMenuViewer';
import { INITIAL_MENU_ITEMS } from '@/data/mockData';
import { useRestaurant } from '@/context/RestaurantContext';
import { OrderTicket, MenuItem } from '@/types';
import { fetchDishesFromDb } from '@/services/menuService';
import { MenuThemeProvider } from '@/hooks/useMenuTheme';
import {
  cacheMenuItems,
  getCachedMenuItems,
  setupOfflineSync,
  isDeviceOnline
} from '@/services/offlineSyncService';

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

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const cached = getCachedMenuItems();
    return cached && cached.length > 0 ? cached : INITIAL_MENU_ITEMS;
  });
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    setIsOnline(isDeviceOnline());

    // Setup background offline synchronization
    const cleanupSync = setupOfflineSync(
      // 1. On online/offline status change
      (online) => {
        setIsOnline(online);
        if (online) {
          showToast('Conectado a la red del restaurante.', 'wifi');
          // Re-fetch fresh menu
          fetchDishesFromDb().then((dishes) => {
            if (dishes && dishes.length > 0) {
              setMenuItems(dishes);
              cacheMenuItems(dishes);
            }
          }).catch(console.warn);
        } else {
          showToast('Modo Offline: Puedes seguir pidiendo normalmente.', 'wifi_off');
        }
      },
      // 2. On orders synced
      (count) => {
        showToast(`¡Conexión restablecida! ${count} pedido(s) sincronizados con cocina.`, 'cloud_done');
      }
    );

    // Initial fetch and cache
    fetchDishesFromDb()
      .then((dishes) => {
        if (dishes && dishes.length > 0) {
          setMenuItems(dishes);
          cacheMenuItems(dishes);
        }
      })
      .catch((err) => {
        console.warn('Network issue fetching dishes, using cached menu:', err);
        const cached = getCachedMenuItems();
        if (cached && cached.length > 0) {
          setMenuItems(cached);
        }
      });

    return () => {
      cleanupSync();
    };
  }, [showToast]);

  const handleAddNewOrder = (newTicket: OrderTicket) => {
    // Handled via sendOrderFromMenu inside QRMenuViewer
  };

  return (
    <MenuThemeProvider>
      <div className="min-h-screen bg-[#f4f5f7] text-[#0f172a] dark:bg-[#0e0e10] dark:text-[#e5e1e4] relative">
        {/* Offline Status Banner */}
        {!isOnline && (
          <div className="sticky top-0 z-50 bg-amber-500/90 backdrop-blur-md text-black px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all animate-in slide-in-from-top duration-300">
            <span className="material-symbols-outlined text-[18px]">wifi_off</span>
            <span>Modo Sin Conexión activo — Puedes seguir ordenando. Tus pedidos se enviarán solos al volver la red.</span>
          </div>
        )}

        <QRMenuViewer
          menuItems={menuItems}
          onAddNewOrder={handleAddNewOrder}
          onShowToast={showToast}
          activeTicket={dinerActiveTicket}
          tables={tables}
          onSendOrderFromMenu={sendOrderFromMenu}
          onRequestTableAccount={requestTableAccount}
          onCallWaiter={callWaiter}
          onDishCreated={(newDish) => {
            setMenuItems((prev) => {
              const updated = [newDish, ...prev];
              cacheMenuItems(updated);
              return updated;
            });
          }}
          onRefreshDishes={() => {
            fetchDishesFromDb()
              .then((dishes) => {
                if (dishes && dishes.length > 0) {
                  setMenuItems(dishes);
                  cacheMenuItems(dishes);
                }
              })
              .catch((err) => {
                console.warn('Error refreshing dishes:', err);
                const cached = getCachedMenuItems();
                if (cached && cached.length > 0) setMenuItems(cached);
              });
          }}
        />

        {/* Floating Toast Alert */}
        {toast && (
          <div className="fixed bottom-40 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 bg-white border border-[#ff5708] text-[#0f172a] dark:bg-[#1e2029] dark:text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-[13px] font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
            <span className="material-symbols-outlined text-[#ff5708] text-[20px]">
              {toast.icon || 'check_circle'}
            </span>
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </MenuThemeProvider>
  );
}
