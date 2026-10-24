'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock3, History, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { OrderRound } from '@/types';
import { useDialog } from '@/hooks/useDialog';
import { useLanguage } from '@/hooks/useLanguage';
import { KITCHEN_STATUS_LABEL_KEYS } from '@/i18n/orderStatus';
import { localizeTableLabel } from '@/i18n/tableLabel';

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  rounds: OrderRound[];
}

const statusStyles: Record<OrderRound['items'][number]['status'], string> = {
  Recibido: 'border-sky-300/70 bg-sky-50 text-sky-800 dark:border-sky-300/20 dark:bg-sky-400/10 dark:text-sky-200',
  'En preparación': 'border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200',
  'Listo en pase': 'border-violet-300/70 bg-violet-50 text-violet-800 dark:border-violet-300/20 dark:bg-violet-400/10 dark:text-violet-200',
  Entregado: 'border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200'
};

const calculateRoundSubtotal = (round: OrderRound): number =>
  round.items.reduce((subtotal, item) => subtotal + item.price * item.quantity, 0);

export function OrderHistoryModal({ isOpen, onClose, tableNumber, rounds }: OrderHistoryModalProps) {
  const dialog = useDialog<HTMLElement>(isOpen, onClose);
  const { language, t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const total = rounds.reduce((roundTotal, round) => roundTotal + calculateRoundSubtotal(round), 0);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[110] flex justify-end bg-slate-950/45 backdrop-blur-md dark:bg-black/75"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.aside
            {...dialog}
            aria-labelledby="order-history-title"
            className="flex h-full w-full max-w-xl flex-col border-l border-white/60 bg-white/90 text-gray-900 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#111318]/95 dark:text-white"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-4 border-b border-gray-200/80 p-5 dark:border-white/10 sm:p-7">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff5708]/10 text-[#ff5708]">
                  <History size={21} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-white/45">
                    {t('history.kicker')}
                  </p>
                  <h2 id="order-history-title" className="truncate text-lg font-bold sm:text-xl">
                    {t('history.title', { table: localizeTableLabel(tableNumber, language) })}
                  </h2>
                </div>
              </div>
              <button
                
                type="button"
                onClick={onClose}
                aria-label={t('history.close')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white/70 text-gray-600 transition hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-7">
              {rounds.map((round, index) => {
                const subtotal = calculateRoundSubtotal(round);

                return (
                  <section
                    key={round.id}
                    aria-labelledby={`order-round-${round.id}`}
                    className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/75 shadow-sm dark:border-white/10 dark:bg-white/[0.035]"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5 dark:border-white/10 sm:px-5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ff5708]/10 font-mono-code text-xs font-bold text-[#c2410c] dark:text-[#ffb59c]">
                          {index + 1}
                        </span>
                        <div>
                          <h3 id={`order-round-${round.id}`} className="text-sm font-bold">
                            {t('history.round', { number: index + 1 })}
                          </h3>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500 dark:text-white/50">
                            <Clock3 size={12} aria-hidden="true" />
                            {round.time}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono-code text-xs font-bold text-gray-700 dark:text-white/80">
                        S/ {subtotal.toFixed(2)}
                      </span>
                    </div>

                    <ul className="divide-y divide-gray-100 dark:divide-white/[0.07]">
                      {round.items.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-snug">{item.name}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="text-[11px] text-gray-500 dark:text-white/45">
                                {item.quantity} × S/ {item.price.toFixed(2)}
                              </span>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyles[item.status]}`}>
                                {t(KITCHEN_STATUS_LABEL_KEYS[item.status])}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 pt-0.5 font-mono-code text-xs font-semibold">
                            S/ {(item.quantity * item.price).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>

            <footer className="border-t border-gray-200/80 bg-white/60 p-5 pb-safe dark:border-white/10 dark:bg-black/10 sm:px-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-white/45">
                    {t('history.totalAccumulated')}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                    {t(
                      rounds.length === 1 ? 'history.roundCountOne' : 'history.roundCountOther',
                      { count: rounds.length }
                    )}
                  </p>
                </div>
                <p className="font-mono-code text-2xl font-bold text-[#c2410c] dark:text-[#ff8a55]">
                  S/ {total.toFixed(2)}
                </p>
              </div>
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
