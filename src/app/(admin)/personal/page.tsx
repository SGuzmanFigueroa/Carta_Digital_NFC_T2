'use client';

import React, { useState, useEffect } from 'react';
import { StaffManagement } from '@/components/StaffManagement';
import { Header } from '@/components/Header';
import { StaffMember } from '@/types';
import { useRouter } from 'next/navigation';
import {
  getPersistedStaffList,
  createStaffMemberInDb,
  updateStaffMemberInDb,
  deleteStaffMemberFromDb
} from '@/services/authService';

export default function PersonalPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [toast, setToast] = useState<{ message: string; icon?: string } | null>(null);

  const showToast = (message: string, icon = 'info') => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 3000);
  };

  // La lista viene de Supabase (RLS: solo personal con sesión). Tras cada cambio
  // se vuelve a leer para mostrar lo que realmente quedó guardado.
  const reloadStaff = () =>
    getPersistedStaffList()
      .then(setStaffList)
      .catch(console.warn);

  useEffect(() => {
    reloadStaff();
  }, []);

  const handleAddStaff = async (newStaff: StaffMember) => {
    const result = await createStaffMemberInDb(newStaff);
    if (!result.ok) {
      showToast(result.error || 'No se pudo registrar al colaborador', 'error');
      return;
    }
    await reloadStaff();
    showToast(`${newStaff.name} registrado. Su contraseña es temporal: deberá cambiarla al entrar.`, 'person_add');
  };

  const handleUpdateStaff = async (updatedStaff: StaffMember) => {
    const result = await updateStaffMemberInDb(updatedStaff);
    if (!result.ok) {
      showToast(result.error || 'No se pudo actualizar al colaborador', 'error');
      return;
    }
    await reloadStaff();
    showToast(`Datos de ${updatedStaff.name} actualizados`, 'check_circle');
  };

  const handleDeleteStaff = async (staffId: string) => {
    const target = staffList.find((s) => s.id === staffId);
    const result = await deleteStaffMemberFromDb(staffId);
    if (!result.ok) {
      showToast(result.error || 'No se pudo eliminar al colaborador', 'error');
      return;
    }
    await reloadStaff();
    // La auditoría (alta, cambios y baja) la registra el servidor en /api/staff.
    showToast(`${target?.name ?? 'Colaborador'} eliminado del sistema`, 'delete');
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
          onUpdateStaff={handleUpdateStaff}
          onDeleteStaff={handleDeleteStaff}
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
