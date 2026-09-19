'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginScreen } from '@/components/LoginScreen';
import { INITIAL_STAFF } from '@/data/mockData';
import { AuthUser } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; icon?: string } | null>(null);

  const showToast = (message: string, icon = 'info') => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLoginSuccess = (user: AuthUser) => {
    showToast(`Bienvenido/a, ${user.name}. Acceso a ${user.roleTitle}`, 'verified');
    setTimeout(() => {
      if (user.role === 'kitchen') {
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
        staffList={INITIAL_STAFF}
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
