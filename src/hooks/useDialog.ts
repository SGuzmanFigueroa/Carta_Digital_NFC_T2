'use client';

import { useEffect, useRef } from 'react';

/**
 * Accesibilidad común de los modales (Tarea 40):
 *  - role="dialog" + aria-modal para lectores de pantalla.
 *  - Al abrir, el foco entra al modal; al cerrar, vuelve a donde estaba.
 *  - Tab / Shift+Tab no se escapan del modal (trampa de foco).
 *  - Esc cierra. Con modales apilados solo responde el de arriba.
 *
 * Uso: `const dialog = useDialog(isOpen, onClose);` y en el panel del modal
 * `<div {...dialog} aria-labelledby="…">`. Sin `onClose`, Esc no hace nada
 * (para pasos que no se deben poder saltar).
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/** Modales abiertos, el último es el de arriba. */
const openDialogs: HTMLElement[] = [];

function focusableIn(node: HTMLElement): HTMLElement[] {
  return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0 && !el.closest('[inert]')
  );
}

export function useDialog<T extends HTMLElement = HTMLDivElement>(open: boolean, onClose?: () => void) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openDialogs.push(node);

    if (!node.contains(document.activeElement)) {
      // El primer control suele ser el botón de cerrar: seguro para el lector de pantalla.
      (focusableIn(node)[0] ?? node).focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== node) return;

      if (event.key === 'Escape') {
        if (!onCloseRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusableIn(node);
      if (items.length === 0) {
        event.preventDefault();
        node.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const outside = !node.contains(active);
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const index = openDialogs.indexOf(node);
      if (index !== -1) openDialogs.splice(index, 1);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);

  return { ref, role: 'dialog' as const, 'aria-modal': true as const, tabIndex: -1 };
}
