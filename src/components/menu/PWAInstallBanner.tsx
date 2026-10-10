'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Download, LoaderCircle, Share, Smartphone, SquarePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useDinerCartBarVisible } from '@/hooks/useDinerCartBar';

interface PWAInstallBannerProps {
  className?: string;
}

/**
 * GastroPulse OS · CD-26
 * Banner flotante de instalación PWA de la carta digital del comensal.
 *
 * Contenido según la plataforma (renderizado condicional limpio):
 *  · Android/Chrome y Chromium de escritorio → un único botón con el acento del local "Instalar"
 *    que dispara el diálogo nativo capturado por `usePWAInstall`. Nunca pasos
 *    manuales: CD-26 exige instalar con un clic.
 *  · iOS/Safari → guía de 2 pasos ("Compartir › Añadir a pantalla de inicio"),
 *    porque iOS no expone ninguna API de instalación programática.
 * Diseño: tarjeta de cristal (glassmorphism) con contorno del acento al 50 % y
 * elevación real. El contorno replica exactamente el del panel "Total (N platos)"
 * del carrito (`border-primary/50`) para que ambos flotantes inferiores se lean
 * como una misma familia. En tema claro es blanco translúcido con sombra doble
 * tintada; en tema oscuro sube un escalón de superficie (#0e0e10 del fondo →
 * #1c1d23, token `--color-surface-container`) y añade un halo cálido, para que se
 * lea como un aviso flotante y no como un fallo de renderizado. La "X" silencia
 * la invitación durante 7 días exactos.
 *
 * · Reposicionamiento intacto: si el panel "Total (N platos)" ocupa el carril
 *   inferior, el banner sube el alto del panel (4rem) más 8px de aire con una
 *   transición de 300 ms, y baja solo cuando el carrito se vacía. Nunca se
 *   superpone al pedido.
 * · z-index 30: por debajo del carrito (40) y de los modales (50), para que un
 *   pedido en curso siempre tenga prioridad visual.
 *
 * Geometría del carril inferior móvil, en `rem`:
 *   4.75rem → barra de navegación inferior de la carta (Carta/Buscar/…).
 *   4rem    → alto del panel del carrito: p-2.5 (0.625rem × 2) + botones de 44px.
 *   0.5rem  → aire que separa el banner del panel del carrito.
 * Total con carrito: 9.25rem. Las clases van escritas completas (no se componen
 * en tiempo de ejecución) porque Tailwind las lee del código fuente.
 */
const BOTTOM_BASE = 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]';
const BOTTOM_WITH_CART = 'bottom-[calc(9.25rem+env(safe-area-inset-bottom,0px))]';
/** En escritorio el panel del carrito va centrado abajo (bottom-3 = 12px + 68px). */
const BOTTOM_BASE_SM = 'sm:bottom-6';
const BOTTOM_WITH_CART_SM = 'sm:bottom-24';

/** Tiempo que permanece visible el aviso de "instalación no disponible". */
const UNAVAILABLE_HINT_MS = 5000;

/** Píldora de icono + texto para la guía de iOS. */
const GUIDE_CHIP =
  cn(
    'inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold',
    // Claro: mismo par superficie/contorno que los botones secundarios de la
    // carta (#f1f5f9 sobre #cbd5e1).
    'border-[#cbd5e1] bg-[#f1f5f9]',
    // Oscuro: la píldora debe ir un escalón POR ENCIMA del cristal de la tarjeta
    // (#1c1d23 → #24252e); con el #1c1d23 anterior se fundiría con el fondo.
    'dark:border-white/10 dark:bg-[#24252e]'
  );

/**
 * Vista iOS/Safari: guía descriptiva de 2 pasos, sin botón, porque iOS no expone
 * ninguna API de instalación (la única vía es el menú Compartir de Safari).
 */
function IosInstallGuide() {
  return (
    <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] leading-snug text-[#475569] dark:text-[#a1a1aa]">
      <span>Toca</span>
      <span className={GUIDE_CHIP}>
        <Share size={12} aria-hidden="true" className="text-primary" />
        Compartir
      </span>
      <span>y luego</span>
      <span className={GUIDE_CHIP}>
        <SquarePlus size={12} aria-hidden="true" className="text-primary" />
        Añadir a pantalla de inicio
      </span>
    </p>
  );
}

interface InstallButtonProps {
  /** `true` cuando el navegador ya emitió `beforeinstallprompt`. */
  canPrompt: boolean;
  /** `true` mientras el diálogo nativo de instalación está abierto. */
  isPrompting: boolean;
  /** Dispara el diálogo nativo de instalación. */
  onInstall: () => void;
}

/**
 * Vista Android/Chrome (y Chromium de escritorio): un único botón del acento que
 * abre el diálogo nativo de instalación. Ni una sola instrucción manual.
 */
function InstallButton({ canPrompt, isPrompting, onInstall }: InstallButtonProps) {
  return (
    <button
      type="button"
      onClick={onInstall}
      disabled={isPrompting}
      aria-busy={isPrompting}
      title={
        canPrompt
          ? 'Abre el instalador de tu navegador'
          : 'El instalador se habilita en cuanto el navegador lo ofrece'
      }
      className={cn(
        'mt-2.5 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4',
        'bg-primary text-[13px] font-bold text-on-primary',
        'shadow-[0_0_18px] shadow-primary/30 transition-transform active:scale-[0.97]',
        'disabled:cursor-wait disabled:opacity-70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
      )}
    >
      {isPrompting ? (
        <LoaderCircle size={16} aria-hidden="true" className="animate-spin" />
      ) : (
        <Download size={16} aria-hidden="true" />
      )}
      <span>{isPrompting ? 'Abriendo…' : 'Instalar'}</span>
    </button>
  );
}

export function PWAInstallBanner({ className }: PWAInstallBannerProps) {
  const { mode, platform, canPrompt, isPrompting, install, dismiss } = usePWAInstall();
  const isCartBarVisible = useDinerCartBarVisible();
  const titleId = useId();
  const descriptionId = useId();
  const hintId = useId();
  const [isUnavailable, setIsUnavailable] = useState(false);
  const hintTimer = useRef<number | null>(null);

  // El aviso se autolimpia; si el banner se desmonta antes, no debe quedar vivo.
  useEffect(
    () => () => {
      if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    },
    []
  );

  const handleInstall = useCallback(async (): Promise<void> => {
    const opened = await install();
    // El navegador tomó el control (o el comensal ya aceptó): nada más que decir.
    if (opened) return;
    setIsUnavailable(true);
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => {
      hintTimer.current = null;
      setIsUnavailable(false);
    }, UNAVAILABLE_HINT_MS);
  }, [install]);

  const handleDismiss = useCallback((): void => {
    dismiss();
  }, [dismiss]);

  // Sin nada que ofrecer (ya instalada, silenciada 7 días o navegador sin vía real
  // de instalación) no se monta nada en el DOM.
  if (mode === 'hidden') return null;

  const isIOS = platform === 'ios';
  const isMobile = isIOS || platform === 'android';
  const title = isMobile ? 'Instala la carta en tu móvil' : 'Instala la carta en tu equipo';
  const description = 'Acceso directo, pantalla completa y funciona sin conexión.';

  return (
    <aside
      aria-live="polite"
      aria-labelledby={titleId}
      aria-describedby={isUnavailable ? `${descriptionId} ${hintId}` : descriptionId}
      className={cn(
        'fixed z-30 animate-fadeIn',
        // Reposicionamiento fluido al esquivar el panel del carrito y al volver.
        'transition-all duration-300 ease-out motion-reduce:transition-none',
        // Móvil: posición base justo encima de la barra de navegación inferior;
        // con carrito, sube el alto del panel más un aire de 8px.
        isCartBarVisible ? BOTTOM_WITH_CART : BOTTOM_BASE,
        'left-3 right-3',
        // Escritorio: el carrito va centrado abajo, así que el banner pasa de
        // 1.5rem a 6rem para no pisarlo nunca.
        isCartBarVisible ? BOTTOM_WITH_CART_SM : BOTTOM_BASE_SM,
        'sm:left-6 sm:right-auto sm:w-[368px]',
        className
      )}
    >
      <div
        className={cn(
          // Base: cristal flotante. Ningún fondo es opaco: la translucidez es
          // lo que hace visible el backdrop-blur (un bg sólido anularía el
          // efecto cristal).
          'rounded-2xl border p-3 backdrop-blur-xl backdrop-saturate-150',
          // Contorno del acento al 50 %: el mismo trazo exacto del panel
          // "Total (N platos)" del carrito, para que ambos flotantes inferiores
          // se lean como una misma familia. Al asumir el borde el papel de
          // definir el canto, sobra el antiguo filo de luz (before:), que además
          // se duplicaría sobre el acento.
          'border-primary/50',
          // Tema claro: blanco translúcido con sombra doble tintada que lo
          // despega del fondo #f4f5f7.
          'bg-white/90 text-[#0f172a]',
          'shadow-[0_14px_34px_-10px_rgba(15,23,42,0.35),0_2px_6px_-2px_rgba(15,23,42,0.12)]',
          // Tema oscuro: la superficie sube un escalón por encima del fondo de
          // la app (#0e0e10 → #1c1d23) y la sombra combina profundidad negra +
          // halo del acento. El halo se declara DENTRO de la misma lista con
          // `color-mix(var(--primary-accent) 45%)` en vez de con `shadow-primary/45`:
          // `--tw-shadow-color` es único por elemento, así que tintaría también la
          // capa negra y el flotante perdería su profundidad. El contorno del
          // acento es común a ambos temas (igual que el del carrito), por eso no
          // lleva variante `dark:`.
          'dark:bg-[#1c1d23]/90 dark:text-[#e5e1e4]',
          'dark:shadow-[0_18px_45px_-12px_rgba(0,0,0,0.95),0_0_28px_-10px_color-mix(in_srgb,var(--primary-accent)_45%,transparent)]'
        )}
      >
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary bg-gradient-to-br from-white/20 to-transparent text-on-primary shadow-[0_0_16px] shadow-primary/35"
          >
            {isIOS ? <Smartphone size={18} /> : <Download size={18} />}
          </span>

          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[13px] font-bold leading-snug">
              {title}
            </h2>
            <p
              id={descriptionId}
              className="mt-0.5 text-[11.5px] leading-snug text-[#475569] dark:text-[#a1a1aa]"
            >
              {description}
            </p>

            {/* CD-26: iOS → guía de 2 pasos · Android/Chrome → botón nativo. */}
            {isIOS ? (
              <IosInstallGuide />
            ) : (
              <InstallButton
                canPrompt={canPrompt}
                isPrompting={isPrompting}
                onInstall={() => {
                  void handleInstall();
                }}
              />
            )}

            {/* Solo si el navegador aún no ofrece su diálogo: estado, no instrucciones. */}
            {isUnavailable ? (
              <p
                id={hintId}
                className="mt-1.5 text-[11px] leading-snug text-[#b45309] dark:text-[#fbbf24]"
              >
                Tu navegador no ofrece la instalación en este momento.
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar la sugerencia de instalación y no volver a mostrarla en 7 días"
            title="No volver a mostrar en 7 días"
            className={cn(
              'flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center',
              'rounded-full text-[#64748b] transition-all duration-200',
              'hover:bg-[#f1f5f9] hover:text-[#0f172a] active:scale-90',
              // En oscuro el velo anterior (#24252e ≈ 11 % de blanco) ya no se
              // distinguía sobre el cristal más claro: velo blanco puro al 10 %.
              'dark:text-[#a1a1aa] dark:hover:bg-white/10 dark:hover:text-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
            )}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default PWAInstallBanner;
