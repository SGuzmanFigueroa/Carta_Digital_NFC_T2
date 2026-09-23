'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginScreen } from '@/components/LoginScreen';
import { INITIAL_STAFF } from '@/data/mockData';
import { AuthUser, StaffMember } from '@/types';
import { getPersistedStaffList } from '@/services/authService';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ message: string; icon?: string } | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);

  useEffect(() => {
    getPersistedStaffList().then((list) => {
      if (list && list.length > 0) {
        setStaffList(list);
      }
    }).catch(console.warn);
  }, []);

  const showToast = (message: string, icon = 'info') => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'unauthenticated') {
      showToast('Acceso restringido. Inicia sesión con tus credenciales de personal.', 'lock');
    } else if (reason === 'unauthorized' || searchParams.get('denied')) {
      showToast('Tu rol actual no tiene permisos para el panel ejecutivo.', 'security');
    }
  }, [searchParams]);

  const handleLoginSuccess = (user: AuthUser) => {
    showToast(`Bienvenido/a, ${user.name}. Acceso a ${user.roleTitle}`, 'verified');
    const redirectParam = searchParams.get('redirect');

    setTimeout(() => {
      if (redirectParam && redirectParam.startsWith('/')) {
        router.push(redirectParam);
      } else if (user.role === 'kitchen') {
        router.push('/kds');
      } else if (user.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/kds');
      }
    }, 600);
  };

  const handleExploreAsGuest = () => {
    router.push('/menu');
  };

  return (
    <div className="relative min-h-screen bg-[#0e0e10]">
      <LoginScreen
        staffList={staffList}
        onLoginSuccess={handleLoginSuccess}
        onExploreAsGuest={handleExploreAsGuest}
        onShowToast={showToast}
      />

      {/* Floating Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1c1b1d] border border-[#ff5708] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-[13px] font-semibold animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-[#ff5708] text-[20px]">
            {toast.icon || 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0e0e10]" />}>
      <LoginContent />
    </Suspense>
  );
}
