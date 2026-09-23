'use client';

import React, { useState, useEffect } from 'react';
import { StaffManagement } from '@/components/StaffManagement';
import { Header } from '@/components/Header';
import { INITIAL_STAFF } from '@/data/mockData';
import { StaffMember } from '@/types';
import { useRouter } from 'next/navigation';
import {
  getPersistedStaffList,
  saveStaffListToLocalStorage,
  createStaffMemberInDb,
  updateStaffMemberInDb,
  deleteStaffMemberFromDb,
  createAuditLogInDb
} from '@/services/authService';

export default function PersonalPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [toast, setToast] = useState<{ message: string; icon?: string } | null>(null);

  const showToast = (message: string, icon = 'info') => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 3000);
  };

  // Carga persistente inicial desde Supabase y localStorage
  useEffect(() => {
    getPersistedStaffList()
      .then((list) => {
        if (list && list.length > 0) {
          setStaffList(list);
        }
      })
      .catch(console.warn);
  }, []);

  const handleAddStaff = async (newStaff: StaffMember) => {
    const updated = [...staffList, newStaff];
    setStaffList(updated);
    saveStaffListToLocalStorage(updated);
    await createStaffMemberInDb(newStaff);
    await createAuditLogInDb(
      'Nuevo Colaborador Registrado',
      newStaff.name,
      `Rol: ${newStaff.role}, Asignación: ${newStaff.assignment}`,
      'info'
    );
    showToast(`Colaborador ${newStaff.name} guardado con éxito`, 'person_add');
  };

  const handleUpdateStaff = async (updatedStaff: StaffMember) => {
    const updated = staffList.map((st) => (st.id === updatedStaff.id ? updatedStaff : st));
    setStaffList(updated);
    saveStaffListToLocalStorage(updated);
    await updateStaffMemberInDb(updatedStaff);
    await createAuditLogInDb(
      'Actualización de Colaborador',
      updatedStaff.name,
      'Datos o PIN modificados',
      'info'
    );
    showToast(`Datos de ${updatedStaff.name} actualizados`, 'check_circle');
  };

  const handleDeleteStaff = async (staffId: string) => {
    const target = staffList.find((s) => s.id === staffId);
    const updated = staffList.filter((st) => st.id !== staffId);
    setStaffList(updated);
    saveStaffListToLocalStorage(updated);
    await deleteStaffMemberFromDb(staffId);
    if (target) {
      await createAuditLogInDb(
        'Colaborador Dado de Baja',
        target.name,
        `Usuario ${target.username} retirado del sistema`,
        'warning'
      );
    }
    showToast('Colaborador eliminado del sistema', 'delete');
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
