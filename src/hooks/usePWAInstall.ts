'use client';

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';

/**
 * GastroPulse OS · CD-26 · Instalación PWA de la carta digital del comensal
 *
 * Aísla TODA la lógica de la invitación a instalar la app:
 *  · Detección de entorno (iOS/Safari · Android/Chromium · escritorio).
 *  · Captura del evento nativo `beforeinstallprompt` (Android/Chrome).
 *  · Persistencia del descarte durante 7 días exactos en `localStorage`.
 *
 * Decisiones de arquitectura:
 *  1. `beforeinstallprompt` puede dispararse ANTES de que React hidrate la
 *     vista, así que la captura vive en un store singleton que se engancha en
 *     cuanto el navegador evalúa este chunk, y no en un `useEffect` que llegaría
 *     tarde y perdería el evento para siempre.
 *  2. El store se guarda en `window`, no en variables del módulo. El App Router
 *     sirve la carta en dos rutas (`/` y `/menu`) y cada una puede evaluar su
 *     propia copia de este chunk: con el estado en `window`, la segunda copia
 *     reutiliza el store ya arrancado en vez de nacer vacía y perder el evento
 *     capturado. Esa era la causa de que la invitación desapareciera sola al
 *     navegar o al recargar la vista.
 *  3. El estado se expone con `useSyncExternalStore`: React usa el snapshot del
 *     servidor durante SSR/hidratación y el del cliente después. Resultado:
 *     ninguna lectura de `window`/`localStorage` en el render, ningún
 *     `useEffect` + `setState`, ningún parpadeo (FOUC) y ningún error de
 *     hidratación, por construcción.
 *  4. El banner NUNCA se auto-oculta por navegación ni por tiempo: solo la "X"
 *     lo silencia, y lo hace durante 7 días exactos. El contenido lo decide la
 *     plataforma, tal y como exige el ticket CD-26:
 *       · Android/Chrome (y Chromium de escritorio) → un único botón que dispara
 *         el diálogo nativo de `beforeinstallprompt`. Nunca pasos manuales.
 *       · iOS/Safari → guía de 2 pasos ("Compartir › Añadir a pantalla de
 *         inicio"), porque iOS no expone ninguna API de instalación.
 */

/* ════════════════════════════════════════════════════════════════════════
   1 · Tipos públicos
   ════════════════════════════════════════════════════════════════════════ */

/** Plataforma detectada. Se expone para adaptar copy/telemetría. */
export type PWAInstallPlatform = 'ios' | 'android' | 'desktop' | 'unknown';

/**
 * Renderizado condicional del banner:
 *  · `native`    → Android/Chrome y Chromium de escritorio: botón que dispara el
 *                  diálogo nativo de instalación (`beforeinstallprompt`).
 *  · `ios-guide` → Safari en iOS/iPadOS: sin evento nativo, guía de 2 pasos
 *                  ("Compartir › Añadir a pantalla de inicio").
 *  · `hidden`    → nada que ofrecer: ya instalada, silenciada 7 días o navegador
 *                  sin ninguna vía real de instalación.
 */
export type PWAInstallMode = 'hidden' | 'native' | 'ios-guide';

/** Contrato que consume `PWAInstallBanner`. */
export interface PWAInstallController {
  /** Estado de presentación resuelto por el hook. */
  mode: PWAInstallMode;
  /** Plataforma detectada en el dispositivo del comensal. */
  platform: PWAInstallPlatform;
  /**
   * `true` si el navegador ya emitió `beforeinstallprompt`, es decir, si el
   * botón "Instalar" puede abrir el diálogo nativo en este preciso momento.
   */
  canPrompt: boolean;
  /** `true` mientras el diálogo nativo de instalación está abierto. */
  isPrompting: boolean;
  /**
   * Abre el diálogo nativo de instalación.
   * @returns `true` si el navegador llegó a mostrar su diálogo; `false` si aún
   *          no lo ofrece (el banner lo comunica sin inventar pasos manuales).
   */
  install: () => Promise<boolean>;
  /** Oculta el banner y lo silencia 7 días. */
  dismiss: () => void;
}

/**
 * `beforeinstallprompt` no forma parte de `lib.dom.d.ts`, así que se declara
 * aquí de forma explícita: cero `any`, cero `unknown` casteado.
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{
    readonly outcome: 'accepted' | 'dismissed';
    readonly platform: string;
  }>;
  prompt: () => Promise<void>;
}

/* ════════════════════════════════════════════════════════════════════════
   2 · Constantes de negocio
   ════════════════════════════════════════════════════════════════════════ */

/** Clave de `localStorage`: instante (epoch ms) hasta el que se silencia. */
export const PWA_INSTALL_DISMISS_KEY = 'gastropulse_pwa_install_dismissed_until';
/** Silencio exacto de 7 días solicitado por el ticket CD-26. */
export const PWA_INSTALL_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
/** Cortesía: retrasa la aparición para no competir con el primer render. */
export const PWA_INSTALL_REVEAL_DELAY_MS = 1500;

const IOS_DEVICE_RE = /iPad|iPhone|iPod/;

/**
 * iOS donde la guía de 2 pasos NO sirve: navegadores de terceros (Chrome,
 * Firefox, Edge, Opera…) y navegadores embebidos (Instagram, WhatsApp,
 * Facebook, TikTok…). En ellos no existe "Añadir a pantalla de inicio", así que
 * mostrar la guía sería engañoso y ensuciaría la experiencia del comensal.
 */
const IOS_GUIDE_EXCLUSION_RE =
  /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA\/|FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|WhatsApp|Snapchat|MicroMessenger|TikTok|Pinterest/i;

const ANDROID_RE = /Android/i;
const SAFARI_RE = /Safari/;
/** Familia Chromium: los únicos navegadores de escritorio con "Instalar aplicación". */
const CHROMIUM_RE = /Chrome|Chromium|CriOS|Edg|EdgA|OPR|Brave|SamsungBrowser/i;

/* ════════════════════════════════════════════════════════════════════════
   3 · Detección de entorno (únicamente en cliente)
   ════════════════════════════════════════════════════════════════════════ */

/** iPadOS 13+ se identifica como macOS, pero con pantalla táctil. */
function detectPlatform(): PWAInstallPlatform {
  const { userAgent, platform, maxTouchPoints } = window.navigator;
  if (IOS_DEVICE_RE.test(userAgent)) return 'ios';
  if (platform === 'MacIntel' && maxTouchPoints > 1) return 'ios';
  if (ANDROID_RE.test(userAgent)) return 'android';
  return 'desktop';
}

/** Safari real en iOS: el único navegador de iOS con "Añadir a pantalla de inicio". */
function isIosSafariInstallSupported(): boolean {
  const { userAgent } = window.navigator;
  const isIos = IOS_DEVICE_RE.test(userAgent) || detectPlatform() === 'ios';
  return isIos && SAFARI_RE.test(userAgent) && !IOS_GUIDE_EXCLUSION_RE.test(userAgent);
}

/**
 * ¿Puede el comensal instalar la carta en este navegador?
 *  · iOS        → solo Safari real: los navegadores de terceros y los embebidos
 *                 de iOS no ofrecen "Añadir a pantalla de inicio".
 *  · Android    → cualquier navegador: todos exponen "Instalar aplicación" y los
 *                 basados en Chromium emiten `beforeinstallprompt`.
 *  · Escritorio → solo la familia Chromium (Chrome, Edge, Opera, Brave...).
 * Si es `false` no hay nada honesto que mostrar: el banner no se pinta.
 */
function resolveInstallSupported(platform: PWAInstallPlatform): boolean {
  if (platform === 'ios') return isIosSafariInstallSupported();
  if (platform === 'android') return true;
  return platform === 'desktop' && CHROMIUM_RE.test(window.navigator.userAgent);
}

/** `true` si la carta ya se está ejecutando como aplicación instalada. */
function isStandaloneDisplay(): boolean {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (iosStandalone) return true;
  if (typeof window.matchMedia !== 'function') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

/** ¿Sigue vigente el silencio de 7 días? Caduca y se autolimpia si expiró. */
function readDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY);
    if (!raw) return false;
    const until = Number.parseInt(raw, 10);
    if (!Number.isFinite(until) || until <= Date.now()) {
      window.localStorage.removeItem(PWA_INSTALL_DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    // localStorage bloqueado (modo privado / permisos): no se silencia nada.
    return false;
  }
}

/** Sella el descarte: `ahora + 7 días`. */
function persistDismissal(): void {
  try {
    window.localStorage.setItem(
      PWA_INSTALL_DISMISS_KEY,
      String(Date.now() + PWA_INSTALL_DISMISS_MS)
    );
  } catch {
    /* Sin persistencia disponible: el banner se oculta solo en memoria. */
  }
}


/* ════════════════════════════════════════════════════════════════════════
   4 · Store singleton (captura temprana + uso con useSyncExternalStore)
   ════════════════════════════════════════════════════════════════════════ */

interface PWAInstallSnapshot {
  readonly canPrompt: boolean;
  readonly isInstalled: boolean;
  readonly platform: PWAInstallPlatform;
  /** El navegador ofrece alguna vía real de instalación (botón o guía de iOS). */
  readonly installSupported: boolean;
  readonly dismissed: boolean;
  readonly revealed: boolean;
}

/**
 * Snapshot de servidor: hidratación determinista. React lo usa en SSR y en el
 * primer render del cliente, así que el HTML coincide siempre por definición.
 */
const SERVER_SNAPSHOT: PWAInstallSnapshot = Object.freeze({
  canPrompt: false,
  isInstalled: false,
  platform: 'unknown',
  installSupported: false,
  dismissed: true,
  revealed: false
});

interface PWAInstallStore {
  snapshot: PWAInstallSnapshot;
  /** El evento nativo es de un solo uso: se guarda y se consume al invocarlo. */
  deferredPrompt: BeforeInstallPromptEvent | null;
  listeners: Set<() => void>;
  booted: boolean;
}

type PWAInstallWindow = Window & { __gastropulsePWAInstall?: PWAInstallStore };

/** Un único store por documento, aunque el chunk se evalúe varias veces. */
function getStore(): PWAInstallStore | null {
  if (typeof window === 'undefined') return null;
  const host = window as PWAInstallWindow;
  if (!host.__gastropulsePWAInstall) {
    host.__gastropulsePWAInstall = {
      snapshot: SERVER_SNAPSHOT,
      deferredPrompt: null,
      listeners: new Set(),
      booted: false
    };
  }
  return host.__gastropulsePWAInstall;
}

/** Publica un cambio solo si algún valor cambió de verdad (evita re-renders). */
function commit(store: PWAInstallStore, patch: Partial<PWAInstallSnapshot>): void {
  const next: PWAInstallSnapshot = { ...store.snapshot, ...patch };
  const unchanged = (Object.keys(next) as (keyof PWAInstallSnapshot)[]).every(
    (key) => store.snapshot[key] === next[key]
  );
  if (unchanged) return;
  store.snapshot = Object.freeze(next);
  for (const listener of store.listeners) listener();
}

function handleBeforeInstallPrompt(store: PWAInstallStore, event: Event): void {
  // Se suprime el mini-infobar nativo: el momento lo decide nuestro banner.
  event.preventDefault();
  store.deferredPrompt = event as BeforeInstallPromptEvent;
  commit(store, { canPrompt: true });
}

function handleAppInstalled(store: PWAInstallStore): void {
  store.deferredPrompt = null;
  commit(store, { canPrompt: false, isInstalled: true });
}

/** Engancha el estado y los listeners del navegador una sola vez por documento. */
function bootStore(store: PWAInstallStore): void {
  if (store.booted || typeof window === 'undefined') return;
  store.booted = true;

  const platform = detectPlatform();
  store.snapshot = Object.freeze({
    canPrompt: false,
    isInstalled: isStandaloneDisplay(),
    platform,
    installSupported: resolveInstallSupported(platform),
    dismissed: readDismissed(),
    revealed: false
  });

  window.addEventListener('beforeinstallprompt', (event) => handleBeforeInstallPrompt(store, event));
  window.addEventListener('appinstalled', () => handleAppInstalled(store));

  // Aparición con cortesía: deja respirar el primer render de la carta.
  window.setTimeout(() => commit(store, { revealed: true }), PWA_INSTALL_REVEAL_DELAY_MS);
}

function subscribePWAInstall(listener: () => void): () => void {
  const store = getStore();
  if (!store) return () => {};
  bootStore(store);
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

function getPWAInstallSnapshot(): PWAInstallSnapshot {
  const store = getStore();
  if (!store) return SERVER_SNAPSHOT;
  bootStore(store);
  return store.snapshot;
}

/** React exige una referencia estable en servidor: siempre el mismo objeto. */
function getPWAInstallServerSnapshot(): PWAInstallSnapshot {
  return SERVER_SNAPSHOT;
}

/**
 * Renderizado condicional exigido por CD-26. Ni la navegación ni el tiempo
 * ocultan el banner: solo `isInstalled` (ya instalada), `dismissed` (la "X"
 * pulsada en los últimos 7 días) o un navegador sin vía real de instalación.
 */
function resolveMode(state: PWAInstallSnapshot): PWAInstallMode {
  if (!state.revealed || state.isInstalled || state.dismissed) return 'hidden';
  if (!state.installSupported) return 'hidden';
  // iOS/Safari no tiene evento nativo de instalación → guía de 2 pasos.
  // Android/Chrome y Chromium de escritorio → botón que dispara el prompt nativo.
  return state.platform === 'ios' ? 'ios-guide' : 'native';
}

/**
 * Dispara el diálogo nativo de instalación (`beforeinstallprompt.prompt()`).
 * @returns `true` si el navegador llegó a abrir su diálogo.
 */
async function runInstallPrompt(): Promise<boolean> {
  const store = getStore();
  const promptEvent = store?.deferredPrompt;
  // Android: si Chrome todavía no emitió el evento (o el comensal ya lo consumió)
  // no se muestra ninguna instrucción manual; el banner lo comunica al comensal.
  if (!store || !promptEvent) return false;
  store.deferredPrompt = null; // Un evento admite una sola invocación de prompt().
  commit(store, { canPrompt: false });
  try {
    await promptEvent.prompt();
    return true;
  } catch {
    // Algunos navegadores rechazan prompt() si no hay gesto de usuario activo.
    return false;
  }
}

function runDismiss(): void {
  persistDismissal();
  const store = getStore();
  if (!store) return;
  commit(store, { dismissed: true });
}

/* Captura temprana: se engancha en cuanto el navegador evalúa este chunk, antes
   de que el comensal hidrate la carta (por eso no vive en un `useEffect`). */
const initialStore = getStore();
if (initialStore) bootStore(initialStore);


/* ════════════════════════════════════════════════════════════════════════
   5 · Hook de consumo
   ════════════════════════════════════════════════════════════════════════ */

/**
 * Estado de la instalación PWA listo para pintar. No lanza efectos ni lee APIs
 * del navegador durante el render: todo llega resuelto desde el store.
 */
export function usePWAInstall(): PWAInstallController {
  const state = useSyncExternalStore(
    subscribePWAInstall,
    getPWAInstallSnapshot,
    getPWAInstallServerSnapshot
  );
  const [isPrompting, setIsPrompting] = useState(false);
  const promptingRef = useRef(false);

  const install = useCallback(async (): Promise<boolean> => {
    if (promptingRef.current) return false; // Blindaje ante dobles pulsaciones.
    promptingRef.current = true;
    setIsPrompting(true);
    try {
      return await runInstallPrompt();
    } finally {
      promptingRef.current = false;
      setIsPrompting(false);
    }
  }, []);

  const dismiss = useCallback((): void => {
    runDismiss();
  }, []);

  const mode = resolveMode(state);

  return useMemo<PWAInstallController>(
    () => ({
      mode,
      platform: state.platform,
      canPrompt: state.canPrompt,
      isPrompting,
      install,
      dismiss
    }),
    [mode, state.platform, state.canPrompt, isPrompting, install, dismiss]
  );
}

