'use client';

import dynamic from 'next/dynamic';
import { useLanguage } from '@/hooks/useLanguage';

/**
 * Visores 3D y de RA de la carta. Usan Three.js (~600 KB), así que se cargan
 * recién cuando el comensal abre uno, no al cargar la carta.
 */

/**
 * CD-31 · Fallback del visor 3D: componente propio (y no un literal dentro de
 * `dynamic()`) porque necesita el hook de idioma para traducir su copy.
 */
function ThreeDLoading() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center w-full h-64 bg-[#131418] rounded-xl border border-[#24252e]">
      <div className="flex flex-col items-center gap-2">
        <span className="w-6 h-6 border-2 border-[#ff5708] border-t-transparent rounded-full animate-spin"></span>
        <span className="text-[#ff5708] font-mono-code text-[11px] animate-pulse">{t('dish.loading3d')}</span>
      </div>
    </div>
  );
}

// Three.js necesita `window`: nunca se renderiza en el servidor.
export const ThreeDView = dynamic(() => import('../ThreeDView').then((mod) => mod.ThreeDView), {
  ssr: false,
  loading: () => <ThreeDLoading />
});

export const DishARViewer = dynamic(() => import('../DishARViewer').then((m) => m.DishARViewer), { ssr: false });
export const WebXRDishLauncher = dynamic(() => import('../WebXRDishLauncher').then((m) => m.WebXRDishLauncher), { ssr: false });
