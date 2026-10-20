'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  DEFAULT_RESTAURANT_IDENTITY, SYSTEM_CONFIG_CHANGED_EVENT, SYSTEM_CONFIG_STORAGE_KEY,
  restaurantIdentity, type RestaurantIdentity,
} from '@/config/restaurant';
import { fetchSystemConfigFromDb } from '@/services/configService';

const IdentityContext = createContext<RestaurantIdentity>(DEFAULT_RESTAURANT_IDENTITY);

export function RestaurantIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<RestaurantIdentity>(DEFAULT_RESTAURANT_IDENTITY);
  useEffect(() => {
    let disposed = false;
    let revision = 0;
    const refresh = async () => {
      const request = ++revision;
      const config = await fetchSystemConfigFromDb();
      if (!disposed && request === revision) setIdentity(restaurantIdentity(config));
    };
    const changed = (event: Event) => {
      const config = (event as CustomEvent<Partial<RestaurantIdentity>>).detail;
      if (config) {
        revision++;
        setIdentity(restaurantIdentity(config));
      } else {
        void refresh();
      }
    };
    const stored = (event: StorageEvent) => {
      if (event.key !== SYSTEM_CONFIG_STORAGE_KEY && event.key !== null) return;
      if (event.key === SYSTEM_CONFIG_STORAGE_KEY && event.newValue) {
        try {
          const config = JSON.parse(event.newValue) as Partial<RestaurantIdentity>;
          if (config && typeof config === 'object') {
            revision++;
            setIdentity(restaurantIdentity(config));
            return;
          }
        } catch {
          // Una caché inválida se recupera desde el servicio de configuración.
        }
      }
      void refresh();
    };
    window.addEventListener(SYSTEM_CONFIG_CHANGED_EVENT, changed);
    window.addEventListener('storage', stored);
    void refresh();
    return () => {
      disposed = true;
      window.removeEventListener(SYSTEM_CONFIG_CHANGED_EVENT, changed);
      window.removeEventListener('storage', stored);
    };
  }, []);
  return <IdentityContext.Provider value={identity}>{children}</IdentityContext.Provider>;
}

export const useRestaurantIdentity = () => useContext(IdentityContext);
