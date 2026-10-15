import React, { useState, useEffect, useRef } from 'react';
import { MenuItem, OrderRound, OrderTicket, TableStatus, WaiterCallReason } from '../types';
import { kitchenAudio } from '../utils/audio';
// CD-27 · Confirmación táctil (vibración de 15 ms) del gesto "agregar al carrito".
import { hapticAddToCart } from '../utils/haptics';
//import { ThreeDView } from './ThreeDView';
import dynamic from 'next/dynamic';

// Importación dinámica: Obliga a Next.js a no incluir Three.js en la carga inicial.
// Como tu componente usa "export const ThreeDView" (exportación nombrada), usamos .then()
const ThreeDView = dynamic(
  () => import('./ThreeDView').then((mod) => mod.ThreeDView),
  {
    ssr: false, // Fundamental: Three.js necesita el objeto 'window', no puede renderizarse en el servidor
    // CD-31 · El fallback es un componente propio para que su copy respete el idioma.
    loading: () => <ThreeDLoading />
  }
);

import { ARTableViewer } from './ARTableViewer';
import { DishARViewer } from './DishARViewer';
import { WebXRDishLauncher } from './WebXRDishLauncher';
// CD-13 · Componentes del tema Claro/Oscuro y navegación inferior del comensal.
import { ThemeToggle } from './menu/ThemeToggle';
// CD-31 · Selector de idioma [ES | EN] de la carta del comensal.
import { LanguageToggle } from './menu/LanguageToggle';
import { useLanguage } from '@/hooks/useLanguage';
import { MenuBottomNav } from './menu/MenuBottomNav';
// CD-27 · Microinteracciones del carrito: globo con rebote y total que "cuenta".
import { CartBadge } from './menu/CartBadge';
import { AnimatedSoles } from './menu/AnimatedSoles';
// CD-26 · Puente con el banner de instalación de la PWA: le informa cuándo el
// panel "Total" del carrito ocupa el carril inferior para que flote por encima.
import { setDinerCartBarVisible } from '@/hooks/useDinerCartBar';
import { PaymentModal } from './menu/PaymentModal';
import { SplitBillModal } from './menu/SplitBillModal';
import { ComplaintBookModal } from './menu/ComplaintBookModal';
import { DishDetailModal } from './menu/DishDetailModal';
import { PairingSuggestion } from './menu/PairingSuggestion';
import { resolvePairingItem } from '@/features/menu/pairing';
// CD-16 · Pop-up promocional "Oferta Flash" con platos reales del menú.
import { PromoDealModal } from './menu/PromoDealModal';
// CD-16 · Tira "Oferta Flash" de portada: rota sola entre las ofertas activas.
import { PromoFlashTicker } from './menu/PromoFlashTicker';
import { OrderHistoryModal } from './menu/OrderHistoryModal';
import { validateDinerGeofence, type GeofenceValidationResult } from '@/utils/geofence';
import {
  buildMenuSearchText,
  getMenuCategoryLabel,
  getMenuCategoryTabs,
  localizeMenuItem,
  localizeMenuItemName,
  localizePromoOffer,
  type LocalizedMenuItem
} from '@/i18n/menuContent';
import type { TranslationKey, TranslationParams } from '@/i18n/translations';
// CD-31 · Rótulo de mesa visible (ES/EN) sin alterar el identificador que usa cocina.
import { localizeTableLabel } from '@/i18n/tableLabel';
import { GeofenceWarningModal } from './menu/GeofenceWarningModal';
// CD-28 · Bottom Sheet de asistencia en mesa (motivos exactos del ticket).
import { WaiterCallModal } from './menu/WaiterCallModal';
import { formatSoles } from '@/utils/promo';
import { INITIAL_ACTIVE_PROMO_OFFERS } from '@/data/mockData';
import { DietaryFilters, DIETARY_FILTERS, getDietaryPreferences } from './menu/DietaryFilters';
import type { DietaryPreference } from '../types';
import { getArDishDimensionCm } from '@/config/arDishProfiles';

/**
 * CD-31 · Fallback del visor 3D: componente propio (y no un literal dentro de
 * `dynamic()`) porque necesita el hook de idioma para traducir su copy.
 */
function ThreeDLoading() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center w-full h-64 bg-[#131418] rounded-xl border border-[#24252e]">
      <div className="flex flex-col items-center gap-2">
        <span className="w-6 h-6 border-2 border-[#ff5708] border-t-transparent rounded-full animate-spin"></span>
        <span className="text-[#ff5708] font-mono-code text-[11px] animate-pulse">{t('dish.loading3d')}</span>
      </div>
    </div>
  );
}

/**
 * CD-31 · Mensaje del aviso GPS antifraude en el idioma de la carta.
 * `validateDinerGeofence` redacta en español (su texto lo comparte el panel de staff),
 * así que la carta reconstruye el mensaje desde el MOTIVO real de la validación y
 * solo cae al texto original si aparece un motivo desconocido.
 */
function localizeGeofenceMessage(
  result: GeofenceValidationResult,
  t: (key: TranslationKey, params?: TranslationParams) => string
): string {
  switch (result.reason) {
    case 'valid_inside_radius':
      return t('geofence.verified', { distance: result.distanceMeters });
    case 'outside_radius':
      return t('geofence.outside', {
        distance: result.distanceMeters,
        limit: result.maxAllowedMeters
      });
    case 'geofence_disabled':
      return t('geofence.disabled');
    case 'sandbox_dev_bypass':
      return t('geofence.sandbox');
    case 'unsupported_device':
      return t('geofence.unsupported');
    case 'permission_denied':
      return t('geofence.permissionDenied');
    case 'timeout':
      return t('geofence.timeout');
    default:
      return result.message;
  }
}

// =============================================================================
//  CD-16 · CONFIGURACIÓN DE LA OFERTA FLASH (POP-UP PROMOCIONAL DEL COMENSAL)
// =============================================================================
/** Porcentaje de descuento aplicado a los platos promocionados. */
const PROMO_DEAL_DISCOUNT = 15;
/** Duración de la cuenta regresiva del pop-up (755s = "¡TERMINA EN 12:35!"). */
const PROMO_DEAL_DURATION_SECONDS = 755;
/** Platos reales del menú que se rotan en el pop-up (con respaldo automático). */
const PROMO_DEAL_IDS = ['wagyu-a5', 'pulpo-brasa', 'esfera-chocolate'];
/**
 * ⏱️ Autoplay de la tira "Oferta Flash" de portada: cada cuánto rota de plato.
 * 2000ms = ritmo "2s" (dentro del rango 1.8-2s pedido para el banner): pasa de
 * oferta en oferta como un carrusel llamativo sin cortes secos. Se pausa al
 * pasar el mouse / apoyar el dedo (ver `PromoFlashTicker`).
 */
const PROMO_TICKER_ROTATION_MS = 2000;
/**
 * Beat mínimo (ms) entre el primer frame ya pintado de la carta y la aparición
 * del pop-up. Bajarlo de ~300ms hace que la oferta tape el primer pintado (LCP);
 * subirlo retrasa el impacto comercial. 350ms = sensación instantánea sin brinco.
 */
const PROMO_DEAL_OPEN_DELAY_MS = 350;
/**
 * Apertura garantizada (ms) aunque el navegador estrangule requestAnimationFrame
 * (pestaña en segundo plano, equipo muy lento): la oferta nunca se pierde.
 */
const PROMO_DEAL_OPEN_TIMEOUT_MS = 1200;
/** Bandera de sesión: evita repetir el auto-apertura en cada recarga del comensal. */
const PROMO_DEAL_SEEN_KEY = 'gastropulse_promo_seen';
/**
 * ⚠️ SOLO DESARROLLO: cuando es `true`, el pop-up ignora la bandera de sesión y
 * se vuelve a abrir en cada carga de la carta. Es lo que permite re-testear el
 * modal en el celular / emulación móvil de DevTools sin limpiar sessionStorage
 * a mano. En producción (`false`) se conserva el comportamiento de siempre
 * ("una vez por sesión").
 */
const IS_DEV = process.env.NODE_ENV !== 'production';
const DEFAULT_AR_SCALE = 1;
const NATIVE_AR_RETURN_KEY = 'gastropulse_native_ar_return';

const canLaunchAndroidSceneViewer = () => {
  if (typeof window === 'undefined') return false;
  return /android/i.test(window.navigator.userAgent);
};

const getModelId = (dish: MenuItem) => dish.id;

const buildAndroidSceneViewerIntent = (dish: MenuItem, modelId: string) => {
  const modelUrl = new URL(`/models-ar/${modelId}.glb`, window.location.origin).href;
  const fallbackUrl = new URL(window.location.href);
  fallbackUrl.searchParams.set('arFallback', modelId);
  fallbackUrl.searchParams.set('arName', dish.name);

  const title = `${dish.name} · ${getArDishDimensionCm(modelId)} cm · mueve lento`;
  return `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}&mode=ar_preferred&title=${encodeURIComponent(title)}&resizable=false#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallbackUrl.href)};end;`;
};

const normalizeStr = (str: string) =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const normalizeTable = (table: string) => normalizeStr(table).replace(/\s+/g, '-');




type MenuCartItem = { item: MenuItem; quantity: number; notes?: string };

interface QRMenuViewerProps {
  menuItems: MenuItem[];
  onAddNewOrder: (newTicket: OrderTicket) => void;
  onShowToast: (msg: string, icon?: string) => void;
  activeTicket?: OrderTicket | null;
  orderHistory?: OrderTicket[];
  tableOrderRounds?: OrderRound[];
  tables?: TableStatus[];
  onSendOrderFromMenu?: (
    table: string,
    items: Array<{ item: MenuItem; quantity: number; notes?: string }>,
    pax?: number
  ) => OrderTicket;
  onRecordTableOrderRound?: (
    table: string,
    items: Array<{ item: MenuItem; quantity: number }>,
    createdAt: Date,
    orderId: string
  ) => void;
  onCallWaiter?: (reason?: string, table?: string) => Promise<boolean> | void;
  onRequestTableAccount?: (paymentMethod: string, table?: string) => Promise<boolean> | void;
  onDishCreated?: (dish: MenuItem) => void;
  onRefreshDishes?: () => void;
}

export const QRMenuViewer: React.FC<QRMenuViewerProps> = ({
  menuItems,
  onAddNewOrder,
  onShowToast,
  activeTicket,
  orderHistory = [],
  tableOrderRounds = [],
  tables,
  onSendOrderFromMenu,
  onRecordTableOrderRound,
  onRequestTableAccount,
  onCallWaiter,
  onDishCreated,
  onRefreshDishes
}) => {
   const [selectedCategory, setSelectedCategory] = useState<string>('todos');
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedDietaryFilters, setSelectedDietaryFilters] = useState<DietaryPreference[]>([]);
   const [heroViewMode, setHeroViewMode] = useState<'photo' | '3d'>('photo');
   const [isCartOpen, setIsCartOpen] = useState(false);
   const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
   const [selectedTable, setSelectedTable] = useState('MESA 04');
   const [cartsByTable, setCartsByTable] = useState<Record<string, MenuCartItem[]>>({});
   const [isSplitBillModalOpen, setIsSplitBillModalOpen] = useState(false);

   const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
   const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
   const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
   const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
   /** Oferta con la que debe abrir el pop-up (la que se veía en la tira flash). */
  const [promoInitialDealId, setPromoInitialDealId] = useState<string | null>(null);
  const [selectedDishDetails, setSelectedDishDetails] = useState<MenuItem | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Efectivo' | 'Tarjeta POS (Visa/MC)' | 'Yape / Plin'>('Tarjeta POS (Visa/MC)');
  const [waiterCalled, setWaiterCalled] = useState(false);
  // CD-28 · Controla el Bottom Sheet de motivos de asistencia en mesa.
  const [isWaiterCallModalOpen, setIsWaiterCallModalOpen] = useState(false);
  const observedOrderStatus = useRef<{ id: string; status: OrderTicket['status'] } | null>(null);
  /** CD-31 · Idioma de la carta (ES/EN) con persistencia en localStorage. */
  const { language, t } = useLanguage();

  // Flechas de desplazamiento para la barra de categorías
  const catScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateCatArrows = () => {
    const el = catScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  const scrollCategories = (dir: 'left' | 'right') => {
    catScrollRef.current?.scrollBy({ left: dir === 'right' ? 160 : -160, behavior: 'smooth' });
  };

  useEffect(() => {
    updateCatArrows();
    window.addEventListener('resize', updateCatArrows);
    return () => window.removeEventListener('resize', updateCatArrows);
  }, []);
    
  // 3D Inspector Modal
  const [selectedDishForModal, setSelectedDishForModal] = useState<MenuItem | null>(null);

  // Real Camera AR Modal
  const [isArModalOpen, setIsArModalOpen] = useState(false);
  const [arCameraActive, setArCameraActive] = useState(false);
  const [arCameraMessage, setArCameraMessage] = useState<string | null>(null);
  const [arCameraHelp, setArCameraHelp] = useState<string | null>(null);
  const [isArCameraRequesting, setIsArCameraRequesting] = useState(false);
  const [arCameraAttempted, setArCameraAttempted] = useState(false);
  const [arScale, setArScale] = useState(DEFAULT_AR_SCALE);
  const [arTrackingStatus, setArTrackingStatus] = useState(() => t('ar.waiting'));
  const [isArDishAnchored, setIsArDishAnchored] = useState(false);
  const [isRealArAvailable, setIsRealArAvailable] = useState(false);
  const [arDish, setArDish] = useState<MenuItem>(menuItems[0]); // default to Chaufa or current

  // Re-order / Welcome Back feature for returning diners
  interface LastOrderRecord {
    date: number;
    table: string;
    items: { item: MenuItem; quantity: number; notes?: string }[];
    total: number;
  }
  const [lastOrder, setLastOrder] = useState<LastOrderRecord | null>(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  // ️ CD-19 · Estado de Validación de Geocerca GPS Antifraude
  const [geofenceModalState, setGeofenceModalState] = useState<{
    isOpen: boolean;
    distance: number;
    maxAllowed: number;
    message: string;
  }>({
    isOpen: false,
    distance: 0,
    maxAllowed: 150,
    message: '',
  });
  const [isVerifyingGeofence, setIsVerifyingGeofence] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gastropulse_last_order');
      if (saved) {
        const parsed: LastOrderRecord = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          setLastOrder(parsed);
          setShowWelcomeBack(true);
        }
      }
    } catch (e) {
      console.warn('Could not read last order from storage:', e);
    }
  }, []);

  const handleRepeatLastOrder = () => {
    if (!lastOrder || !lastOrder.items) return;
    setSelectedTable(lastOrder.table);
    setCartsByTable((previous) => ({
      ...previous,
      [normalizeTable(lastOrder.table)]: lastOrder.items
    }));
    setShowWelcomeBack(false);
    setIsCartOpen(true);
    onShowToast(t('toast.repeatLoaded'), 'receipt_long');
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pendingArStreamRef = useRef<MediaStream | null>(null);
  const arVideoFrameRef = useRef({ lastFrame: -1, lastTime: -1, stuckTicks: 0, reconnecting: false });
  const nativeArReturnHandledRef = useRef(false);

  const selectedTableKey = normalizeTable(selectedTable);
  const cart = cartsByTable[selectedTableKey] || [];
  const setCart: React.Dispatch<React.SetStateAction<MenuCartItem[]>> = (action) => {
    setCartsByTable((previous) => {
      const currentCart = previous[selectedTableKey] || [];
      const nextCart = typeof action === 'function' ? action(currentCart) : action;
      return { ...previous, [selectedTableKey]: nextCart };
    });
  };

  /**
   * CD-26 · Publica si el panel flotante del carrito ocupa el carril inferior.
   * El banner de instalación PWA lo lee para flotar justo encima del "Total" sin
   * taparlo ni quedar debajo. Se limpia al desmontar la carta para no dejar el
   * carril marcado como ocupado en otras vistas.
   */
  const isCartBarVisible = cart.length > 0;
  useEffect(() => {
    setDinerCartBarVisible(isCartBarVisible);
    return () => setDinerCartBarVisible(false);
  }, [isCartBarVisible]);

  // Sincronizar automáticamente la mesa desde el QR escaneado (?mesa=4, ?table=04, ?m=2)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const rawMesa = params.get('mesa') || params.get('table') || params.get('m');
      if (rawMesa && rawMesa.trim()) {
        let formatted = decodeURIComponent(rawMesa.trim()).toUpperCase();
        if (/^\d+$/.test(formatted)) {
          formatted = `MESA ${formatted.padStart(2, '0')}`;
        } else if (!formatted.startsWith('MESA') && !formatted.startsWith('BARRA')) {
          formatted = `MESA ${formatted}`;
        }
        setSelectedTable(formatted);
        try {
          sessionStorage.setItem('gastropulse_active_table', formatted);
          localStorage.setItem('gastropulse_active_table', formatted);
        } catch {}
        onShowToast(
          t('toast.tableLinked', { table: localizeTableLabel(formatted, language) }),
          'qr_code_scanner'
        );
      } else {
        try {
          const saved = sessionStorage.getItem('gastropulse_active_table') || localStorage.getItem('gastropulse_active_table');
          if (saved) setSelectedTable(saved);
        } catch {}
      }
    }
  }, []);
  const stopArCamera = React.useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (pendingArStreamRef.current) {
      pendingArStreamRef.current.getTracks().forEach((t) => t.stop());
      pendingArStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    arVideoFrameRef.current = { lastFrame: -1, lastTime: -1, stuckTicks: 0, reconnecting: false };
    setArCameraActive(false);
  }, []);

  const configureArVideoElement = React.useCallback((video: HTMLVideoElement, stream: MediaStream) => {
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
  }, []);

  const waitForArVideoFrame = React.useCallback((video: HTMLVideoElement, timeoutMs = 4200) => {
    if (!video.paused && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        video.removeEventListener('playing', onReady);
        video.removeEventListener('timeupdate', onReady);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('error', onError);
        window.clearTimeout(timeoutId);
      };
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };
      const onReady = () => finish(resolve);
      const onError = () => finish(() => reject(new DOMException('Camera video element failed', 'AbortError')));
      const timeoutId = window.setTimeout(
        () => finish(() => reject(new DOMException('Camera video did not render frames', 'AbortError'))),
        timeoutMs
      );

      video.addEventListener('playing', onReady, { once: true });
      video.addEventListener('timeupdate', onReady, { once: true });
      video.addEventListener('loadeddata', onReady, { once: true });
      video.addEventListener('error', onError, { once: true });
    });
  }, []);

  const playArVideoStream = React.useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return false;

    configureArVideoElement(video, stream);
    try {
      await video.play();
      await waitForArVideoFrame(video);
      arVideoFrameRef.current = { lastFrame: -1, lastTime: -1, stuckTicks: 0, reconnecting: false };
      return true;
    } catch (error) {
      console.warn('AR camera stream was granted but video playback did not start:', error);
      return false;
    }
  }, [configureArVideoElement, waitForArVideoFrame]);

  const requestArCameraStream = React.useCallback(async () => {
    if (typeof window === 'undefined') {
      throw new DOMException('Browser window is not available', 'NotFoundError');
    }

    const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    if (!window.isSecureContext && !isLocalhost) {
      throw new DOMException('Camera requires HTTPS', 'SecurityError');
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new DOMException('Camera API is not available', 'NotFoundError');
    }

    const requestWithTimeout = (constraints: MediaStreamConstraints, timeoutMs = 9000) => {
      let settled = false;
      let timeoutId = 0;
      const streamPromise = navigator.mediaDevices.getUserMedia(constraints);

      const timeoutPromise = new Promise<MediaStream>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          settled = true;
          reject(new DOMException('Camera permission request timed out', 'AbortError'));
        }, timeoutMs);
      });

      streamPromise
        .then((stream) => {
          if (settled) {
            stream.getTracks().forEach((track) => track.stop());
          }
        })
        .catch(() => undefined);

      return Promise.race([streamPromise, timeoutPromise]).finally(() => {
        settled = true;
        window.clearTimeout(timeoutId);
      });
    };

    const cameraAttempts: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      },
      {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      },
      {
        video: true,
        audio: false
      }
    ];

    let lastCameraError: unknown = null;

    for (const constraints of cameraAttempts) {
      try {
        return await requestWithTimeout(constraints);
      } catch (err) {
        lastCameraError = err;
        const errorName = err instanceof DOMException ? err.name : '';
        if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
          throw err;
        }
      }
    }

    throw lastCameraError ?? new DOMException('No camera stream available', 'NotFoundError');
  }, []);

  const showBlockedCameraMessage = React.useCallback(() => {
    setArCameraMessage(t('ar.blocked'));
    setArCameraHelp(t('ar.blockedHelp'));
    onShowToast(t('toast.cameraNotActivated'), 'info');
  }, [onShowToast, t]);

  const attachArCameraStream = React.useCallback(async (stream: MediaStream) => {
    pendingArStreamRef.current = stream;
    mediaStreamRef.current = stream;

    if (!videoRef.current) {
      setArCameraMessage(t('ar.activatingCamera'));
      setArCameraHelp(null);
      return;
    }

    const started = await playArVideoStream(stream);
    if (!started) {
      throw new DOMException('Camera stream could not be attached to live video', 'AbortError');
    }

    pendingArStreamRef.current = null;
    setArCameraActive(true);
    setArCameraMessage(null);
    setArCameraHelp(null);
    onShowToast(t('toast.cameraOn'), 'view_in_ar');
  }, [onShowToast, playArVideoStream, t]);

  const handleCameraError = React.useCallback((err: unknown) => {
    console.warn('Camera access error or denied:', err);
    stopArCamera();
    const errorName = err instanceof DOMException ? err.name : '';

    if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
      showBlockedCameraMessage();
      return;
    }

    if (errorName === 'NotFoundError' || errorName === 'OverconstrainedError') {
      setArCameraMessage(t('ar.noCamera'));
      setArCameraHelp(t('ar.noCameraHelp'));
      return;
    }

    setArCameraMessage(t('ar.blocked'));
    setArCameraHelp(t('ar.failedHelp'));
  }, [showBlockedCameraMessage, stopArCamera, t]);

  const startArCamera = React.useCallback(async () => {
    setArCameraAttempted(true);
    setArCameraMessage(t('ar.requestingPermission'));
    setArCameraHelp(null);
    setIsArCameraRequesting(true);

    try {
      stopArCamera();
      const stream = await requestArCameraStream();
      await attachArCameraStream(stream);
    } catch (err) {
      handleCameraError(err);
    } finally {
      setIsArCameraRequesting(false);
    }
  }, [attachArCameraStream, handleCameraError, requestArCameraStream, stopArCamera, t]);

  useEffect(() => {
    if (isArModalOpen) return;

    stopArCamera();
    setArCameraMessage(null);
    setArCameraHelp(null);
    setArCameraAttempted(false);
    setIsArCameraRequesting(false);
    setArTrackingStatus(t('ar.waiting'));
    setIsArDishAnchored(false);
  }, [isArModalOpen, stopArCamera, t]);

  useEffect(() => {
    if (!isArModalOpen) return;

    if (pendingArStreamRef.current && videoRef.current) {
      const stream = pendingArStreamRef.current;
      attachArCameraStream(stream).catch(handleCameraError);
      return;
    }

    if (!arCameraActive && !isArCameraRequesting && !arCameraMessage) {
      setArCameraMessage(t('ar.tapToActivate'));
      setArCameraHelp(t('ar.permissionOnce'));
    }
  }, [arCameraActive, arCameraMessage, attachArCameraStream, handleCameraError, isArCameraRequesting, isArModalOpen, t]);

  useEffect(() => {
    if (!isArModalOpen || !arCameraActive) return;

    const getVideoFrameCount = (video: HTMLVideoElement) => {
      if (typeof video.getVideoPlaybackQuality === 'function') {
        return video.getVideoPlaybackQuality().totalVideoFrames;
      }
      return Math.floor(video.currentTime * 10);
    };

    const reconnectLiveVideo = async () => {
      if (arVideoFrameRef.current.reconnecting) return;
      const video = videoRef.current;
      const stream = mediaStreamRef.current;
      if (!video || !stream) return;

      arVideoFrameRef.current.reconnecting = true;
      setArTrackingStatus('Reactivando cámara');
      try {
        video.pause();
        video.srcObject = null;
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        const restarted = await playArVideoStream(stream);
        if (restarted) {
          setArCameraMessage(null);
          setArCameraHelp(null);
          setArTrackingStatus('Cámara activa');
        }
      } finally {
        arVideoFrameRef.current.reconnecting = false;
        arVideoFrameRef.current.lastFrame = -1;
        arVideoFrameRef.current.lastTime = -1;
        arVideoFrameRef.current.stuckTicks = 0;
      }
    };

    const verifyLiveCamera = () => {
      const video = videoRef.current;
      const stream = mediaStreamRef.current;
      if (!video || !stream) return;

      const hasLiveTrack = stream.getVideoTracks().some((track) => track.readyState === 'live');
      if (!hasLiveTrack) {
        setArCameraActive(false);
        setArCameraMessage(t('ar.blocked'));
        setArCameraHelp(t('ar.failedHelp'));
        return;
      }

      configureArVideoElement(video, stream);
      if (video.paused || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        void playArVideoStream(stream);
        return;
      }

      const frameCount = getVideoFrameCount(video);
      const currentTime = video.currentTime;
      const last = arVideoFrameRef.current;
      const sameFrame = frameCount === last.lastFrame && Math.abs(currentTime - last.lastTime) < 0.04;

      last.stuckTicks = sameFrame ? last.stuckTicks + 1 : 0;
      last.lastFrame = frameCount;
      last.lastTime = currentTime;

      if (last.stuckTicks >= 3) {
        void reconnectLiveVideo();
      }
    };

    const intervalId = window.setInterval(verifyLiveCamera, 1200);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        arVideoFrameRef.current.lastFrame = -1;
        arVideoFrameRef.current.lastTime = -1;
        arVideoFrameRef.current.stuckTicks = 0;
        verifyLiveCamera();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    verifyLiveCamera();

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [arCameraActive, configureArVideoElement, isArModalOpen, playArVideoStream, t]);

  const openAssistedArViewer = React.useCallback(async (dish: MenuItem, autoStartCamera = true) => {
    setArDish(dish);
    setArScale(DEFAULT_AR_SCALE);
    setArTrackingStatus(t('ar.waiting'));
    setIsArDishAnchored(false);
    setIsRealArAvailable(false);
    setIsArModalOpen(true);
    setArCameraAttempted(autoStartCamera);
    setArCameraMessage(autoStartCamera ? t('ar.requestingPermission') : t('ar.nativeFallbackTitle'));
    setArCameraHelp(autoStartCamera ? null : t('ar.nativeFallbackHelp'));

    if (!autoStartCamera) return;

    setIsArCameraRequesting(true);
    try {
      stopArCamera();
      const stream = await requestArCameraStream();
      await attachArCameraStream(stream);
    } catch (err) {
      handleCameraError(err);
    } finally {
      setIsArCameraRequesting(false);
    }
  }, [attachArCameraStream, handleCameraError, requestArCameraStream, stopArCamera, t]);

  const openArViewer = React.useCallback(async (dish: MenuItem) => {
    const modelId = getModelId(dish);
    setArDish(dish);
    setArScale(DEFAULT_AR_SCALE);
    setArTrackingStatus(t('ar.openingNative', { dish: dish.name }));
    setIsArDishAnchored(false);
    setIsRealArAvailable(false);

    if (canLaunchAndroidSceneViewer()) {
      try {
        nativeArReturnHandledRef.current = false;
        sessionStorage.setItem(NATIVE_AR_RETURN_KEY, JSON.stringify({ dishId: modelId, launchedAt: Date.now() }));
      } catch {}
      onShowToast(t('ar.openingNative', { dish: dish.name }), 'view_in_ar');
      window.location.href = buildAndroidSceneViewerIntent(dish, modelId);
      return;
    }

    await openAssistedArViewer(dish);
  }, [onShowToast, openAssistedArViewer, t]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const openFallbackIfNeeded = () => {
      if (document.visibilityState !== 'visible' || isArModalOpen || nativeArReturnHandledRef.current) return;

      let stored: { dishId?: string; launchedAt?: number } | null = null;
      try {
        const raw = sessionStorage.getItem(NATIVE_AR_RETURN_KEY);
        stored = raw ? JSON.parse(raw) : null;
      } catch {
        stored = null;
      }

      if (!stored?.dishId || !stored.launchedAt) return;
      const elapsed = Date.now() - stored.launchedAt;
      if (elapsed < 800 || elapsed > 180000) return;

      const fallbackDish = menuItems.find((item) => getModelId(item) === stored.dishId);
      if (!fallbackDish) return;

      nativeArReturnHandledRef.current = true;
      try {
        sessionStorage.removeItem(NATIVE_AR_RETURN_KEY);
      } catch {}
      void openAssistedArViewer(fallbackDish, false);
      onShowToast(t('toast.nativeArFallbackReady'), 'view_in_ar');
    };

    window.addEventListener('focus', openFallbackIfNeeded);
    window.addEventListener('pageshow', openFallbackIfNeeded);
    document.addEventListener('visibilitychange', openFallbackIfNeeded);

    return () => {
      window.removeEventListener('focus', openFallbackIfNeeded);
      window.removeEventListener('pageshow', openFallbackIfNeeded);
      document.removeEventListener('visibilitychange', openFallbackIfNeeded);
    };
  }, [isArModalOpen, menuItems, onShowToast, openAssistedArViewer, t]);

  const toggleDietaryFilter = (filter: DietaryPreference) => {
    setSelectedDietaryFilters((previous) =>
      previous.includes(filter)
        ? previous.filter((selectedFilter) => selectedFilter !== filter)
        : [...previous, filter]
    );
  };
  const searchIndexById = React.useMemo(() => {
    const index = new Map<string, string>();
    menuItems.forEach((item) => index.set(item.id, buildMenuSearchText(item)));
    return index;
  }, [menuItems]);

  const filteredItems: LocalizedMenuItem[] = React.useMemo(() => {
    return menuItems
      .filter((item) => {
        const itemCat = normalizeStr(item.category || '');
        const selCat = normalizeStr(selectedCategory);
        const matchesCategory =
          selectedCategory === 'todos' ||
          itemCat === selCat ||
          itemCat.startsWith(selCat) ||
          selCat.startsWith(itemCat);

        const query = normalizeStr(searchQuery);
        const indexedText = searchIndexById.get(item.id) ?? '';
        const matchesSearch =
          !query ||
          normalizeStr(item.name).includes(query) ||
          normalizeStr(item.description).includes(query) ||
          (item.tag && normalizeStr(item.tag).includes(query)) ||
          indexedText.includes(query) ||
          normalizeStr(getMenuCategoryLabel(item.category, language)).includes(query) ||
          (Array.isArray(item.ingredients) &&
            item.ingredients.some((ingredient: string) => normalizeStr(ingredient).includes(query))) ||
          (typeof item.ingredients === 'string' && normalizeStr(item.ingredients).includes(query));

        const matchesDietary =
          selectedDietaryFilters.length === 0 ||
          selectedDietaryFilters.every((filter) => {
            const preferences = getDietaryPreferences(item);
            return preferences.includes(filter);
          });

        return matchesCategory && matchesSearch && matchesDietary;
      })
      .map((item) => localizeMenuItem(item, language));
  }, [menuItems, selectedCategory, searchQuery, selectedDietaryFilters, searchIndexById, language]);

  const cartTotal = cart.reduce((acc: number, curr: MenuCartItem) => acc + curr.item.price * curr.quantity, 0);
  const cartItemsCount = cart.reduce((acc: number, curr: MenuCartItem) => acc + curr.quantity, 0);

  const orderRounds: OrderRound[] = tableOrderRounds
    .filter((round) => normalizeTable(round.table) === selectedTableKey)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((round) => {
      const roundTicket = orderHistory.find((order) => order.id === round.orderId);
      const status = roundTicket?.status === 'en-cocina'
        ? 'En preparación'
        : roundTicket?.status === 'pase-listo'
          ? 'Listo en pase'
          : roundTicket?.status === 'entregado'
            ? 'Entregado'
            : 'Recibido';

      return {
        ...round,
        items: round.items.map((item) => ({ ...item, status }))
      };
    });
  const latestRound = orderRounds[orderRounds.length - 1];
  const activeTableTicket = latestRound
    ? orderHistory.find((order) => order.id === latestRound.orderId)
      || (activeTicket?.id === latestRound.orderId ? activeTicket : null)
    : null;
  const consumptionDishCount = orderRounds.reduce(
    (count, round) => count + round.items.reduce((roundCount, item) => roundCount + item.quantity, 0),
    0
  );
  const consumptionTotal = orderRounds.reduce(
    (total, round) => total + round.items.reduce((roundTotal, item) => roundTotal + item.price * item.quantity, 0),
    0
  );

  useEffect(() => {
    if (!activeTableTicket) return;

    const previousStatus = observedOrderStatus.current;
    observedOrderStatus.current = { id: activeTableTicket.id, status: activeTableTicket.status };

    if (
      previousStatus?.id !== activeTableTicket.id ||
      previousStatus.status === 'pase-listo' ||
      activeTableTicket.status !== 'pase-listo'
    ) {
      return;
    }

    kitchenAudio.playReadyBell();
  }, [activeTableTicket?.id, activeTableTicket?.status]);

  /** CD-31 · Etiqueta accesible del carrito, traducida (con singular/plural). */
  const cartAriaLabel = t('cart.aria', {
    count: cartItemsCount,
    dishes: t(cartItemsCount === 1 ? 'unit.dishOne' : 'unit.dishOther')
  });

  const handleAddToCart = (item: MenuItem) => {
    // CD-27 · Feedback háptico inmediato: micro-vibración de 15 ms que confirma
    // el toque. Es un no-op silencioso donde la API no existe (iOS Safari).
    hapticAddToCart();

    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
    onShowToast(t('toast.added', { dish: item.name }), 'add_shopping_cart');
  };

  const handleAddPairing = (pairing: string, sourceItemId: string) => {
    const pairingItem = resolvePairingItem(pairing, menuItems, sourceItemId);
    if (!pairingItem) return;

    handleAddToCart(pairingItem);
  };

  // ==========================================================================
  //  CD-16 · OFERTA FLASH: platos reales + estado del pop-up promocional
  // ==========================================================================
  const [activeStoredOffers, setActiveStoredOffers] = useState<any[]>(INITIAL_ACTIVE_PROMO_OFFERS);

  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem('gastropulse_active_promo_offers');
        if (raw) {
          setActiveStoredOffers(JSON.parse(raw));
        } else {
          setActiveStoredOffers(INITIAL_ACTIVE_PROMO_OFFERS);
        }
      } catch (e) {}
    };
    handler();
    window.addEventListener('gastropulse_promo_offers_changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('gastropulse_promo_offers_changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const promoDeals = React.useMemo<MenuItem[]>(() => {
    const activeFromStore = activeStoredOffers.filter((o) => o.isActive !== false);
    if (activeFromStore.length > 0) {
      const mapped = activeFromStore
        .map((offer) => {
          const item = menuItems.find((m) => m.id === offer.mainDishId);
          if (!item) return null;
          // CD-31 · Título de la oferta (dato de la BD) y plato, localizados a la vez.
          const localizedOffer = localizePromoOffer(offer, language);
          const localizedItem = localizeMenuItem(item, language);
          return {
            ...localizedItem,
            name: localizedOffer.title || localizedItem.name,
            promoDiscountPercent: offer.discountPercent ?? PROMO_DEAL_DISCOUNT,
            promoPriceCustom: offer.promoPrice,
            promoOriginalPriceCustom: offer.originalPrice,
            promoBadge: offer.badge,
            promoKicker: offer.kicker,
            promoTimingLabel: offer.timingLabel,
            promoOfferId: offer.id,
            promoTitle: offer.title,
            promoSubtitle: offer.subtitle,
          } as MenuItem;
        })
        .filter((item): item is MenuItem => item !== null);
      if (mapped.length > 0) return mapped;
    }
    const matched = PROMO_DEAL_IDS.map((id) => menuItems.find((item) => item.id === id)).filter(
      (item): item is MenuItem => Boolean(item)
    );
    const fallbackDeals = matched.length > 0 ? matched : menuItems.slice(0, 3);
    return fallbackDeals.map((item) => localizeMenuItem(item, language));
  }, [menuItems, activeStoredOffers, language]);

  /**
   * Abre el pop-up promocional. Si llega el `id` de un plato (toque en la tira
   * "Oferta Flash"), el carrusel del pop-up se abre YA en esa oferta; sin
   * argumento arranca en la primera (auto-apertura de la carta y demás entradas
   * genéricas). Se memoiza para que la tira del ticker no se re-renderice con
   * cada render de la carta.
   */
  const openPromoModal = React.useCallback((dealId: string | null = null) => {
    setPromoInitialDealId(dealId);
    setIsPromoModalOpen(true);
  }, []);

  /** Toque/click en la tira: abre el detalle de la oferta que se está viendo. */
  const handleOpenDealFromTicker = React.useCallback(
    (deal: MenuItem) => openPromoModal(deal.id),
    [openPromoModal]
  );

  // El pop-up se abre apenas la carta está pintada (una sola vez por sesión) y
  // puede reabrirse desde la tira promocional o desde la tarjeta del menú.
  //
  // Estrategia de timing "instantánea": en lugar de un reloj fijo largo, se espera
  // al primer frame realmente pintado por el navegador (doble requestAnimationFrame
  // tras la hidratación) y recién ahí corre el beat mínimo. Así la oferta aparece en
  // ~0.4s tras pintar la carta, sin tapar el primer render (protege el LCP) y con un
  // temporizador de seguridad que la garantiza incluso en equipos/pestañas lentas.
  useEffect(() => {
    if (promoDeals.length === 0) return;

    // El guard de sesión se omite en desarrollo para poder re-testear el pop-up.
    if (!IS_DEV) {
      try {
        if (sessionStorage.getItem(PROMO_DEAL_SEEN_KEY) === '1') return;
      } catch {
        // Navegación privada sin sessionStorage: se muestra igualmente.
      }
    }

    // Precalentado de fotos en la caché del navegador: el pop-up se despliega ya
    // renderizado (sin parpadeo de imagen) en cuanto se abre.
    promoDeals.forEach((deal) => {
      if (!deal.image) return;
      const preload = new window.Image();
      preload.decoding = 'async';
      preload.src = deal.image;
    });

    let beatTimer: number | undefined;
    let opened = false;

    const openPromoDeal = () => {
      if (opened) return;
      opened = true;
      // Sin `initialDealId`: la auto-apertura siempre muestra la primera oferta.
      openPromoModal();
      // En desarrollo NO marcamos la bandera: así el pop-up vuelve a abrirse en
      // cada recarga durante las pruebas (incluida la emulación móvil).
      if (!IS_DEV) {
        try {
          sessionStorage.setItem(PROMO_DEAL_SEEN_KEY, '1');
        } catch {
          // Sin sessionStorage disponible: la oferta igualmente se muestra.
        }
      }
    };

    // El segundo frame ya corre con el primer pintado de la carta confirmado.
    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        beatTimer = window.setTimeout(openPromoDeal, PROMO_DEAL_OPEN_DELAY_MS);
      });
    });

    const safetyTimer = window.setTimeout(openPromoDeal, PROMO_DEAL_OPEN_TIMEOUT_MS);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (beatTimer !== undefined) window.clearTimeout(beatTimer);
      window.clearTimeout(safetyTimer);
    };
  }, [promoDeals.length, openPromoModal]);

  // Aplica la oferta: agrega el plato al pedido con su PRECIO PROMOCIONAL real
  // (el precio de lista del menú se mantiene intacto para el resto de la carta).
  const handleApplyPromoDeal = (dish: MenuItem, promoPrice: number) => {
    // CD-27 · Aplicar una oferta flash también es "agregar al carrito": misma
    // confirmación táctil de 15 ms.
    hapticAddToCart();

    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === dish.id && c.item.price === promoPrice);
      if (existing) {
        return prev.map((c) =>
          c.item.id === dish.id && c.item.price === promoPrice ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item: { ...dish, price: promoPrice }, quantity: 1 }];
    });

    setIsPromoModalOpen(false);
    onShowToast(
      t('toast.promoApplied', {
        dish: dish.name,
        price: formatSoles(promoPrice),
        percent: PROMO_DEAL_DISCOUNT
      }),
      'local_fire_department'
    );
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((c) => (c.item.id === itemId ? { ...c, notes } : c))
    );
  };

  const handleSendOrder = async () => {
    if (cart.length === 0) return;
    const submittedAt = new Date();

    // CD-12 · Inicializar contexto de audio para campana KDS
    kitchenAudio.prepareForPlayback();

    // ️ CD-19 · Validación Antifraude por GPS y Geocerca
    setIsVerifyingGeofence(true);
    try {
      const geoCheck = await validateDinerGeofence();
      setIsVerifyingGeofence(false);

      if (!geoCheck.allowed) {
        setGeofenceModalState({
          isOpen: true,
          distance: geoCheck.distanceMeters,
          maxAllowed: geoCheck.maxAllowedMeters,
          message: localizeGeofenceMessage(geoCheck, t),
        });
        return;
      }

      if (geoCheck.reason === 'valid_inside_radius') {
        onShowToast(t('toast.geofenceVerified', { accuracy: geoCheck.userCoords?.accuracy || 5 }), 'verified_user');
      }
    } catch (e) {
      console.warn('Geofence check bypassed on error:', e);
      setIsVerifyingGeofence(false);
    }

    let submittedOrder: OrderTicket;
    if (onSendOrderFromMenu) {
      submittedOrder = onSendOrderFromMenu(selectedTable, cart, 2);
    } else {
      const newTicket: OrderTicket = {
        id: `cmd-${Math.floor(1000 + Math.random() * 9000)}`,
        table: selectedTable,
        pax: 2,
        timeAgo: 'Justo ahora',
        createdTime: new Date().toLocaleTimeString('es-PE', { hour12: false }),
        origin: 'QR COMENSAL',
        status: 'por-validar',
        items: cart.map((c, idx) => ({
          id: `it-${Date.now()}-${idx}`,
          name: `${c.quantity}x ${c.item.name}`,
          quantity: c.quantity,
          price: c.item.price * c.quantity,
          notes: c.notes,
          station:
            c.item.category === 'bebidas'
              ? 'Barra'
              : c.item.category === 'entradas'
              ? 'Cuarto Frío'
              : 'Wok Station'
        })),
        subtotal: cartTotal,
        total: cartTotal
      };
      onAddNewOrder(newTicket);
      submittedOrder = newTicket;
    }

    onRecordTableOrderRound?.(
      selectedTable,
      cart.map(({ item, quantity }) => ({ item, quantity })),
      submittedAt,
      submittedOrder.id
    );

    try {
      localStorage.setItem(
        'gastropulse_last_order',
        JSON.stringify({
          date: Date.now(),
          table: selectedTable,
          items: cart,
          total: cartTotal
        })
      );
    } catch (e) {
      console.warn('Could not save last order:', e);
    }

    setCart([]);
    setIsCartOpen(false);
    onShowToast(t('toast.orderSent', { table: localizeTableLabel(selectedTable, language) }), 'soup_kitchen');
  };

  const handleConfirmAccountRequest = async () => {
    if (onRequestTableAccount) {
      // CD-28 · Mismo defecto hermano: la cuenta también se pedía sin mesa (fallback "MESA 04").
      await onRequestTableAccount(selectedPaymentMethod, selectedTable);
    }
    setIsPaymentModalOpen(false);
    onShowToast(
      t('pay.accountRequested', { method: selectedPaymentMethod }),
      'receipt_long'
    );
  };

  const handleOpenSplitBill = () => {
    setIsPaymentModalOpen(false);
    setPaymentAmount(null);
    setIsSplitBillModalOpen(true);
  };

  const handleConfirmSplitBill = (amount: number) => {
    setIsSplitBillModalOpen(false);
    setPaymentAmount(amount);
    setIsPaymentModalOpen(true);
  };

  const handleTriggerCallWaiter = () => {
    setIsWaiterCallModalOpen(true);
  };

  const handleSubmitWaiterCall = async (reason: WaiterCallReason) => {
    setIsWaiterCallModalOpen(false);
    setWaiterCalled(true);
    if (onCallWaiter) {
      //  FIX CD-28 · AQUÍ ESTABA EL BUG: se llamaba `onCallWaiter(reason)` SIN la mesa,
      // así que RestaurantContext caía en su fallback estático `'MESA 04'` e ignoraba la
      // mesa elegida por el comensal. Ahora se envía la MISMA variable (`selectedTable`)
      // que usa `handleSendOrder` para crear la comanda.
      await onCallWaiter(reason, selectedTable);
    }
    onShowToast(t('toast.waiterAlerted'), 'notifications_active');
    setTimeout(() => setWaiterCalled(false), 8000);
  };

  // ── CD-13 · Navegación inferior móvil (accesos rápidos + touch targets 44px)
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleGoToMenuTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFocusSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Pequeña espera para asegurar que el buscador esté visible antes del focus.
    setTimeout(() => searchInputRef.current?.focus(), 250);
  };


  // ── CD-1 / CD-13 · Animación fluida de scroll reveal & IntersectionObserver 60fps
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const cards = document.querySelectorAll('.scroll-reveal-card');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -20px 0px',
        threshold: 0.08,
      }
    );

    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [filteredItems, selectedCategory]);

  const heroItem: LocalizedMenuItem = localizeMenuItem(menuItems[0], language);

  return (
    <div className="w-full min-h-screen bg-[#f4f5f7] text-[#0f172a] dark:bg-[#0b0c0e] dark:text-[#e5e1e4] pb-44 sm:pb-36 selection:bg-primary selection:text-white transition-colors duration-300">
      {/* ========================================================================= */}
      {/*  ULTRA-CLEAN MOBILE-FIRST TOP APP BAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0e0e10]/95 backdrop-blur-xl border-b border-[#e2e8f0] dark:border-[#24252c] px-3.5 sm:px-6 py-2.5 transition-colors duration-300">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Brand & Table Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center shadow-lg shadow-primary/25 shrink-0">
              <span className="material-symbols-outlined text-[#0e0e10] text-[18px] font-bold">restaurant_menu</span>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] sm:text-[14px] font-bold text-[#0f172a] dark:text-white tracking-tight truncate font-sans">
                  AUREA <span className="text-primary font-normal text-[11px]">BISTRO</span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
              <div className="flex items-center gap-1">
                   <div className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center">
                     <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#f1f5f9] border border-[#cbd5e1] text-primary dark:bg-[#1c1d23] dark:border-[#353642] dark:text-primary text-[10px] sm:text-[11px] font-mono-code font-semibold">
                       {localizeTableLabel(selectedTable, language)}
                     </span>
                   </div>
                <span className="text-[10px] text-emerald-400 font-medium hidden xs:inline flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>{t('header.autoOrderActive')}</span>
              </div>
            </div>
          </div>

          {/* Right Header Controls: Theme Toggle + Cart Pill Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* CD-31 · Pastilla de idioma [ES | EN], gemela visual del toggle Sol/Luna */}
            <LanguageToggle />
            <ThemeToggle />

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={cartAriaLabel}
              title={t('header.openCart')}
              className="relative px-3 py-1.5 min-h-[44px] rounded-xl bg-primary hover:brightness-110 text-on-primary font-bold text-[12px] flex items-center gap-1.5 shadow-[0_0_15px] shadow-primary/35 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">shopping_bag</span>
              {/* CD-27 · Globo del contador con rebote elástico (badge pop). */}
              <CartBadge count={cartItemsCount} hideWhenEmpty={false} />
              {cartTotal > 0 && (
                <span className="hidden sm:inline-block font-mono-code text-[11px] border-l border-[#511500]/30 pl-1.5">
                  <AnimatedSoles value={cartTotal} />
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* ⏳ LIVE OPERATIONAL ORDER STATUS TRACKER */}
      {/* ========================================================================= */}
      {orderRounds.length > 0 && (
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 pt-3.5">
          <div className="bg-gradient-to-r from-white via-primary/10 to-white dark:from-[#181920] dark:via-[#20212b] dark:to-[#181920] border border-primary/50 rounded-2xl p-3.5 shadow-[0_0_25px_-5px] shadow-primary/25 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
                <span className="font-mono-code text-[11px] sm:text-[12px] text-[#c2410c] dark:text-[#ffb59c] font-bold uppercase truncate">
                  {t('tracker.orderLabel', {
                    id: latestRound.orderId.replace('ticket-', '').replace('cmd-', ''),
                    table: localizeTableLabel(selectedTable, language)
                  })}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono-code font-bold uppercase bg-primary/15 text-primary border border-primary/40 dark:bg-primary/20 dark:text-primary shrink-0 inline-flex items-center gap-1">
                {activeTableTicket?.status === 'en-cocina' && (
                  <>
                    <span className="material-symbols-outlined text-[13px]">local_fire_department</span>
                    <span>{t('tracker.inKitchen')}</span>
                  </>
                )}
                {activeTableTicket?.status === 'pase-listo' && (
                  <>
                    <span className="material-symbols-outlined text-[13px]">done_all</span>
                    <span>{t('tracker.ready')}</span>
                  </>
                )}
                {activeTableTicket?.status === 'entregado' && (
                  <>
                    <span className="material-symbols-outlined text-[13px]">restaurant</span>
                    <span>{t('tracker.served')}</span>
                  </>
                )}
                {(!activeTableTicket || activeTableTicket.status === 'por-validar') && (
                  <>
                    <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                    <span>{t('tracker.received')}</span>
                  </>
                )}
              </span>
            </div>

            {activeTableTicket?.status === 'pase-listo' && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2.5 rounded-xl border border-emerald-500/50 bg-emerald-500/15 dark:bg-emerald-500/20 px-3.5 py-2.5 text-[12px] font-semibold text-emerald-800 dark:text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse"
              >
                <span className="material-symbols-outlined text-[20px] text-emerald-600 dark:text-emerald-400 shrink-0">notifications_active</span>
                <span className="font-sans leading-tight">
                  <strong className="font-bold">{t('tracker.readyTitle')}</strong> {t('tracker.readyBody')}
                </span>
              </div>
            )}

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              <div className="h-1.5 rounded-full bg-primary shadow-[0_0_8px] shadow-primary" />
              <div
                className={`h-1.5 rounded-full transition-all ${
                  ['en-cocina', 'pase-listo', 'entregado'].includes(activeTableTicket?.status || '')
                    ? 'bg-[#ff5708] shadow-[0_0_8px_#ff5708]'
                    : 'bg-[#cbd5e1] dark:bg-[#2e2f38]'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all ${
                  ['pase-listo', 'entregado'].includes(activeTableTicket?.status || '')
                    ? 'bg-[#ff5708] shadow-[0_0_8px_#ff5708]'
                    : 'bg-[#cbd5e1] dark:bg-[#2e2f38]'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all ${
                  activeTableTicket?.status === 'entregado'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'bg-[#cbd5e1] dark:bg-[#2e2f38]'
                }`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#475569] dark:text-[#a1a1aa] font-mono-code pt-1 border-t border-[#e2e8f0] dark:border-[#24252e]">
              <span>{t('tracker.itemsInProgress', { count: consumptionDishCount })}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOrderHistoryOpen(true)}
                  className="px-2.5 py-1 min-h-[36px] rounded-lg border border-[#cbd5e1] bg-white/70 font-bold text-[11px] text-[#334155] transition-colors hover:bg-white dark:border-[#3a3b46] dark:bg-[#24252e] dark:text-white dark:hover:bg-[#2d2e3a]"
                  title="Consultar el historial de consumo de la mesa"
                >
                  <span className="material-symbols-outlined mr-1 align-middle text-[15px]">receipt_long</span>
                  <span>Consumo de Mesa</span>
                </button>
                <span className="text-[#0f172a] dark:text-white font-bold">{t('tracker.total', { amount: `S/ ${consumptionTotal.toFixed(2)}` })}</span>
                <button
                  type="button"
                  onClick={handleOpenSplitBill}
                  className="px-2.5 py-1 min-h-[36px] rounded-lg bg-primary hover:brightness-110 text-on-primary font-bold text-[11px] flex items-center gap-1 shadow cursor-pointer transition-all active:scale-95"
                  title={t('tracker.requestBillTitle')}
                >
                  <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
                  <span>{t('tracker.requestBill')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/*  RE-ORDER / WELCOME BACK VIP BANNER */}
      {/* ========================================================================= */}
      {showWelcomeBack && lastOrder && !activeTableTicket && (
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 pt-3.5 animate-fadeIn">
          <div className="bg-gradient-to-r from-white via-primary/10 to-white dark:from-[#171821] dark:via-[#22212c] dark:to-[#171821] border border-primary/30 dark:border-primary/40 rounded-2xl p-4 shadow-[0_4px_25px] shadow-primary/12 flex flex-col gap-3 relative overflow-hidden">
            {/* Subtle glow background */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
                </div>
                <div>
                  <span className="font-mono-code text-[10px] text-primary font-bold tracking-wider uppercase flex items-center gap-1">
                    <span>{t('welcome.kicker')}</span>
                    <span className="text-[8px] text-primary">•</span>
                    <span>AUREA Bistro</span>
                  </span>
                  <h4 className="text-[14px] sm:text-[15px] font-bold text-[#0f172a] dark:text-white tracking-tight leading-snug">
                    {t('welcome.title')}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowWelcomeBack(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title={t('welcome.dismiss')}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-[12px] sm:text-[13px] text-[#475569] dark:text-[#cbd5e1] leading-relaxed relative z-10">
              {t('welcome.bodyPrefix')}{' '}
              <strong className="text-[#0f172a] dark:text-white font-semibold">
                {lastOrder.items
                  .map((it) => `${it.quantity}x ${localizeMenuItemName(it.item, language)}`)
                  .join(', ')}
              </strong>. {t('welcome.bodySuffix')}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 relative z-10">
              <button
                type="button"
                onClick={handleRepeatLastOrder}
                className="h-10 px-4 rounded-xl bg-primary hover:brightness-110 text-on-primary font-bold text-[12px] sm:text-[13px] flex items-center gap-1.5 shadow-md shadow-primary/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[17px]">replay</span>
                <span>{t('welcome.repeat', { amount: `S/ ${lastOrder.total.toFixed(2)}` })}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWelcomeBack(false)}
                className="h-10 px-3.5 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] dark:bg-white/5 dark:hover:bg-white/10 dark:text-[#e2e8f0] text-[12px] font-medium border border-[#cbd5e1] dark:border-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                {t('welcome.explore')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 space-y-5">
        {/* ========================================================================= */}
        {/*  SEARCH & CATEGORIES */}
        {/* ========================================================================= */}
        <div className="space-y-2.5">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748b] dark:text-[#71717a] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              ref={searchInputRef}
              placeholder={t('search.placeholder')}
              className="w-full bg-white dark:bg-[#15161c] text-[#0f172a] dark:text-[#e5e1e4] pl-10 pr-12 py-2 min-h-[44px] rounded-xl text-[13px] placeholder:text-[#64748b] dark:placeholder:text-[#71717a] border border-[#cbd5e1] dark:border-[#2d2e38] focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label={t('search.clear')}
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#64748b] hover:text-[#0f172a] dark:text-[#71717a] dark:hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Categories Pill Bar */}
          <div className="relative">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollCategories('left')}
                aria-label={t('search.categoriesPrev')}
                className="absolute left-0 top-0 bottom-1 z-10 w-11 flex items-center justify-start bg-gradient-to-r from-[#f4f5f7] via-[#f4f5f7]/90 to-transparent dark:from-[#0b0c0e] dark:via-[#0b0c0e]/90 cursor-pointer"
              >
                <span className="w-7 h-7 rounded-full bg-white dark:bg-[#1e1f28] border border-[#cbd5e1] dark:border-[#353642] flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </span>
              </button>
            )}

            <div
              ref={catScrollRef}
              onScroll={updateCatArrows}
              className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-3.5 px-3.5 sm:mx-0 sm:px-0"
            >
              {getMenuCategoryTabs(language).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 min-h-[44px] rounded-full text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-on-primary font-bold shadow-[0_0_12px] shadow-primary/35'
                      : 'bg-white text-[#475569] hover:text-[#0f172a] border border-[#cbd5e1] dark:bg-[#181920] dark:text-[#a1a1aa] dark:hover:text-white dark:border-[#2a2b35]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollCategories('right')}
                aria-label={t('search.categoriesNext')}
                className="absolute right-0 top-0 bottom-1 z-10 w-11 flex items-center justify-end bg-gradient-to-l from-[#f4f5f7] via-[#f4f5f7]/90 to-transparent dark:from-[#0b0c0e] dark:via-[#0b0c0e]/90 cursor-pointer"
              >
                <span className="w-7 h-7 rounded-full bg-white dark:bg-[#1e1f28] border border-[#cbd5e1] dark:border-[#353642] flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ⚡ CD-16 · TIRA DE OFERTA FLASH (autoplay + dispara el pop-up)            */}
        {/* ========================================================================= */}
        {/* Rota sola entre las ofertas activas cada `PROMO_TICKER_ROTATION_MS`. Se
            pausa al pasar el mouse / apoyar el dedo y, al tocarla, abre el pop-up
            detallado EN la oferta que se está viendo en ese instante. */}
        <PromoFlashTicker
          deals={promoDeals}
          discountPercent={PROMO_DEAL_DISCOUNT}
          rotationMs={PROMO_TICKER_ROTATION_MS}
          isPaused={isPromoModalOpen}
          onOpenDeal={handleOpenDealFromTicker}
        />

        {/* ========================================================================= */}
        {/*  HERO FEATURED DISH (DUAL VIEW:  FOTO HD /  3D 360°) */}
        {/* ========================================================================= */}
        <section className="bg-white dark:bg-[#15161c] rounded-2xl overflow-hidden border border-primary/35 shadow-[0_4px_30px] shadow-primary/15 transition-colors duration-300">
          <div className="relative">
            {/* Controles flotantes modo Foto HD / 3D 360 sobre la imagen sin franja negra superior */}
            <div className="absolute top-3 right-3 z-20 inline-flex items-center bg-black/70 backdrop-blur-md p-0.5 rounded-xl border border-white/20 shadow-xl">
              <button
                type="button"
                onClick={() => setHeroViewMode('photo')}
                aria-pressed={heroViewMode === 'photo'}
                className={`px-3 py-1 rounded-lg text-[11px] font-sans font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  heroViewMode === 'photo'
                    ? 'bg-primary text-white font-bold shadow-md shadow-primary/30 scale-[1.02]'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">image</span>
                <span>{t('dish.photoHd')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setHeroViewMode('3d');
                  onShowToast(t('toast.loading3dViewer'), 'view_in_ar');
                }}
                aria-pressed={heroViewMode === '3d'}
                className={`px-3 py-1 rounded-lg text-[11px] font-sans font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  heroViewMode === '3d'
                    ? 'bg-primary text-white font-bold shadow-md shadow-primary/30 scale-[1.02]'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">view_in_ar</span>
                <span>{t('dish.view3d360')}</span>
              </button>
            </div>

            {heroViewMode === 'photo' ? (
              <div className="relative w-full h-64 sm:h-80 overflow-hidden bg-[#e2e8f0] dark:bg-[#0e0e10] group">
                <button
                  type="button"
                  onClick={() => setSelectedDishDetails(heroItem)}
                  aria-label={t('dish.openHeroDetails', { dish: heroItem.name })}
                  className="absolute inset-0 h-full w-full cursor-zoom-in text-left"
                >
                  <img
                    src={heroItem.image_url_hd || heroItem.image}
                    alt={heroItem.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </button>
              </div>
            ) : (
              <ThreeDView
                dishId={getModelId(heroItem)}
                heightClass="h-64 sm:h-80"
                onInteract={() => onShowToast(t('toast.rotating', { dish: heroItem.name }), '3d_rotation')}
              />
            )}
          </div>

          <div className="p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono-code text-[11px] text-primary font-bold">
                    {heroItem.tag}
                  </span>
                  <span className="text-[#cbd5e1] dark:text-[#353642]">•</span>
                  <span className="font-mono-code text-[11px] text-[#475569] dark:text-[#a1a1aa]">{heroItem.prepTime}</span>
                </div>
                <h2 className="text-[19px] sm:text-[23px] font-bold text-[#0f172a] dark:text-white leading-snug">
                  {heroItem.name}
                </h2>
              </div>

              <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-1">
                <span className="font-mono-code text-[22px] sm:text-[24px] font-bold text-primary">
                  S/ {heroItem.price.toFixed(2)}
                </span>
                <span className="font-mono-code text-[10px] text-[#64748b] dark:text-[#71717a]">{t('dish.igvNote')}</span>
              </div>
            </div>

            <p className="text-[13px] text-[#475569] dark:text-[#a1a1aa] leading-relaxed">
              {heroItem.description}
            </p>

            {/* Flavor & Pairing Ribbon */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e2e8f0] dark:border-[#24252e] text-[11px] font-mono-code">
              <span className="inline-flex items-center gap-1 text-primary bg-primary/10 dark:bg-[#1a1b22] px-2.5 py-1 rounded-lg border border-primary/20 dark:text-primary">
                <span className="material-symbols-outlined text-[14px] text-primary">star</span>
                {heroItem.rating} {t('dish.reviewsCount', { count: heroItem.reviewsCount })}
              </span>

              <span className="inline-flex items-center gap-1 text-emerald-700 bg-[#ecfdf5] dark:bg-[#1a1b22] px-2.5 py-1 rounded-lg border border-emerald-500/20 dark:text-emerald-400">
                <span className="material-symbols-outlined text-[14px]">eco</span>
                {heroItem.dietary}
              </span>
            </div>

            <PairingSuggestion
              item={heroItem}
              onAddPairing={(pairing) => handleAddPairing(pairing, heroItem.id)}
            />

            {/* Main Action Buttons */}
            <div className="pt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <div className="flex w-full flex-row gap-x-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedDishDetails(heroItem)}
                  className="h-11 min-w-0 flex-1 px-3 rounded-xl bg-white hover:bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1] text-[12px] sm:text-[13px] font-semibold flex items-center justify-center gap-1.5 dark:bg-[#1e1f28] dark:hover:bg-[#282935] dark:text-[#e5e1e4] dark:border-[#353642] transition-colors cursor-pointer whitespace-nowrap sm:flex-none active:scale-95"
                  aria-label={t('dish.openHeroHd', { dish: heroItem.name })}
                >
                  <span className="material-symbols-outlined text-[17px] text-primary">description</span>
                  <span>{t('dish.hdSheet')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openArViewer(heroItem)}
                  className="h-11 min-w-0 flex-1 px-3.5 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] hover:text-[#0f172a] dark:bg-[#1e1f28] dark:hover:bg-[#282935] dark:text-[#e5e1e4] text-[13px] font-medium flex items-center justify-center gap-1.5 border border-[#cbd5e1] dark:border-[#353642] transition-colors cursor-pointer whitespace-nowrap sm:flex-none active:scale-95"
                  title={t('dish.projectArTableTitle')}
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">view_in_ar</span>
                  <span>{t('dish.arViewer')}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleAddToCart(heroItem)}
                className="w-full h-11 px-3.5 rounded-xl bg-primary hover:brightness-110 text-on-primary font-bold text-[13px] sm:text-[14px] flex items-center justify-center gap-2 shadow-[0_0_20px] shadow-primary/35 active:scale-98 transition-all cursor-pointer whitespace-nowrap sm:w-auto sm:flex-1"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                <span>{t('dish.addPrice', { price: `S/ ${heroItem.price.toFixed(2)}` })}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/*  SPECIALTY DISHES GRID */}
        {/* ========================================================================= */}
        <section className="space-y-3.5 pt-1">
          <div className="rounded-2xl border border-[#e2e8f0] bg-white/80 px-3.5 py-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-[17px] font-black tracking-tight text-[#0f172a] dark:text-white sm:text-[20px]">
                  <span className="material-symbols-outlined text-primary text-[22px]">menu_book</span>
                  <span>{t('grid.title')}</span>
                </h3>
                <p className="mt-0.5 text-[11px] font-medium text-[#64748b] dark:text-[#a1a1aa]">
                  {t('grid.nativeArSubhead')}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono-code text-[11px] font-bold text-primary">
                {t(filteredItems.length === 1 ? 'grid.countOne' : 'grid.countOther', {
                  count: filteredItems.length
                })}
              </span>
            </div>
          </div>

          <DietaryFilters
            selectedFilters={selectedDietaryFilters}
            onToggle={toggleDietaryFilter}
          />

          {filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-[#15161c] rounded-2xl border border-[#e2e8f0] dark:border-[#24252e] p-8 text-center space-y-3 my-4">
              <div className="w-12 h-12 rounded-full bg-[#f1f5f9] dark:bg-[#1e1f28] border border-primary/30 text-primary flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[24px]">search_off</span>
              </div>
              <h4 className="text-[#0f172a] dark:text-white font-bold text-[16px]">{t('grid.emptyTitle')}</h4>
              <p className="text-[#475569] dark:text-[#a1a1aa] text-[13px] max-w-sm mx-auto">
                {selectedDietaryFilters.length > 0 ? (
                  `No encontramos ningún resultado para "${selectedDietaryFilters.map((selectedFilter) => DIETARY_FILTERS.find((filter) => filter.value === selectedFilter)?.label).join(', ')}". Prueba con otro ingrediente o limpia los filtros.`
                ) : (
                  t('grid.emptyBody', { query: searchQuery })
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('todos');
                  setSelectedDietaryFilters([]);
                }}
                className="px-4 py-2 min-h-[44px] rounded-xl bg-primary text-on-primary font-bold text-[12px] transition-all hover:brightness-110 cursor-pointer"
              >
                {t('grid.emptyAction')}
              </button>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredItems.map((dish, index) => (
              <article
                key={dish.id}
                className="scroll-reveal-card bg-white dark:bg-[#15161c] rounded-2xl overflow-hidden border border-[#e2e8f0] dark:border-[#24252e] hover:border-primary/50 transition-all duration-300 flex flex-col justify-between group shadow-sm dark:shadow-none hover:shadow-lg dark:hover:shadow-[0_4px_25px] dark:hover:shadow-primary/12 hover:-translate-y-0.5"
                style={{
                  transitionDelay: `${Math.min(index * 30, 240)}ms`
                }}
              >
                {/* Image */}
                <div className="relative h-44 sm:h-48 overflow-hidden bg-[#e2e8f0] dark:bg-[#0e0e10]">
                  <button
                    type="button"
                    onClick={() => setSelectedDishDetails(dish)}
                    aria-label={t('dish.openDetails', { dish: dish.name })}
                    className="absolute inset-0 h-full w-full cursor-zoom-in text-left"
                  >
                    <img
                      src={dish.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </button>
                </div>

                {/* Content Details */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="text-[15px] font-semibold text-[#0f172a] dark:text-white leading-snug group-hover:text-primary transition-colors">
                      {dish.name}
                    </h4>
                    <p className="text-[12px] text-[#475569] dark:text-[#a1a1aa] line-clamp-2 leading-relaxed">
                      {dish.description}
                    </p>
                    {getDietaryPreferences(dish).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {DIETARY_FILTERS.filter((filter) =>
                          getDietaryPreferences(dish).includes(filter.value)
                        ).map((filter) => (
                          <span
                            key={filter.value}
                            title={filter.label}
                            className="inline-flex items-center gap-1 rounded-full border border-[#e2e8f0] bg-[#f8fafc]/90 px-2 py-0.5 text-[10px] font-medium text-[#475569] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:text-[#c4c4ce]"
                          >
                            <span aria-hidden="true"><span className="material-symbols-outlined text-[13px]">{filter.materialIcon}</span></span>
                            {filter.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#e2e8f0] dark:border-[#24252e]">
                    <div className="flex flex-col">
                      <span className="font-mono-code text-[16px] sm:text-[17px] font-bold text-primary">
                        S/ {dish.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {dish.has3D && (
                        <button
                          type="button"
                          onClick={() => openArViewer(dish)}
                          className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary/10 px-3 text-primary border border-primary/30 dark:bg-primary/15 dark:text-primary transition-colors cursor-pointer active:scale-95 sm:min-w-[44px] sm:px-0"
                          title={t('dish.openNativeArAndroid')}
                        >
                          <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
                          <span className="text-[11px] font-black sm:hidden">AR</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddToCart(dish)}
                        className="px-3 py-1.5 min-h-[44px] rounded-xl bg-[#f1f5f9] hover:bg-primary text-[#0f172a] hover:text-on-primary border border-[#cbd5e1] hover:border-primary dark:bg-[#24252e] dark:text-white dark:border-transparent dark:hover:bg-primary dark:hover:text-on-primary font-semibold text-[12px] flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        <span>{t('dish.add')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          )}
        </section>

        <DishDetailModal
          item={selectedDishDetails}
          onClose={() => setSelectedDishDetails(null)}
          onAddPairing={(pairing) => {
            if (selectedDishDetails) handleAddPairing(pairing, selectedDishDetails.id);
          }}
        />

        {/* ========================================================================= */}
        {/* ️ RESTAURANT FOOTER & LEGAL BAR (INDECOPI) */}
        {/* ========================================================================= */}
        <footer className="pt-10 pb-28 sm:pb-12 border-t border-[#e2e8f0] dark:border-[#24252e] space-y-4 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#64748b] dark:text-[#94a3b8]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0f172a] dark:text-white">AUREA BISTRO</span>
              <span>• RUC: 20608945231</span>
              <span className="hidden sm:inline">• {t('footer.cuisine')}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsComplaintModalOpen(true)}
                className="inline-flex min-h-[44px] items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] dark:bg-[#1a1b22] dark:hover:bg-[#252630] dark:text-[#e2e8f0] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] font-semibold transition-all cursor-pointer shadow-sm hover:border-primary/50 active:scale-95"
                title={t('footer.complaintsTitle')}
              >
                <span className="material-symbols-outlined text-primary text-[18px]">menu_book</span>
                <span>{t('footer.complaints')}</span>
              </button>
            </div>
          </div>
          <p className="text-[10px] text-[#94a3b8] dark:text-[#64748b] font-mono-code">
            {t('footer.legal')}
          </p>
        </footer>
      </main>

      {/* ========================================================================= */}
      {/*  PERSISTENT FLOATING BOTTOM ORDER BAR */}
      {/* ========================================================================= */}
      {cart.length > 0 && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-3 left-3 right-3 max-w-md mx-auto z-40">
          <div className="bg-white/95 dark:bg-[#15161c]/95 backdrop-blur-xl border border-primary/50 p-2.5 sm:p-3 rounded-2xl shadow-[0_4px_25px_rgba(15,23,42,0.18)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.8)] flex items-center justify-between gap-2.5">
            <div
              className="flex items-center gap-2.5 cursor-pointer min-w-0"
              onClick={() => setIsCartOpen(true)}
            >
              {/* CD-27 · Globo del carrito: rebote elástico al agregar un plato. */}
              <CartBadge
                count={cartItemsCount}
                className="w-9 h-9 rounded-xl bg-[#ff5708] text-[#2b0b00] flex items-center justify-center font-bold font-mono-code text-[15px] shrink-0 shadow-md"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-[#475569] dark:text-[#a1a1aa] truncate">{t('cart.totalWithCount', { count: cartItemsCount, dishes: t(cartItemsCount === 1 ? 'unit.dishOne' : 'unit.dishOther') })}</span>
                <span className="font-mono-code text-[15px] sm:text-[16px] font-bold text-[#c2410c] dark:text-[#ff5708]">
                  {/* CD-27 · El importe cuenta a 60 FPS en lugar de saltar. */}
                  <AnimatedSoles value={cartTotal} />
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                title="Ver y editar los platos pendientes del pedido"
                className="px-2.5 sm:px-3 py-2 min-h-[44px] rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] border border-[#cbd5e1] dark:bg-[#24252e] dark:hover:bg-[#2d2e3a] dark:text-white dark:border-transparent text-[11px] sm:text-[12px] font-medium transition-colors cursor-pointer"
              >
                {t('cart.viewOrder')}
              </button>
              <button
                type="button"
                onClick={handleSendOrder}
                className="px-3 sm:px-4 py-2 min-h-[44px] rounded-xl bg-primary text-on-primary font-bold text-[12px] sm:text-[13px] flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px] shadow-primary/35 cursor-pointer"
              >
                <span>{t('cart.send')}</span>
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/*  TABLE SELECTOR MODAL */}
      {/* ========================================================================= */}


      {/* ========================================================================= */}
      {/* ️ CART DRAWER / REVIEW MODAL */}
      {/* ========================================================================= */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#15161c] w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-[#e2e8f0] dark:border-[#2d2e38] shadow-2xl p-5 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-[#24252e]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
                <h3 className="text-[16px] font-bold text-[#0f172a] dark:text-white">{t('cart.title', { table: localizeTableLabel(selectedTable, language) })}</h3>
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
                  key={c.item.id}
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
                        onClick={() => handleRemoveFromCart(c.item.id)}
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

                  <input
                    type="text"
                    placeholder={t('cart.notePlaceholder')}
                    value={c.notes || ''}
                    onChange={(e) => handleUpdateNotes(c.item.id, e.target.value)}
                    className="w-full bg-white dark:bg-[#15161c] text-[#0f172a] dark:text-[#e5e1e4] px-2.5 py-2 min-h-[44px] rounded-lg text-[11px] placeholder:text-[#94a3b8] dark:placeholder:text-[#71717a] border border-[#e2e8f0] dark:border-[#2d2e38] focus:outline-none focus:border-primary"
                  />
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
                  className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-primary text-on-primary font-bold text-[13px] flex items-center justify-center gap-1.5 hover:brightness-110 shadow-lg cursor-pointer"
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

      {/* ========================================================================= */}
      {/*  SPECIFIC DISH 3D INSPECTOR MODAL */}
      {/* ========================================================================= */}
      {selectedDishForModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#15161c] w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-primary/40 shadow-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-[#24252e]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">view_in_ar</span>
                <h3 className="text-[15px] sm:text-[16px] font-bold text-[#0f172a] dark:text-white truncate">
                  {t('dish.threeDTitle', { dish: selectedDishForModal.name })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDishForModal(null)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#475569] dark:text-[#a1a1aa] hover:text-[#0f172a] dark:hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Custom 3D canvas tailored to this specific dish! */}
            <ThreeDView
              dishId={getModelId(selectedDishForModal)}
              heightClass="h-64 sm:h-72"
              onInteract={() => onShowToast(t('toast.inspecting', { dish: selectedDishForModal.name }), '3d_rotation')}
            />

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono-code text-primary font-bold">{selectedDishForModal.tag}</span>
                <span className="text-[18px] font-mono-code font-bold text-primary">
                  S/ {selectedDishForModal.price.toFixed(2)}
                </span>
              </div>
              <p className="text-[12px] text-[#475569] dark:text-[#a1a1aa] leading-relaxed">
                {selectedDishForModal.description}
              </p>
            </div>

            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  openArViewer(selectedDishForModal);
                  setSelectedDishForModal(null);
                }}
                className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1d4ed8] border border-[#cbd5e1] dark:bg-[#1e1f28] dark:hover:bg-[#282935] dark:text-[#a1c9ff] dark:border-[#353642] text-[12px] flex items-center gap-1.5 cursor-pointer"
                title={t('dish.projectArTableTitle')}
              >
                <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
                <span>{t('dish.arViewer')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleAddToCart(selectedDishForModal);
                  setSelectedDishForModal(null);
                }}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-primary text-on-primary font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-lg hover:brightness-110 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                <span>{t('dish.orderPrice', { price: `S/ ${selectedDishForModal.price.toFixed(2)}` })}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/*  REAL CAMERA AUGMENTED REALITY (AR) VISOR OVERLAY */}
      {/* ========================================================================= */}
      {isArModalOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between animate-fadeIn overflow-hidden">
          {/* Live Phone Camera Video Stream */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-hidden={!arCameraActive}
            onLoadedMetadata={() => mediaStreamRef.current && void playArVideoStream(mediaStreamRef.current)}
            onCanPlay={() => mediaStreamRef.current && void playArVideoStream(mediaStreamRef.current)}
            onPause={() => mediaStreamRef.current && void playArVideoStream(mediaStreamRef.current)}
            onStalled={() => mediaStreamRef.current && void playArVideoStream(mediaStreamRef.current)}
            onSuspend={() => mediaStreamRef.current && void playArVideoStream(mediaStreamRef.current)}
            className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-200 ${arCameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          />

          {/* Superficie de mesa simulada con iluminación cálida cuando no hay cámara activa */}
          {!arCameraActive && (
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#111216] via-[#161820] to-[#0c0d10] flex flex-col items-center justify-center pointer-events-none">
              <div className="w-80 h-80 rounded-full bg-primary/8 blur-3xl" />
            </div>
          )}

          {!arCameraActive && arCameraMessage && (
            <div className="absolute left-4 right-4 bottom-36 z-30 rounded-2xl border border-primary/45 bg-black/80 backdrop-blur-md p-4 text-white shadow-2xl sm:left-1/2 sm:right-auto sm:w-[380px] sm:-translate-x-1/2">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-[22px] shrink-0">photo_camera</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold leading-snug text-white">{arCameraMessage}</p>
                  {arCameraHelp && <p className="mt-1.5 text-[11px] leading-snug text-white/75">{arCameraHelp}</p>}
                  <button
                    type="button"
                    onClick={startArCamera}
                    disabled={isArCameraRequesting}
                    className="mt-3 min-h-[42px] rounded-xl bg-primary px-4 py-2 text-[13px] font-black text-on-primary shadow-lg active:scale-95 disabled:cursor-wait disabled:opacity-70"
                  >
                    {isArCameraRequesting ? t('ar.activatingCamera') : arCameraAttempted ? t('ar.retryCamera') : t('ar.activateCamera')}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Top Bar Overlay */}
          <div className="relative z-20 px-4 pt-safe pt-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px] text-primary">view_in_ar</span>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-white leading-tight">{t('ar.title')}</span>
                <span className="text-[10px] font-mono-code text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{arCameraActive ? arTrackingStatus : isArCameraRequesting ? t('ar.activating') : t('ar.waiting')}</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              aria-label={t('ar.close')}
              onClick={() => setIsArModalOpen(false)}
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* AR surface detector + anchored transparent 3D dish layer */}
          <div className="absolute inset-0 z-10 pointer-events-auto">
            <DishARViewer
              dishId={getModelId(arDish)}
              scale={arScale}
              isCameraActive={arCameraActive}
              onStatusChange={setArTrackingStatus}
              onAnchorChange={setIsArDishAnchored}
              onShowToast={onShowToast}
              preferRealAR={isRealArAvailable && !isArDishAnchored}
            />
          </div>

          <WebXRDishLauncher
            dishId={getModelId(arDish)}
            scale={arScale}
            isCameraActive={arCameraActive}
            isAnchored={isArDishAnchored}
            onStatusChange={setArTrackingStatus}
            onShowToast={onShowToast}
            onAvailabilityChange={setIsRealArAvailable}
            onBeforeStart={() => {
              stopArCamera();
              setArCameraMessage(null);
              setArCameraHelp(null);
              setArTrackingStatus('AR real iniciando');
            }}
            onSessionEnd={() => {
              setArCameraMessage(t('ar.tapToActivate'));
              setArCameraHelp(t('ar.permissionOnce'));
            }}
          />

          {/* Bottom Floating AR Controls */}
          <div className="relative z-20 px-4 pb-safe pb-5 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-4 space-y-3">
            {/* Scale controls */}
            <div className="flex items-center justify-between bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-white/15 text-[11px] font-mono-code">
              <span className="text-[#a1a1aa]">{isArDishAnchored ? t('ar.anchored') : t('ar.realScale')}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t('ar.scaleDown')}
                  onClick={() => setArScale((s) => Math.max(0.7, s - 0.1))}
                  className="w-11 h-11 min-h-[44px] min-w-[44px] rounded bg-[#2a2b36] text-white flex items-center justify-center font-bold cursor-pointer"
                >
                  -
                </button>
                <span className="text-primary font-bold">
                  {(getArDishDimensionCm(getModelId(arDish)) * arScale).toFixed(0)} cm
                </span>
                <button
                  type="button"
                  aria-label={t('ar.scaleUp')}
                  onClick={() => setArScale((s) => Math.min(1.3, s + 0.1))}
                  className="w-11 h-11 min-h-[44px] min-w-[44px] rounded bg-[#2a2b36] text-white flex items-center justify-center font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Dish Info & Add to Cart button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-bold text-white truncate">{arDish.name}</span>
                <span className="text-[12px] font-mono-code text-primary font-bold">S/ {arDish.price.toFixed(2)}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleAddToCart(arDish);
                  setIsArModalOpen(false);
                }}
                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-primary text-on-primary font-bold text-[13px] flex items-center gap-1.5 shadow-lg hover:brightness-110 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">add_shopping_cart</span>
                <span>{t('dish.orderThisDish')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/*  CD-13 · BARRA DE NAVEGACIÓN INFERIOR MÓVIL (touch targets de 44px)      */}
      {/* ========================================================================= */}
      <MenuBottomNav
        cartItemsCount={cartItemsCount}
        waiterCalled={waiterCalled}
        onGoToMenu={handleGoToMenuTop}
        onFocusSearch={handleFocusSearch}
        onOpenCart={() => setIsCartOpen(true)}
        onCallWaiter={handleTriggerCallWaiter}
        onOpenPayment={handleOpenSplitBill}
      />

      {/* ========================================================================= */}
      {/*  CD-10 · MODAL PASARELA DE PAGO DIGITAL QR Y RESEÑAS POST-PAGO          */}
      {/* ========================================================================= */}
      {(() => {
        const cleanTblNum = selectedTable.replace(/\D/g, '');
        const currentTbl = (tables || []).find((t) => t.number === cleanTblNum || selectedTable.includes(t.number));
        const tblAmount = Number(currentTbl?.amount || 0);
        const consolidatedTotalAmount: number =
          orderRounds.length > 0
            ? consumptionTotal
            : tblAmount > 0
            ? tblAmount
            : Number(activeTicket?.total || (cartTotal > 0 ? cartTotal : 86.00));
        const splitBillItems = (activeTicket?.items || [])
          .map((item, index) => ({
            id: `${item.id}-${index}`,
            name: item.name,
            quantity: item.quantity,
            price: Number(item.price)
          }))
          .filter((item) => Number.isFinite(item.price) && item.price > 0);
        const splitBillTotal = splitBillItems.length > 0
          ? splitBillItems.reduce((total, item) => total + item.price, 0)
          : consolidatedTotalAmount;

        return (
          <>
            {isSplitBillModalOpen && (
              <SplitBillModal
                isOpen
                totalAmount={splitBillTotal}
                items={splitBillItems}
                onClose={() => setIsSplitBillModalOpen(false)}
                onConfirm={handleConfirmSplitBill}
              />
            )}
            <PaymentModal
              isOpen={isPaymentModalOpen}
              onClose={() => {
                setIsPaymentModalOpen(false);
                setPaymentAmount(null);
              }}
              tableNumber={activeTicket?.table || selectedTable}
              totalAmount={paymentAmount ?? consolidatedTotalAmount}
              orderId={activeTicket?.id}
              onRequestTableAccount={onRequestTableAccount}
              onShowToast={onShowToast}
            />
          </>
        );
      })()}

      {/*  LIBRO DE RECLAMACIONES VIRTUAL (INDECOPI) */}
      <ComplaintBookModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        currentTable={selectedTable}
        onShowToast={onShowToast}
      />

      <OrderHistoryModal
        isOpen={isOrderHistoryOpen}
        onClose={() => setIsOrderHistoryOpen(false)}
        tableNumber={selectedTable}
        rounds={orderRounds}
      />

      {/* ========================================================================= */}
      {/*  CD-28 · BOTTOM SHEET "ASISTENCIA EN MESA" (MOTIVOS DEL LLAMADO)         */}
      {/* ========================================================================= */}
      <WaiterCallModal
        isOpen={isWaiterCallModalOpen}
        onClose={() => setIsWaiterCallModalOpen(false)}
        onSelect={handleSubmitWaiterCall}
        /* CD-28 · Se muestra EXACTAMENTE la mesa que se va a registrar (WYSIWYG):
           `selectedTable` es la fuente única (QR `?mesa=` + modal selector). */
        tableNumber={selectedTable}
      />

      {/* ========================================================================= */}
      {/* ⚡ CD-16 · POP-UP PROMOCIONAL "OFERTA FLASH" (PLATOS REALES + DESCUENTO)   */}
      {/* ========================================================================= */}
      <PromoDealModal
        isOpen={isPromoModalOpen && !isArModalOpen && !selectedDishForModal}
        onClose={() => setIsPromoModalOpen(false)}
        deals={promoDeals}
        initialDealId={promoInitialDealId}
        discountPercent={PROMO_DEAL_DISCOUNT}
        countdownSeconds={PROMO_DEAL_DURATION_SECONDS}
        onApply={handleApplyPromoDeal}
      />

      {/* ️ CD-19 · MODAL DE ADVERTENCIA DE GEOCERCA GPS ANTIFRAUDE */}
      <GeofenceWarningModal
        isOpen={geofenceModalState.isOpen}
        distanceMeters={geofenceModalState.distance}
        maxAllowedMeters={geofenceModalState.maxAllowed}
        message={geofenceModalState.message}
        onRetry={handleSendOrder}
        onClose={() => setGeofenceModalState((prev) => ({ ...prev, isOpen: false }))}
        onCallWaiter={() => {
          // CD-28 · Tercer punto con el mismo defecto: también debe viajar la mesa real.
          if (onCallWaiter) onCallWaiter('Solicitud de asistencia por verificación de mesa', selectedTable);
          onShowToast(t('toast.waiterNotified'), 'room_service');
        }}
      />

    </div>
  );
};
