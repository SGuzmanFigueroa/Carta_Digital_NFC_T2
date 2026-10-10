'use client';

import React, { useEffect, useRef, useState } from 'react';

type ModelViewerElement = HTMLElement & {
  activateAR?: () => Promise<void>;
};

interface WebXRDishLauncherProps {
  dishId: string;
  scale: number;
  isCameraActive: boolean;
  isAnchored: boolean;
  onStatusChange?: (label: string) => void;
  onShowToast?: (msg: string, icon?: string) => void;
}

const WEBXR_SCALE_BY_DISH: Record<string, number> = {
  'smoked-old-fashioned': 0.82,
  'aji-de-gallina': 1.08,
  'causa-limena': 1.04,
  'esfera-chocolate': 0.96,
  'tartar-nikkei': 1.0,
  'chaufa-wok': 1.12,
  'risotto-porcini': 1.08,
  'lomo-saltado': 1.12,
  'pulpo-brasa': 1.08,
  'wagyu-a5': 1.1,
};

export const WebXRDishLauncher: React.FC<WebXRDishLauncherProps> = ({
  dishId,
  scale,
  isCameraActive,
  isAnchored,
  onStatusChange,
  onShowToast,
}) => {
  const modelViewerRef = useRef<ModelViewerElement | null>(null);
  const [webComponentReady, setWebComponentReady] = useState(false);
  const [webXRSupported, setWebXRSupported] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [wasUnsupported, setWasUnsupported] = useState(false);

  useEffect(() => {
    let cancelled = false;

    import('@google/model-viewer')
      .then(() => {
        if (!cancelled) setWebComponentReady(true);
      })
      .catch((error) => {
        console.warn('No se pudo cargar model-viewer para WebXR', error);
        if (!cancelled) setWasUnsupported(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const detectWebXR = async () => {
      const xr = (navigator as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }).xr;
      if (!xr?.isSessionSupported) {
        if (!cancelled) setWasUnsupported(true);
        return;
      }

      try {
        const supported = await xr.isSessionSupported('immersive-ar');
        if (!cancelled) {
          setWebXRSupported(supported);
          setWasUnsupported(!supported);
        }
      } catch {
        if (!cancelled) setWasUnsupported(true);
      }
    };

    detectWebXR();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const viewer = modelViewerRef.current;
    if (!viewer || !webComponentReady || !webXRSupported) return;

    const handleLoad = () => {
      setModelReady(true);
    };

    const handleError = () => {
      setWasUnsupported(true);
      onShowToast?.('No se pudo preparar el modelo para AR real', 'info');
    };

    const handleArStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status?: string }>).detail?.status;

      if (status === 'session-started') {
        setIsLaunching(false);
        onStatusChange?.('AR real activo');
        onShowToast?.('Busca una superficie y toca para colocar el plato', 'view_in_ar');
      }

      if (status === 'object-placed') {
        onStatusChange?.('Plato colocado en AR real');
        onShowToast?.('Plato fijado sobre la superficie', 'check_circle');
      }

      if (status === 'failed') {
        setIsLaunching(false);
        setWasUnsupported(true);
        onStatusChange?.('Modo asistido listo');
        onShowToast?.('Este navegador no inició WebXR; usa el visor asistido', 'info');
      }

      if (status === 'not-presenting') {
        setIsLaunching(false);
      }
    };

    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);
    viewer.addEventListener('ar-status', handleArStatus as EventListener);

    return () => {
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
      viewer.removeEventListener('ar-status', handleArStatus as EventListener);
    };
  }, [webComponentReady, webXRSupported, onShowToast, onStatusChange, dishId]);

  const startRealWebXR = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const viewer = modelViewerRef.current;
    if (!viewer?.activateAR) {
      setWasUnsupported(true);
      onShowToast?.('AR real no está disponible en este navegador', 'info');
      return;
    }

    setIsLaunching(true);
    onStatusChange?.('Iniciando AR real');

    try {
      await viewer.activateAR();
    } catch (error) {
      console.warn('No se pudo iniciar WebXR real', error);
      setIsLaunching(false);
      setWasUnsupported(true);
      onStatusChange?.('Modo asistido listo');
      onShowToast?.('Tu equipo no inició WebXR; puedes colocar el plato con el visor asistido', 'info');
    }
  };

  if (!isCameraActive || isAnchored || wasUnsupported || !webXRSupported) return null;

  const calibratedScale = Math.max(0.55, Math.min(1.45, scale * (WEBXR_SCALE_BY_DISH[dishId] ?? 1)));
  const scaleValue = `${calibratedScale} ${calibratedScale} ${calibratedScale}`;
  const canOfferWebXR = webComponentReady && webXRSupported && modelReady;

  return (
    <div className="absolute left-1/2 top-[22%] z-30 w-[min(330px,calc(100vw-32px))] -translate-x-1/2 pointer-events-none">
      {webComponentReady &&
        React.createElement('model-viewer', {
          ref: modelViewerRef as React.Ref<HTMLElement>,
          src: `/models-ar/${dishId}.glb`,
          ar: true,
          'ar-modes': 'webxr',
          'ar-placement': 'floor',
          'ar-scale': 'fixed',
          'camera-controls': true,
          'disable-zoom': true,
          'interaction-prompt': 'none',
          'shadow-intensity': '0.95',
          'shadow-softness': '0.82',
          exposure: '1.08',
          'environment-image': 'neutral',
          scale: scaleValue,
          style: {
            position: 'absolute',
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
            left: -9999,
            top: -9999,
          },
        })}

      <div className="pointer-events-auto rounded-2xl border border-[#ff5708]/45 bg-black/72 p-3 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-2.5">
          <span className="material-symbols-outlined mt-0.5 text-[22px] text-[#ff5708]">view_in_ar</span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-black leading-snug">AR real de mesa</p>
            <p className="mt-1 text-[10px] leading-snug text-white/68">
              Usa WebXR para detectar la mesa y dejar el plato fijo mientras te mueves alrededor.
            </p>
            <button
              type="button"
              onClick={startRealWebXR}
              disabled={!canOfferWebXR || isLaunching}
              className="mt-2 min-h-[40px] rounded-xl bg-[#ff5708] px-3.5 py-2 text-[12px] font-black text-[#2b0b00] shadow-lg transition active:scale-95 disabled:cursor-wait disabled:opacity-65"
            >
              {isLaunching ? 'Abriendo AR real...' : canOfferWebXR ? 'Colocar con AR real' : 'Preparando AR real...'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
