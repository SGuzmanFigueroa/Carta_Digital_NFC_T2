'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useDialog } from '@/hooks/useDialog';
import type { MenuItem } from '@/types';
import { cartLineKey, type MenuCartItem } from './cart';
import { localizeMenuItemName } from '@/i18n/menuContent';
import { localizeTableLabel } from '@/i18n/tableLabel';
import { AnimatedSoles } from '../menu/AnimatedSoles';

interface CartDrawerProps {
  isCartOpen: boolean;
  onClose: () => void;
  selectedTable: string;
  cart: MenuCartItem[];
  cartTotal: number;
  /** Mientras se verifica la ubicación no se puede enviar (evita doble envío). */
  isVerifyingGeofence: boolean;
  /** Líneas del carrito con el campo de nota abierto. */
  activeNoteItemId: Record<string, boolean>;
  setActiveNoteItemId: Dispatch<SetStateAction<Record<string, boolean>>>;
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (lineKey: string) => void;
  onUpdateNotes: (lineKey: string, notes: string) => void;
  onSendOrder: () => void;
  onOpenSplitBill: () => void;
}

/** Hoja del pedido: revisar platos, notas de cocina, enviar a cocina o pedir la cuenta. */
export function CartDrawer({
  isCartOpen, onClose, selectedTable, cart, cartTotal, isVerifyingGeofence, activeNoteItemId, setActiveNoteItemId,
  onAddToCart: handleAddToCart, onRemoveFromCart: handleRemoveFromCart, onUpdateNotes: handleUpdateNotes,
  onSendOrder: handleSendOrder, onOpenSplitBill: handleOpenSplitBill
}: CartDrawerProps) {
  const { language, t } = useLanguage();
  const setIsCartOpen = (open: boolean) => { if (!open) onClose(); };
  const cartDialog = useDialog(isCartOpen, onClose);


  return (
    <>
    {isCartOpen && (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
        <div {...cartDialog} aria-labelledby="cart-dialog-title" className="bg-white dark:bg-[#15161c] w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-[#e2e8f0] dark:border-[#2d2e38] shadow-2xl p-5 space-y-4 max-h-[88vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-[#24252e]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
              <h3 id="cart-dialog-title" className="text-[16px] font-bold text-[#0f172a] dark:text-white">{t('cart.title', { table: localizeTableLabel(selectedTable, language) })}</h3>
            </div>
            <button
              type="button"
              aria-label={t('cart.close')}
              onClick={() => setIsCartOpen(false)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#475569] dark:text-[#a1a1aa] hover:text-[#0f172a] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#24252e] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {cart.map((c) => (
              <div
                key={cartLineKey(c.item)}
                className="bg-[#f8fafc] dark:bg-[#1e1f28] p-3 rounded-xl border border-[#e2e8f0] dark:border-[#2a2b36] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] sm:text-[14px] font-semibold text-[#0f172a] dark:text-white truncate">
                      {localizeMenuItemName(c.item, language)}
                    </h4>
                    <span className="font-mono-code text-[12px] text-primary font-bold">
                      S/ {(c.item.price * c.quantity).toFixed(2)}
                    </span>
                  </div>

                  <div className="inline-flex items-center rounded-xl bg-[#f1f5f9] dark:bg-[#15161c] border border-[#cbd5e1] dark:border-[#2d2e38] p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(cartLineKey(c.item))}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[#475569] dark:text-[#a1a1aa] hover:bg-primary hover:text-white active:scale-90 transition-all font-bold text-[15px] cursor-pointer select-none"
                      title={t('cart.decrease')}
                    >
                      -
                    </button>
                    <span className="min-w-[24px] text-center font-mono-code text-[12px] font-bold text-[#0f172a] dark:text-white select-none">
                      {c.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(c.item)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[#475569] dark:text-[#a1a1aa] hover:bg-primary hover:text-white active:scale-90 transition-all font-bold text-[15px] cursor-pointer select-none"
                      title={t('cart.increase')}
                    >
                      +
                    </button>
                  </div>
                </div>

                {Boolean(activeNoteItemId[cartLineKey(c.item)] || (c.notes && c.notes.trim().length > 0)) ? (
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      maxLength={60}
                      placeholder={t('cart.notePlaceholder')}
                      value={c.notes || ''}
                      onChange={(e) => handleUpdateNotes(cartLineKey(c.item), e.target.value)}
                      className="w-full bg-white dark:bg-[#15161c] text-[#0f172a] dark:text-[#e5e1e4] pl-2.5 pr-8 py-2 min-h-[44px] rounded-lg text-[11px] placeholder:text-[#94a3b8] dark:placeholder:text-[#71717a] border border-[#e2e8f0] dark:border-[#2d2e38] focus:outline-none focus:border-primary"
                      autoFocus={Boolean(activeNoteItemId[cartLineKey(c.item)] && !c.notes)}
                    />
                    {(!c.notes || c.notes.length === 0) ? (
                      <button
                        type="button"
                        onClick={() => setActiveNoteItemId((prev) => ({ ...prev, [cartLineKey(c.item)]: false }))}
                        aria-label={t('cart.closeNote')}
                        className="absolute right-2 text-[#94a3b8] hover:text-[#475569] dark:hover:text-white p-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateNotes(cartLineKey(c.item), '');
                          setActiveNoteItemId((prev) => ({ ...prev, [cartLineKey(c.item)]: false }));
                        }}
                        title={t('cart.removeNote')}
                        aria-label={t('cart.removeNote')}
                        className="absolute right-2 text-[#94a3b8] hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveNoteItemId((prev) => ({ ...prev, [cartLineKey(c.item)]: true }))}
                    className="w-full flex items-center justify-start gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8] hover:text-primary dark:hover:text-primary hover:bg-[#f1f5f9] dark:hover:bg-[#181920] rounded-lg border border-dashed border-[#cbd5e1] dark:border-[#2a2b36] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit_note</span>
                    <span>{t('cart.addNote')}</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* CD-27 · Resumen del pedido: los tres importes cuentan a 60 FPS
              (misma duración y easing, así el subtotal + IGV siguen sumando
              exactamente el total en todos los frames intermedios). */}
          <div className="p-3 bg-[#f1f5f9] dark:bg-[#0e0e10] rounded-xl space-y-1.5 text-[11px] sm:text-[12px] font-mono-code">
            <div className="flex justify-between text-[#475569] dark:text-[#a1a1aa]">
              <span>{t('cart.subtotalNoIgv')}</span>
              <span><AnimatedSoles value={cartTotal / 1.18} /></span>
            </div>
            <div className="flex justify-between text-[#475569] dark:text-[#a1a1aa]">
              <span>{t('cart.igv')}</span>
              <span><AnimatedSoles value={cartTotal - cartTotal / 1.18} /></span>
            </div>
            <div className="flex justify-between text-[#0f172a] dark:text-white font-bold text-[14px] sm:text-[15px] pt-1.5 border-t border-[#e2e8f0] dark:border-[#24252e]">
              <span>{t('cart.totalToPay')}</span>
              <span className="text-primary font-bold"><AnimatedSoles value={cartTotal} /></span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-[#f1f5f9] text-[#0f172a] border border-[#cbd5e1] dark:border-transparent dark:bg-[#24252e] dark:text-[#e5e1e4] font-medium text-[13px] hover:bg-[#e2e8f0] dark:hover:bg-[#2d2e3a] cursor-pointer"
              >
                {t('cart.keepOrdering')}
              </button>
              <button
                type="button"
                onClick={handleSendOrder}
                disabled={isVerifyingGeofence}
                aria-busy={isVerifyingGeofence}
                className="disabled:opacity-60 disabled:cursor-wait flex-1 py-2.5 min-h-[44px] rounded-xl bg-primary text-on-primary font-bold text-[13px] flex items-center justify-center gap-1.5 hover:brightness-110 shadow-lg cursor-pointer"
              >
                <span>{t('cart.confirmSend')}</span>
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </div>

            {/* CD-10 · Botón directo para pedir la cuenta y pagar con QR */}
            <button
              type="button"
              onClick={() => {
                setIsCartOpen(false);
                handleOpenSplitBill();
              }}
              className="w-full py-2.5 min-h-[44px] rounded-xl border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 font-bold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[17px]">qr_code_2</span>
              <span>{t('cart.requestAccount')}</span>
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
