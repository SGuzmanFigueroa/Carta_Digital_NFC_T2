'use client';

import React, { useState } from 'react';
import { StaffManagement } from '@/components/StaffManagement';
import { Header } from '@/components/Header';
import { INITIAL_STAFF } from '@/data/mockData';
import { StaffMember } from '@/types';
import { useRouter } from 'next/navigation';

export default function PersonalPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [toast, setToast] = useState<{ message: string; icon?: string } | null>(null);

  const showToast = (message: string, icon = 'info') => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddStaff = (newStaff: StaffMember) => {
    setStaffList((prev) => [...prev, newStaff]);
    showToast(`Empleado ${newStaff.name} registrado con éxito`, 'person_add');
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
        currentTab="gestion_usuarios"
        onSelectTab={handleSelectTab}
        activeOrdersCount={4}
        urgentCount={1}
      />
      <main className="w-full pt-16 min-h-screen">
        <StaffManagement
          staffList={staffList}
          onAddStaff={handleAddStaff}
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
