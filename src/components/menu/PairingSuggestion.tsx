'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { MenuItem } from '@/types';

interface PairingSuggestionProps {
  item: MenuItem;
  onAddPairing: (pairing: string) => void;
}

export function PairingSuggestion({
  item,
  onAddPairing
}: PairingSuggestionProps) {
  const [wasAdded, setWasAdded] = useState(false);
  const pairing = item.pairing?.trim();
  if (!pairing) return null;

  const handleAddPairing = () => {
    onAddPairing(pairing);
    setWasAdded(true);
  };

  return (
    <section
      aria-label="Sugerencia de maridaje"
      className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm text-gray-600 dark:text-white/70"
    >
      <p className="min-w-0 flex-1">
        <span aria-hidden="true">✨</span>{' '}
        Combínalo perfecto con:{' '}
        <span className="font-semibold text-gray-900 dark:text-white">{pairing}</span>
      </p>
      <button
        type="button"
        onClick={handleAddPairing}
        aria-label={wasAdded ? `${pairing} agregado al pedido` : `Agregar ${pairing} al pedido como maridaje`}
        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-medium text-[#c2410c] transition-colors hover:text-[#9a3412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5708] dark:text-[#ffb59c] dark:hover:text-white"
      >
        {wasAdded ? (
          <span aria-live="polite">¡Agregado!</span>
        ) : (
          <>
            <Plus size={16} aria-hidden="true" />
            <span>Agregar maridaje</span>
          </>
        )}
      </button>
    </section>
  );
}
