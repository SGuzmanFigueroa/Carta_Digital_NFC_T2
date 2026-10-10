'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

const MODEL_VIEWER_SCRIPT_ID = 'google-model-viewer-runtime';
const MODEL_VIEWER_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js';

interface NativeARModelViewerProps {
  modelSrc: string;
  title: string;
  diameterCm?: number;
}

export const NativeARModelViewer: React.FC<NativeARModelViewerProps> = ({
  modelSrc,
  title,
  diameterCm = 28
}) => {
  const [isReady, setIsReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [androidSceneViewerUrl, setAndroidSceneViewerUrl] = useState<string | null>(null);
  const modelViewerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('android')) {
      const absoluteModelUrl = new URL(modelSrc, window.location.origin).href;
      const fallbackUrl = window.location.href;
      const intentUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(absoluteModelUrl)}&mode=ar_preferred&title=${encodeURIComponent(title)}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end;`;
      setAndroidSceneViewerUrl(intentUrl);
    } else {
      setAndroidSceneViewerUrl(null);
    }

    if (window.customElements?.get('model-viewer')) {
      setIsReady(true);
      return;
    }

    const existingScript = document.getElementById(MODEL_VIEWER_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      const onExistingLoad = () => setIsReady(true);
      const onExistingError = () => setLoadFailed(true);
      existingScript.addEventListener('load', onExistingLoad);
      existingScript.addEventListener('error', onExistingError);
      return () => {
        existingScript.removeEventListener('load', onExistingLoad);
        existingScript.removeEventListener('error', onExistingError);
      };
    }

    const script = document.createElement('script');
    script.id = MODEL_VIEWER_SCRIPT_ID;
    script.type = 'module';
    script.src = MODEL_VIEWER_SRC;
    script.async = true;
    script.onload = () => setIsReady(true);
    script.onerror = () => setLoadFailed(true);
    document.head.appendChild(script);
  }, [modelSrc, title]);

  useEffect(() => {
    if (!isReady) return;

    const modelViewer = modelViewerRef.current;
    if (!modelViewer) return;

    modelViewer.setAttribute('src', modelSrc);
    modelViewer.setAttribute('alt', `Modelo 3D de ${title}`);
    modelViewer.setAttribute('ar', '');
    modelViewer.setAttribute('ar-modes', 'scene-viewer webxr quick-look');
    modelViewer.setAttribute('camera-controls', '');
    modelViewer.setAttribute('auto-rotate', '');
    modelViewer.setAttribute('shadow-intensity', '0.75');
    modelViewer.setAttribute('exposure', '1.2');
    modelViewer.setAttribute('loading', 'eager');
    modelViewer.setAttribute('reveal', 'auto');
    modelViewer.setAttribute('touch-action', 'pan-y');
  }, [isReady, modelSrc, title]);
  const modelViewerProps = useMemo(
    () => ({
      src: modelSrc,
      alt: `Modelo 3D de ${title}`,
      ar: true,
      'ar-modes': 'scene-viewer webxr quick-look',
      'camera-controls': true,
      'auto-rotate': true,
      'shadow-intensity': '0.75',
      exposure: '1.2',
      loading: 'eager',
      reveal: 'auto',
      'touch-action': 'pan-y',
      ref: modelViewerRef as React.Ref<HTMLElement>,
      style: {
        width: '100%',
        height: '100%',
        background: 'transparent'
      }
    }),
    [modelSrc, title]
  );

  if (loadFailed) {
    return (
      <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-2 text-[11px] leading-snug text-white/70">
        No se pudo cargar AR nativo. El visor 3D normal sigue disponible.
      </div>
    );
  }

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-primary/35 bg-[#0b0c10]/85 shadow-inner shadow-black/40">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2.5 py-1.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold text-white">AR nativo del plato</p>
          <p className="text-[10px] text-white/55">Android compatible abre Scene Viewer/WebXR</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
          {diameterCm} cm
        </span>
      </div>

      <div className="relative h-28">
        {!isReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-black/30 text-[11px] font-semibold text-primary">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Cargando AR nativo...
          </div>
        )}

        {isReady &&
          React.createElement(
            'model-viewer',
            modelViewerProps,
            React.createElement(
              'button',
              {
                slot: 'ar-button',
                type: 'button',
                className:
                  'absolute bottom-2 left-1/2 min-h-[40px] -translate-x-1/2 rounded-xl bg-primary px-3 py-2 text-[12px] font-black text-on-primary shadow-xl shadow-primary/25 active:scale-95'
              },
              'Abrir AR nativo'
            )
          )}
      </div>

      <div className="space-y-1.5 px-2.5 pb-2 pt-1">
        {androidSceneViewerUrl && (
          <a
            href={androidSceneViewerUrl}
            className="flex min-h-[38px] items-center justify-center rounded-lg border border-primary/50 bg-primary/15 px-3 text-center text-[11px] font-black text-primary active:scale-95"
          >
            Abrir AR Android directo
          </a>
        )}
        <p className="text-[10px] leading-snug text-white/55">
          Si Chrome bloquea la cámara web, esta opción usa el visor AR del sistema cuando el móvil lo soporta. En escritorio funciona como vista 3D de prueba.
        </p>
      </div>
    </div>
  );
};
