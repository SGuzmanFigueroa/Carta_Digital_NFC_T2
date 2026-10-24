'use client';

import React, { useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { useLanguage } from '@/hooks/useLanguage';

export interface SplitBillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface SplitBillModalProps {
  isOpen: boolean;
  totalAmount: number;
  items: SplitBillItem[];
  onClose: () => void;
  onConfirm: (amount: number) => void;
}

type SplitMode = 'total' | 'equal' | 'dishes';

const MAX_PEOPLE = 24;

function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function SplitBillModal({
  isOpen,
  totalAmount,
  items,
  onClose,
  onConfirm
}: SplitBillModalProps) {
  // CD-31 · Idioma de la carta: todos los rótulos se resuelven con `t()`.
  const { t } = useLanguage();
  const [mode, setMode] = useState<SplitMode>('total');
  const [people, setPeople] = useState(2);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const amountToPay = useMemo(() => {
    if (mode === 'equal') return roundToCents(totalAmount / people);
    if (mode === 'dishes') {
      return roundToCents(
        items.reduce(
          (sum, item) => sum + (selectedItems.includes(item.id) ? item.price : 0),
          0
        )
      );
    }
    return roundToCents(totalAmount);
  }, [items, mode, people, selectedItems, totalAmount]);

  const dialog = useDialog<HTMLElement>(isOpen, onClose);

  if (!isOpen) return null;

  const toggleItem = (itemId: string) => {
    setSelectedItems((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    );
  };

  const modes: Array<{ id: SplitMode; label: string }> = [
    { id: 'total', label: t('splitBill.modeTotal') },
    { id: 'equal', label: t('splitBill.modeEqual') },
    { id: 'dishes', label: t('splitBill.modeDishes') }
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        {...dialog}
        aria-labelledby="split-bill-title"
        className="w-full max-w-md space-y-5 rounded-t-3xl bg-white p-5 text-[#0f172a] shadow-2xl dark:bg-[#15161c] dark:text-white sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 id="split-bill-title" className="text-lg font-bold">
              {t('splitBill.title')}
            </h2>
            <p className="mt-1 text-sm text-[#64748b] dark:text-[#a1a1aa]">
              {t('splitBill.total', { amount: `S/ ${totalAmount.toFixed(2)}` })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('splitBill.close')}
            className="rounded-full p-2 text-[#64748b] transition-colors hover:bg-[#f1f5f9] dark:hover:bg-[#24252e]"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </header>

        <div className="grid grid-cols-3 gap-1 border-b border-[#e2e8f0] dark:border-[#2a2b36]">
          {modes.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              aria-pressed={mode === option.id}
              className={`min-h-11 border-b-2 px-1 text-xs font-semibold transition-colors ${
                mode === option.id
                  ? 'border-[#ff5708] text-[#c2410c] dark:text-[#ffb59c]'
                  : 'border-transparent text-[#64748b] hover:text-[#0f172a] dark:text-[#a1a1aa] dark:hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {mode === 'equal' && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{t('splitBill.guests')}</p>
              <p className="text-xs text-[#64748b] dark:text-[#a1a1aa]">
                {t('splitBill.amountPerPerson')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPeople((count) => Math.max(2, count - 1))}
                disabled={people <= 2}
                aria-label={t('splitBill.removeGuest')}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#c2410c] transition-colors hover:bg-[#fff1eb] disabled:opacity-40 dark:text-[#ffb59c] dark:hover:bg-[#24252e]"
              >
                <Minus aria-hidden="true" size={17} />
              </button>
              <span className="min-w-5 text-center text-base font-bold" aria-live="polite">
                {people}
              </span>
              <button
                type="button"
                onClick={() => setPeople((count) => Math.min(MAX_PEOPLE, count + 1))}
                disabled={people >= MAX_PEOPLE}
                aria-label={t('splitBill.addGuest')}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#c2410c] transition-colors hover:bg-[#fff1eb] disabled:opacity-40 dark:text-[#ffb59c] dark:hover:bg-[#24252e]"
              >
                <Plus aria-hidden="true" size={17} />
              </button>
            </div>
          </div>
        )}

        {mode === 'dishes' && (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {items.length > 0 ? (
              items.map((item) => (
                <label
                  key={item.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="h-4 w-4 accent-[#ff5708]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.name}</span>
                    {item.quantity > 1 && (
                      <span className="text-xs text-[#64748b] dark:text-[#a1a1aa]">
                        {t('splitBill.quantity', { count: item.quantity })}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums">S/ {item.price.toFixed(2)}</span>
                </label>
              ))
            ) : (
              <p className="py-3 text-sm text-[#64748b] dark:text-[#a1a1aa]">
                {t('splitBill.emptyItems')}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-4 dark:border-[#2a2b36]">
          <span className="text-sm font-semibold">{t('splitBill.amountToPay')}</span>
          <span className="text-lg font-bold tabular-nums text-[#c2410c] dark:text-[#ffb59c]">
            S/ {amountToPay.toFixed(2)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onConfirm(amountToPay)}
          disabled={!Number.isFinite(amountToPay) || amountToPay <= 0}
          className="min-h-11 w-full rounded-xl bg-[#ff5708] px-4 py-3 text-sm font-bold text-[#2b0b00] transition-colors hover:bg-[#ff6924] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('splitBill.continue')}
        </button>
      </section>
    </div>
  );
}
