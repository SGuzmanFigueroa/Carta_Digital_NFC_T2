'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { useDialog } from '@/hooks/useDialog';
import type { MenuItem } from '@/types';
import { ThreeDView } from './lazyViewers';
import { getModelId } from './useArViewer';

interface Dish3DInspectorModalProps {
  selectedDishForModal: MenuItem | null;
  onClose: () => void;
  onAddToCart: (item: MenuItem) => void;
  onShowToast: (message: string, icon?: string) => void;
  /** Abre la misma ficha en realidad aumentada. */
  onOpenAr: (dish: MenuItem) => void;
}

/** Ficha 3D de un plato (giro 360°) con botón para agregarlo al pedido. */
export function Dish3DInspectorModal({ selectedDishForModal, onClose, onAddToCart: handleAddToCart, onShowToast, onOpenAr: openArViewer }: Dish3DInspectorModalProps) {
  const { t } = useLanguage();
  const setSelectedDishForModal = (dish: null) => { if (dish === null) onClose(); };
  const dishDialog = useDialog(Boolean(selectedDishForModal), onClose);


  return (
    <>
    {selectedDishForModal && (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
        <div {...dishDialog} aria-label={t('dish.threeDTitle', { dish: selectedDishForModal.name })} className="bg-white dark:bg-[#15161c] w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-primary/40 shadow-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-[#24252e]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">view_in_ar</span>
              <h3 className="text-[15px] sm:text-[16px] font-bold text-[#0f172a] dark:text-white truncate">
                {t('dish.threeDTitle', { dish: selectedDishForModal.name })}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDishForModal(null)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#475569] dark:text-[#a1a1aa] hover:text-[#0f172a] dark:hover:text-white cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Custom 3D canvas tailored to this specific dish! */}
          <ThreeDView
            dishId={getModelId(selectedDishForModal)}
            heightClass="h-64 sm:h-72"
            onInteract={() => onShowToast(t('toast.inspecting', { dish: selectedDishForModal.name }), '3d_rotation')}
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-code text-primary font-bold">{selectedDishForModal.tag}</span>
              <span className="text-[18px] font-mono-code font-bold text-primary">
                S/ {selectedDishForModal.price.toFixed(2)}
              </span>
            </div>
            <p className="text-[12px] text-[#475569] dark:text-[#a1a1aa] leading-relaxed">
              {selectedDishForModal.description}
            </p>
          </div>

          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                openArViewer(selectedDishForModal);
                setSelectedDishForModal(null);
              }}
              className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1d4ed8] border border-[#cbd5e1] dark:bg-[#1e1f28] dark:hover:bg-[#282935] dark:text-[#a1c9ff] dark:border-[#353642] text-[12px] flex items-center gap-1.5 cursor-pointer"
              title={t('dish.projectArTableTitle')}
            >
              <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
              <span>{t('dish.arViewer')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleAddToCart(selectedDishForModal);
                setSelectedDishForModal(null);
              }}
              className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-primary text-on-primary font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-lg hover:brightness-110 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
              <span>{t('dish.orderPrice', { price: `S/ ${selectedDishForModal.price.toFixed(2)}` })}</span>
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
