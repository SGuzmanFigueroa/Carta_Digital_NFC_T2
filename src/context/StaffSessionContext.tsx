'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { AuthUser } from '@/types';
import { supabase } from '@/lib/supabase';
import { kitchenAudio } from '@/utils/audio';
import { loadCurrentStaffUser, logoutStaff, verifyMyPin } from '@/services/authService';
import { AuditLogger, type AuditLogEntry, readAuthSession, AUTH_SESSION_CHANGE_EVENT } from '@/utils/security';
import { useDialog } from '@/hooks/useDialog';
import { useToast } from './ToastContext';
import { isStaffManagementRoute, STORAGE_KEY_AUTH } from './restaurantHelpers';

interface StaffSessionContextValue {
  currentUser: AuthUser | null;
  isTerminalLocked: boolean;
  logoutUser: () => void;
  lockTerminal: () => void;
  unlockTerminalWithPin: (pin: string) => Promise<boolean>;
  logSecurityEvent: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'isoDate'>) => AuditLogEntry;
}

const StaffSessionContext = createContext<StaffSessionContextValue | undefined>(undefined);

/**
 * Sesión del personal (Tarea 25): usuario de Supabase Auth, bloqueo de la
 * terminal con PIN y bloqueo por inactividad. Antes vivía dentro del contexto
 * del restaurante y cada cambio re-renderizaba también la carta del comensal.
 */
export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isTerminalLocked, setIsTerminalLocked] = useState<boolean>(false);
  const [quickUnlockPin, setQuickUnlockPin] = useState<string>('');
  const [quickUnlockError, setQuickUnlockError] = useState<string>('');

  const logSecurityEvent = useCallback(
    (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'isoDate'>) => {
      return AuditLogger.log({
        user: entry.user || currentUser?.name,
        role: entry.role || currentUser?.role,
        ...entry
      });
    },
    [currentUser]
  );

  const logoutUser = useCallback(async () => {
    setCurrentUser(null);
    setIsTerminalLocked(false);
    await logoutStaff();
    if (typeof window !== 'undefined') {
      // Recarga completa a propósito: borra todo el estado en memoria del personal.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/login';
    }
  }, []);

  const lockTerminal = useCallback(() => {
    setIsTerminalLocked(true);
    setQuickUnlockPin('');
    setQuickUnlockError('');
    AuditLogger.log({
      eventType: 'SESSION_LOCKED',
      severity: 'INFO',
      user: currentUser?.name || 'TERMINAL',
      details: 'Terminal bloqueada manualmente por el operador'
    });
  }, [currentUser]);

  const unlockTerminalWithPin = useCallback(
    async (pin: string): Promise<boolean> => {
      let check: Awaited<ReturnType<typeof verifyMyPin>>;
      try {
        check = await verifyMyPin(pin);
      } catch {
        setQuickUnlockError('No se pudo validar el PIN. Revisa la conexión.');
        setQuickUnlockPin('');
        return false;
      }
      if (check.ok) {
        setIsTerminalLocked(false);
        setQuickUnlockPin('');
        setQuickUnlockError('');
        AuditLogger.log({
          eventType: 'SESSION_UNLOCKED',
          severity: 'INFO',
          user: currentUser?.name || 'TERMINAL',
          details: 'Terminal desbloqueada con PIN exitosamente'
        });
        showToast('Terminal desbloqueada', 'lock_open');
        return true;
      } else {
        kitchenAudio.playAllergyWarning();
        setQuickUnlockError(
          check.reason === 'locked'
            ? 'PIN bloqueado por 5 minutos. Cierra sesión y entra con tu contraseña.'
            : check.reason === 'no_pin'
            ? 'No tienes PIN configurado. Pide al administrador que te asigne uno.'
            : `PIN incorrecto. Te quedan ${check.remaining ?? 0} intentos.`
        );
        setQuickUnlockPin('');
        AuditLogger.log({
          eventType: 'LOGIN_FAILED',
          severity: 'WARN',
          user: currentUser?.name || 'TERMINAL',
          details: 'Intento fallido de desbloqueo rápido de terminal con PIN'
        });
        return false;
      }
    },
    [currentUser, showToast]
  );

  // Perfil en caché para pintar sin parpadeo; abajo se confirma con Supabase Auth.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage solo existe en el navegador
    setCurrentUser(readAuthSession());
  }, []);

  // La sesión real es la de Supabase Auth: confirma (o descarta) el perfil en
  // caché y reacciona si la sesión se cierra o vence en cualquier pestaña.
  useEffect(() => {
    let cancelled = false;
    loadCurrentStaffUser()
      .then((user) => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch(() => undefined);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsTerminalLocked(false);
      }
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  // Sincronización reactiva de la sesión: login, logout, cambio de usuario o
  // modificaciones desde otro tab del mismo terminal actualizan el rol en vivo.
  useEffect(() => {
    const handleSessionChange = (event: Event) => {
      const session = (event as CustomEvent<AuthUser | null>).detail ?? null;
      setCurrentUser(session);
      if (!session) {
        setIsTerminalLocked(false);
      }
    };

    const handleStorageSync = (event: StorageEvent) => {
      // Sólo reacciona a cambios de la clave de sesión (o a un clear global)
      if (event.key !== null && event.key !== STORAGE_KEY_AUTH) return;
      setCurrentUser(readAuthSession());
    };

    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleSessionChange);
    window.addEventListener('storage', handleStorageSync);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleSessionChange);
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  // Blindaje absoluto: si el usuario está en la carta (/ o /menu), desbloquear de
  // inmediato. Se ajusta durante el render, así la carta nunca pinta el candado.
  const isOnStaffRoute = isStaffManagementRoute(pathname || (typeof window !== 'undefined' ? window.location.pathname : ''));
  if (!isOnStaffRoute && (isTerminalLocked || quickUnlockPin || quickUnlockError)) {
    setIsTerminalLocked(false);
    setQuickUnlockPin('');
    setQuickUnlockError('');
  }

  // Inactivity auto-lock monitor (EXCLUSIVO para terminales operativas del staff: /kds, /pedidos, etc.)
  useEffect(() => {
    if (!isOnStaffRoute) return;
    if (!currentUser || isTerminalLocked) return;

    let timeoutId: NodeJS.Timeout;
    const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsTerminalLocked(true);
        AuditLogger.log({
          eventType: 'SESSION_LOCKED',
          severity: 'WARN',
          user: currentUser.name,
          details: 'Terminal bloqueada automáticamente por 5 min de inactividad'
        });
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'pointerdown'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [currentUser, isTerminalLocked, isOnStaffRoute]);

  const lockDialog = useDialog(Boolean(isTerminalLocked && currentUser && isOnStaffRoute));

  return (
    <StaffSessionContext.Provider
      value={{ currentUser, isTerminalLocked, logoutUser, lockTerminal, unlockTerminalWithPin, logSecurityEvent }}
    >
      {children}

      {/* Terminal Inactivity Quick Lock Screen Overlay (EXCLUSIVO para terminales del staff: /kds, /pedidos, etc.) */}
      {isTerminalLocked && currentUser && isStaffManagementRoute(pathname || (typeof window !== 'undefined' ? window.location.pathname : '')) && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
          <div {...lockDialog} aria-label="Terminal bloqueada por inactividad" className="bg-[#161619] max-w-sm w-full rounded-2xl border border-[#ff5708]/50 p-6 space-y-5 text-center shadow-[0_0_50px_rgba(255,87,8,0.25)]">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#ff5708]/20 border border-[#ff5708]/40 flex items-center justify-center text-[#ff5708]">
              <span className="material-symbols-outlined text-[32px]">lock</span>
            </div>

            <div>
              <span className="font-label-code text-[11px] text-[#ffb59c] uppercase font-bold tracking-wider">
                Terminal Bloqueada por Inactividad
              </span>
              <h3 className="text-[20px] font-bold text-white mt-1">{currentUser.name}</h3>
              <p className="text-[12px] text-[#c6c5cf] mt-0.5 font-label-code">
                {currentUser.roleTitle} • Ingresa tu PIN para continuar
              </p>
            </div>

            {quickUnlockError && (
              <div className="p-2 rounded-lg bg-[#93000a]/30 border border-[#ffb4ab]/40 text-[#ffb4ab] text-[12px]">
                {quickUnlockError}
              </div>
            )}

            {/* Bullets */}
            <div className="flex justify-center items-center gap-3 py-1">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                    quickUnlockPin.length > index
                      ? 'bg-[#ff5708] border-[#ff5708] shadow-[0_0_10px_#ff5708]'
                      : 'bg-transparent border-[#353437]'
                  }`}
                />
              ))}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    if (quickUnlockPin.length < 4) {
                      const next = quickUnlockPin + digit;
                      setQuickUnlockPin(next);
                      if (next.length === 4) {
                        unlockTerminalWithPin(next);
                      }
                    }
                  }}
                  className="h-11 rounded-xl bg-[#201f22] hover:bg-[#2a2a2c] active:bg-[#ff5708] text-white font-bold text-[18px] transition-colors cursor-pointer border border-[#353437]/40"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setQuickUnlockPin('')}
                className="h-11 rounded-xl bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] font-medium text-[11px] flex items-center justify-center cursor-pointer border border-[#353437]/40"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (quickUnlockPin.length < 4) {
                    const next = quickUnlockPin + '0';
                    setQuickUnlockPin(next);
                    if (next.length === 4) {
                      unlockTerminalWithPin(next);
                    }
                  }
                }}
                className="h-11 rounded-xl bg-[#201f22] hover:bg-[#2a2a2c] active:bg-[#ff5708] text-white font-bold text-[18px] transition-colors cursor-pointer border border-[#353437]/40"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setQuickUnlockPin((prev) => prev.slice(0, -1))}
                className="h-11 rounded-xl bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] flex items-center justify-center cursor-pointer border border-[#353437]/40"
              >
                <span className="material-symbols-outlined text-[18px]">backspace</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[#353437]/40 flex items-center justify-between text-[11px]">
              <span className="text-[#c6c5cf]">¿No eres tú?</span>
              <button
                type="button"
                onClick={logoutUser}
                className="text-[#ff5708] hover:underline font-semibold cursor-pointer"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </StaffSessionContext.Provider>
  );
}

export function useStaffSession(): StaffSessionContextValue {
  const context = useContext(StaffSessionContext);
  if (!context) throw new Error('useStaffSession must be used within a StaffSessionProvider');
  return context;
}
