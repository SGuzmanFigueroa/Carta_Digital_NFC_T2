'use client';

import React, { useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';

export interface SplitBillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface SplitBillModalProps {
  isOpen: boolean;
  /**
   * Saldo pendiente REAL de la mesa (`restaurant_tables.amount`), ya descontados
   * los abonos previos. Es la ÚNICA fuente de verdad de la división: los platos
   * son solo referencia visual y nunca imponen el importe a cobrar.
   */
  amountDue: number;
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
  amountDue,
  items,
  onClose,
  onConfirm
}: SplitBillModalProps) {
  const [mode, setMode] = useState<SplitMode>('total');
  const [people, setPeople] = useState(2);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Blindaje numérico: la división solo puede operar sobre un monto positivo.
  const safeAmountDue = Number.isFinite(amountDue) && amountDue > 0 ? amountDue : 0;

  const amountToPay = useMemo(() => {
    if (mode === 'equal') return roundToCents(safeAmountDue / people);
    if (mode === 'dishes') {
      const selectedTotal = items.reduce(
        (sum, item) => sum + (selectedItems.includes(item.id) ? item.price : 0),
        0
      );
      // La suma de platos nunca puede superar el saldo pendiente de la mesa.
      return roundToCents(Math.min(selectedTotal, safeAmountDue));
    }
    return roundToCents(safeAmountDue);
  }, [items, mode, people, safeAmountDue, selectedItems]);

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
    { id: 'total', label: 'Pagar Total' },
    { id: 'equal', label: 'Partes iguales' },
    { id: 'dishes', label: 'Por platos' }
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
              ¿Cómo deseas pagar?
            </h2>
            <p className="mt-1 text-sm text-[#64748b] dark:text-[#a1a1aa]">
              Saldo pendiente: S/ {safeAmountDue.toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar división de cuenta"
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
              <p className="text-sm font-semibold">Personas</p>
              <p className="text-xs text-[#64748b] dark:text-[#a1a1aa]">
                Monto por persona
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPeople((count) => Math.max(2, count - 1))}
                disabled={people <= 2}
                aria-label="Restar una persona"
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
                aria-label="Sumar una persona"
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
                        Cantidad: {item.quantity}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums">S/ {item.price.toFixed(2)}</span>
                </label>
              ))
            ) : (
              <p className="py-3 text-sm text-[#64748b] dark:text-[#a1a1aa]">
                No hay platos de una comanda activa para seleccionar.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-4 dark:border-[#2a2b36]">
          <span className="text-sm font-semibold">Monto a pagar</span>
          <span className="text-lg font-bold tabular-nums text-[#c2410c] dark:text-[#ffb59c]">
            S/ {amountToPay.toFixed(2)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onConfirm(amountToPay)}
          disabled={!Number.isFinite(amountToPay) || amountToPay <= 0 || safeAmountDue <= 0}
          className="min-h-11 w-full rounded-xl bg-[#ff5708] px-4 py-3 text-sm font-bold text-[#2b0b00] transition-colors hover:bg-[#ff6924] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continuar al pago
        </button>
      </section>
    </div>
  );
}
