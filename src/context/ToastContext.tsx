'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type ToastMessage = { message: string; icon?: string };

interface ToastContextValue {
  toast: ToastMessage | null;
  /** Muestra un aviso 3,5 s. Identidad estable: se puede pasar a efectos sin re-suscribir. */
  showToast: (message: string, icon?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION_MS = 3500;

/**
 * Avisos flotantes de toda la app. Viven en su propio contexto (Tarea 25): antes
 * cada aviso re-renderizaba todo lo que leía el contexto del restaurante.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, icon = 'check_circle') => {
    setToast({ message, icon });
    // Un aviso nuevo reinicia la cuenta: antes el temporizador del anterior lo cortaba antes de tiempo.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return <ToastContext.Provider value={{ toast, showToast }}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
