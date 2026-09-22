'use client';

import React, { useState, useEffect } from 'react';
import { SystemConfig } from '@/components/SystemConfig';
import { Header } from '@/components/Header';
import { INITIAL_CONFIG } from '@/data/mockData';
import { SystemConfigState } from '@/types';
import { useRouter } from 'next/navigation';
import { fetchSystemConfigFromDb, saveSystemConfigToDb } from '@/services/configService';

export default function ConfiguracionPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SystemConfigState>(INITIAL_CONFIG);
  const [toast, setToast] = useState<{ message: string; icon?: string } | null>(null);

  const showToast = (message: string, icon = 'info') => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let mounted = true;
    async function loadConfig() {
      const savedConfig = await fetchSystemConfigFromDb();
      if (mounted) {
        setConfig(savedConfig);
      }
    }
    loadConfig();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveConfig = async (updated: SystemConfigState) => {
    setConfig(updated);
    const success = await saveSystemConfigToDb(updated);
    if (success) {
      showToast('Configuración del sistema guardada con éxito en Supabase y localmente', 'check_circle');
    } else {
      showToast('Configuración guardada en caché local del navegador', 'check_circle');
    }
  };

  const handleSelectTab = (tab: string) => {
    if (tab === 'cocina_kds') router.push('/kds');
    else if (tab === 'gestion_usuarios') router.push('/personal');
    else if (tab === 'configuracion') router.push('/configuracion');
    else if (tab === 'panel_admin') router.push('/dashboard');
    else if (tab === 'central_pedidos') router.push('/pedidos');
  };

  const isLight = config.themeMode === 'light';
  const isHighContrast = config.themeMode === 'kds-high-contrast';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${
      isLight 
        ? 'bg-[#f4f5f7] text-[#0f172a]' 
        : isHighContrast 
        ? 'bg-black text-white' 
        : 'bg-[#0e0e10] text-[#e5e1e4]'
    }`}>
      <Header
        currentTab="configuracion"
        onSelectTab={handleSelectTab}
        activeOrdersCount={4}
        urgentCount={1}
      />
      <main className="w-full pt-16 min-h-screen transition-colors duration-200">
        <SystemConfig
          config={config}
          onSaveConfig={handleSaveConfig}
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
