'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { useDialog } from '@/hooks/useDialog';
import type { MenuItem } from '@/types';
import { getModelId, type useArViewer } from './useArViewer';
import { getArDishDimensionCm } from '@/config/arDishProfiles';
import { DishARViewer, WebXRDishLauncher } from './lazyViewers';

interface ArVisorOverlayProps {
  arViewer: ReturnType<typeof useArViewer>;
  onAddToCart: (item: MenuItem) => void;
  onShowToast: (message: string, icon?: string) => void;
}

/** Visor de realidad aumentada con la cámara del celular (pantalla completa). */
export function ArVisorOverlay({ arViewer, onAddToCart: handleAddToCart, onShowToast }: ArVisorOverlayProps) {
  const { t } = useLanguage();
  const {
    isArModalOpen, setIsArModalOpen, arCameraActive, arCameraMessage, setArCameraMessage, arCameraHelp, setArCameraHelp,
    isArCameraRequesting, arCameraAttempted, arScale, setArScale, arTrackingStatus, setArTrackingStatus, isArDishAnchored,
    setIsArDishAnchored, isRealArAvailable, setIsRealArAvailable, arDish, videoRef, mediaStreamRef, stopArCamera, playArVideoStream,
    startArCamera
  } = arViewer;
  const arDialog = useDialog(isArModalOpen, () => setIsArModalOpen(false));


  return (
    <>
    {isArModalOpen && (
      <div {...arDialog} aria-label={t('ar.title')} className="fixed inset-0 z-50 bg-black flex flex-col justify-between animate-fadeIn overflow-hidden">
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
    </>
  );
}
