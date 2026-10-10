'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { MenuItem } from '@/types';
import { PairingSuggestion } from './PairingSuggestion';

interface DishDetailModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddPairing: (pairing: string) => void;
}

export function DishDetailModal({
  item,
  onClose,
  onAddPairing
}: DishDetailModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!item) return;

    const previousActiveElement = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (previousActiveElement instanceof HTMLElement) previousActiveElement.focus();
    };
  }, [item]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
        {item && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-md dark:bg-black/75 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            role="presentation"
          >
            <motion.section
              aria-labelledby="dish-detail-title"
              aria-describedby="dish-detail-description"
              aria-modal="true"
              className="relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200/50 bg-white/90 text-gray-900 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.16),0_8px_24px_-12px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] backdrop-blur-2xl dark:border-white/10 dark:bg-[#111318]/95 dark:text-white dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] dark:ring-white/5"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <button
                type="button"
                ref={closeButtonRef}
                onClick={onClose}
                aria-label="Cerrar ficha del plato"
                className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/70 dark:border-white/20"
              >
                <X size={20} />
              </button>

              <div className="relative h-56 bg-black sm:h-72">
                <Image
                  src={item.image_url_hd || item.image}
                  alt={item.name}
                  width={1280}
                  height={720}
                  unoptimized
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
                <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4 sm:bottom-5 sm:left-7 sm:right-7">
                  <h2 id="dish-detail-title" className="text-2xl font-bold leading-tight text-white drop-shadow sm:text-3xl">
                    {item.name}
                  </h2>
                  <span className="shrink-0 rounded-xl border border-white/20 bg-black/45 px-3 py-2 font-mono-code text-lg font-bold text-[#ffb59c] backdrop-blur">
                    S/ {item.price.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="max-h-[calc(92vh-14rem)] space-y-5 overflow-y-auto p-5 sm:max-h-[calc(92vh-18rem)] sm:p-7">
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-white/50">
                    Descripción
                  </h3>
                  <p id="dish-detail-description" className="text-sm leading-7 text-gray-700 dark:text-white/80">
                    {item.description}
                  </p>
                </section>

                <section aria-labelledby="dish-allergens-title">
                  <h3
                    id="dish-allergens-title"
                    className="mb-2.5 text-xs font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-white/50"
                  >
                    Alérgenos
                  </h3>
                  {item.allergens && item.allergens.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {item.allergens.map((allergen) => (
                        <span
                          key={allergen}
                          className="rounded-full border border-amber-300/70 bg-amber-50/90 px-3 py-1.5 text-xs font-medium text-amber-900 backdrop-blur-sm dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100"
                        >
                          {allergen}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 rounded-xl border border-amber-300/70 bg-amber-50/90 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:border-amber-300/15 dark:bg-amber-400/5 dark:text-amber-100/80">
                      <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
                      Información de alérgenos no disponible para este plato.
                    </p>
                  )}
                </section>

                <PairingSuggestion
                  item={item}
                  onAddPairing={onAddPairing}
                />
              </div>
            </motion.section>
          </motion.div>
        )}
    </AnimatePresence>,
    document.body
  );
}
