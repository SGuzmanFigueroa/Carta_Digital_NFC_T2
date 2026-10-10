'use client';

import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';

interface GeofenceWarningModalProps {
  isOpen: boolean;
  distanceMeters: number;
  maxAllowedMeters: number;
  message: string;
  onRetry: () => void;
  onClose: () => void;
  onCallWaiter?: () => void;
  isLight?: boolean;
}

/**
 * GastroPulse OS · CD-19 & CD-31
 * Aviso de geo-cerca GPS antifraude. Todos los textos fijos se resuelven con el
 * diccionario del comensal (ES/EN) y el mensaje dinámico llega ya localizado
 * desde la carta (`QRMenuViewer`), que conoce el motivo real del rechazo.
 */
export const GeofenceWarningModal: React.FC<GeofenceWarningModalProps> = ({
  isOpen,
  distanceMeters,
  maxAllowedMeters,
  message,
  onRetry,
  onClose,
  onCallWaiter,
  isLight = false,
}) => {
  // CD-31 · Idioma de la carta (el hook se invoca SIEMPRE, antes de cualquier salida).
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-5 transition-all ${
          isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-[#e5e1e4]'
        }`}
      >
        {/* Icono de Seguridad */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className={`text-lg font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              {t('geofence.modalTitle')}
            </h3>
            <p className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-gray-400'}`}>
              {t('geofence.modalSubtitle')}
            </p>
          </div>
        </div>

        {/* Mensaje descriptivo */}
        <div className={`p-4 rounded-xl text-xs space-y-2 border ${
          isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
        }`}>
          <p className="font-medium leading-relaxed">
            {message}
          </p>
          {distanceMeters > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-amber-200/50 dark:border-amber-500/20 font-mono text-[11px]">
              <span>{t('geofence.distance')} <strong>{distanceMeters} m</strong></span>
              <span>{t('geofence.limit')} <strong>{maxAllowedMeters} m</strong></span>
            </div>
          )}
        </div>

        <p className={`text-xs leading-relaxed ${isLight ? 'text-[#64748b]' : 'text-gray-400'}`}>
          {t('geofence.body')}
        </p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-[#FF5A1F] text-white hover:bg-[#e04f1a] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('geofence.retry')}
          </button>

          {onCallWaiter && (
            <button
              type="button"
              onClick={() => {
                onCallWaiter();
                onClose();
              }}
              className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a] hover:bg-slate-50' : 'bg-[#27272a] border-[#3f3f46] text-white hover:bg-[#3f3f46]'
              }`}
            >
              {t('geofence.callWaiter')}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className={`py-3 px-4 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('geofence.close')}
          </button>
        </div>
      </div>
    </div>
  );
};