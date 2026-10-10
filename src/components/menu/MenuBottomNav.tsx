'use client';

import React from 'react';
import { BookOpen, ConciergeBell, QrCode, Search, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuBottomNavProps {
  cartItemsCount: number;
  waiterCalled: boolean;
  onGoToMenu: () => void;
  onFocusSearch: () => void;
  onOpenCart: () => void;
  onCallWaiter: () => void;
  onOpenPayment?: () => void;
  className?: string;
}

/**
 * GastroPulse OS · CD-10 & CD-13
 * Barra de navegación inferior de la carta digital del comensal (solo móvil).
 * Incluye accesos táctiles de 44x44 px: Carta, Buscar, Pedido, Pagar QR y Garzón.
 */
export function MenuBottomNav({
  cartItemsCount,
  waiterCalled,
  onGoToMenu,
  onFocusSearch,
  onOpenCart,
  onCallWaiter,
  onOpenPayment,
  className
}: MenuBottomNavProps) {
  const itemBaseClass = cn(
    'flex flex-col items-center justify-center gap-0.5',
    'min-h-[44px] min-w-[44px] rounded-xl px-1.5 py-1.5',
    'text-[10px] font-semibold leading-none tracking-tight',
    'transition-colors active:scale-95 cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
  );

  const idleClass =
    'text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0f172a] dark:text-[#a1a1aa] dark:hover:bg-[#24252e] dark:hover:text-white';

  return (
    <nav
      aria-label="Navegación de la carta digital"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 sm:hidden',
        'border-t border-[#e2e8f0] bg-white/95 backdrop-blur-xl',
        'dark:border-[#24252e] dark:bg-[#0e0e10]/95',
        className
      )}
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-stretch justify-items-center px-1 pt-1.5 pb-safe">
        <button type="button" onClick={onGoToMenu} className={cn(itemBaseClass, idleClass)}>
          <BookOpen aria-hidden="true" size={19} />
          <span>Carta</span>
        </button>

        <button type="button" onClick={onFocusSearch} className={cn(itemBaseClass, idleClass)}>
          <Search aria-hidden="true" size={19} />
          <span>Buscar</span>
        </button>

        <button
          type="button"
          onClick={onOpenCart}
          aria-label={`Ver pedido, ${cartItemsCount} ${cartItemsCount === 1 ? 'plato' : 'platos'}`}
          className={cn(
            itemBaseClass,
            cartItemsCount > 0
              ? 'text-primary hover:bg-primary/10 dark:text-primary dark:hover:bg-[#24252e]'
              : idleClass
          )}
        >
          <span className="relative">
            <ShoppingBag aria-hidden="true" size={19} />
            {cartItemsCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-on-primary">
                {cartItemsCount}
              </span>
            )}
          </span>
          <span>Pedido</span>
        </button>

        {/* CD-10 · Acceso rápido a Pasarela de Pago Digital QR */}
        <button
          type="button"
          onClick={onOpenPayment}
          className={cn(itemBaseClass, idleClass, 'text-primary')}
          title="Pedir la cuenta y pagar con Yape o Plin QR"
        >
          <QrCode aria-hidden="true" size={19} />
          <span>Pagar QR</span>
        </button>

        <button
          type="button"
          onClick={onCallWaiter}
          disabled={waiterCalled}
          aria-live="polite"
          className={cn(
            itemBaseClass,
            waiterCalled
              ? 'text-primary'
              : idleClass
          )}
        >
          <ConciergeBell aria-hidden="true" size={19} />
          <span>{waiterCalled ? 'Llamando' : 'Garzón'}</span>
        </button>
      </div>
    </nav>
  );
}

export default MenuBottomNav;
