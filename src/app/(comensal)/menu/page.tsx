'use client';

import React, { useState, useEffect } from 'react';
import { QRMenuViewer } from '@/components/QRMenuViewer';
import { PWAInstallBanner } from '@/components/menu/PWAInstallBanner';
import { INITIAL_MENU_ITEMS } from '@/data/mockData';
import { useRestaurant } from '@/context/RestaurantContext';
import { OrderTicket, MenuItem } from '@/types';
import { fetchDishesFromDb } from '@/services/menuService';
import { MenuThemeProvider } from '@/hooks/useMenuTheme';
import { LanguageProvider, resolveInitialMenuLanguage, useLanguage } from '@/hooks/useLanguage';
import { translate } from '@/i18n/translations';
import {
  cacheMenuItems,
  getCachedMenuItems,
  setupOfflineSync,
  isDeviceOnline
} from '@/services/offlineSyncService';

/**
 * CD-31 · Aviso de conexión de la carta del comensal.
 * Se pinta DENTRO de `LanguageProvider` para que su copy respete el idioma activo
 * sin recargar la página.
 */
function MenuOfflineBanner() {
  const { t } = useLanguage();
  return (
    <div className="sticky top-0 z-50 bg-amber-500/90 backdrop-blur-md text-black px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all animate-in slide-in-from-top duration-300">
      <span className="material-symbols-outlined text-[18px]">wifi_off</span>
      <span>{t('offline.banner')}</span>
    </div>
  );
}

export default function MenuPage() {
  const {
    sendOrderFromMenu,
    recordTableOrderRound,
    dinerActiveTicket,
    orders,
    tableOrderRounds,
    tables,
    toast,
    showToast,
    requestTableAccount,
    callWaiter
  } = useRestaurant();

  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    setIsOnline(isDeviceOnline());

    const cachedMenu = getCachedMenuItems();
    if (cachedMenu && cachedMenu.length > 0) {
      setMenuItems(cachedMenu);
    }

    // Setup background offline synchronization
    const cleanupSync = setupOfflineSync(
      // 1. On online/offline status change
      (online) => {
        setIsOnline(online);
        if (online) {
          showToast(translate(resolveInitialMenuLanguage(), 'toast.online'), 'wifi');
          // Re-fetch fresh menu
          fetchDishesFromDb().then((dishes) => {
            if (dishes && dishes.length > 0) {
              setMenuItems(dishes);
              cacheMenuItems(dishes);
            }
          }).catch(console.warn);
        } else {
          showToast(translate(resolveInitialMenuLanguage(), 'toast.offlineMode'), 'wifi_off');
        }
      },
      // 2. On orders synced
      (count) => {
        showToast(
          translate(resolveInitialMenuLanguage(), 'toast.synced', { count }),
          'cloud_done'
        );
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
      <div className="min-h-screen bg-[#f4f5f7] text-[#0f172a] dark:bg-[#0e0e10] dark:text-[#e5e1e4] transition-colors duration-350 ease-in-out relative">
        {/* CD-31 · Idioma (ES/EN) de la vista del comensal: provee `useLanguage`
            a la carta, al selector [ES | EN], al tema y a la barra inferior. */}
        <LanguageProvider>
          {/* Offline Status Banner (dentro del provider: su copy se traduce en vivo). */}
          {!isOnline && <MenuOfflineBanner />}

        <QRMenuViewer
          menuItems={menuItems}
          onAddNewOrder={handleAddNewOrder}
          onShowToast={showToast}
          activeTicket={dinerActiveTicket}
          orderHistory={orders}
          tableOrderRounds={tableOrderRounds}
          tables={tables}
          onSendOrderFromMenu={sendOrderFromMenu}
          onRecordTableOrderRound={recordTableOrderRound}
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
        </LanguageProvider>

        {/* CD-26 · Invitación flotante a instalar la carta como aplicación */}
        <PWAInstallBanner />

        {/* Floating Toast Alert */}
        {toast && (
          <div className="fixed bottom-40 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 bg-white border border-primary text-[#0f172a] dark:bg-[#1e2029] dark:text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-[13px] font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
            <span className="material-symbols-outlined text-primary text-[20px]">
              {toast.icon || 'check_circle'}
            </span>
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </MenuThemeProvider>
  );
}
