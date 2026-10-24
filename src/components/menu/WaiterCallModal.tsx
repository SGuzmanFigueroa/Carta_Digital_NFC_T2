'use client';

import React from 'react';
import { WAITER_CALL_OPTIONS } from '@/services/waiterCallService';
import { WaiterCallReason } from '@/types';
import { useDialog } from '@/hooks/useDialog';
import { useLanguage } from '@/hooks/useLanguage';
import type { TranslationKey } from '@/i18n/translations';

interface WaiterCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (reason: WaiterCallReason) => void;
  tableNumber: string;
}

/**
 * CD-31 · Mapa motivo persistido -> clave de traducción.
 *
 * El `reason` identifica el llamado en `public.waiter_calls` y lo consume el
 * KDS/Salón (contrato de datos en español): NO se traduce. Solo se traduce el
 * rótulo visible del comensal, así la UI responde al selector ES/EN sin alterar
 * el registro ni la lógica del salón.
 */
const WAITER_REASON_LABEL_KEYS: Record<WaiterCallReason, TranslationKey> = {
  'Traer cubiertos/servilletas': 'waiter.reasonCutlery',
  'Consulta al mozo': 'waiter.reasonConsultation',
  'Llamar mozo general': 'waiter.reasonGeneral'
};

/**
 * GastroPulse OS · CD-28 · Asistencia en Mesa (Bottom Sheet del comensal)
 *
 * Diseño plano y minimalista: NO hay cards ni recuadros de fondo.
 * Cada opción es una fila desnuda (icono + texto + chevron) separada por un
 * divisor de 1px. Touch targets de 56px y contraste AA en tema claro/oscuro.
 * SSR-safe: no accede a `window` en render y no renderiza nada si está cerrado.
 */
export const WaiterCallModal: React.FC<WaiterCallModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  tableNumber
}) => {
  // CD-31 · Idioma de la carta (el hook se invoca siempre, antes de cualquier salida).
  const { t } = useLanguage();
  const dialog = useDialog(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      role="presentation"
    >
      <div {...dialog} aria-label={t('waiter.sheetAria')} className="bg-white dark:bg-[#15161c] w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-[#e2e8f0] dark:border-[#24252e] shadow-2xl pt-4 pb-8 sm:pb-5 max-h-[92vh] overflow-y-auto overscroll-contain">
        {/* Cabecera del sheet (sin contenedor extra) */}
        <div className="flex items-center justify-between gap-3 px-5 pb-3 border-b border-[#e2e8f0] dark:border-[#24252e]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-[26px] text-[#ff5708] shrink-0">
              concierge
            </span>
            <div className="min-w-0">
              <h3 className="text-[17px] font-bold text-[#0f172a] dark:text-white leading-tight">
                {t('waiter.title')}
              </h3>
              <span className="text-[11px] font-mono-code text-[#c2410c] dark:text-[#ffb59c] font-semibold">
                {t('waiter.subtitle', { table: tableNumber })}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('waiter.close')}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#64748b] hover:text-[#0f172a] dark:text-[#a1a1aa] dark:hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5708]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Opciones: filas planas, cero recuadros */}
        <div className="divide-y divide-[#e2e8f0] dark:divide-[#24252e]">
          {WAITER_CALL_OPTIONS.map((option) => (
            <button
              key={option.reason}
              type="button"
              onClick={() => onSelect(option.reason)}
              className="w-full min-h-[56px] flex items-center gap-3.5 px-5 text-left transition-colors hover:bg-[#f1f5f9] active:bg-[#e2e8f0] dark:hover:bg-[#1e1f28] dark:active:bg-[#24252e] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff5708]"
            >
              <span className="material-symbols-outlined text-[24px] text-[#c2410c] dark:text-[#ffb59c] shrink-0">
                {option.icon}
              </span>
              <span className="flex-1 text-[15px] font-medium text-[#0f172a] dark:text-[#e5e1e4]">
                {t(WAITER_REASON_LABEL_KEYS[option.reason])}
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#94a3b8] dark:text-[#52525b] shrink-0">
                chevron_right
              </span>
            </button>
          ))}
        </div>

        <p className="px-5 pt-3 text-[11px] leading-relaxed text-[#64748b] dark:text-[#a1a1aa]">
          {t('waiter.footer')}
        </p>
      </div>
    </div>
  );
};

export default WaiterCallModal;
