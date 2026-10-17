'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { MenuItem } from '@/types';
import type { TranslationKey, TranslationParams } from '@/i18n/translations';
import { getArDishDimensionCm } from '@/config/arDishProfiles';

type Translate = (key: TranslationKey, params?: TranslationParams) => string;

const DEFAULT_AR_SCALE = 1;
const NATIVE_AR_RETURN_KEY = 'gastropulse_native_ar_return';

const canLaunchAndroidSceneViewer = () => {
  if (typeof window === 'undefined') return false;
  return /android/i.test(window.navigator.userAgent);
};

export const getModelId = (dish: MenuItem) => dish.id;

const buildAndroidSceneViewerIntent = (dish: MenuItem, modelId: string) => {
  const modelUrl = new URL(`/models-ar/${modelId}.glb`, window.location.origin).href;
  const fallbackUrl = new URL(window.location.href);
  fallbackUrl.searchParams.set('arFallback', modelId);
  fallbackUrl.searchParams.set('arName', dish.name);

  const title = `${dish.name} · ${getArDishDimensionCm(modelId)} cm · mueve lento`;
  return `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}&mode=ar_preferred&title=${encodeURIComponent(title)}&resizable=false#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallbackUrl.href)};end;`;
};

/**
 * Cámara del visor de realidad aumentada de la carta (antes vivía dentro de
 * QRMenuViewer): permiso y conexión de la cámara trasera, reintentos cuando el
 * video se congela, Scene Viewer nativo en Android y modo asistido.
 */
export function useArViewer(menuItems: MenuItem[], t: Translate, onShowToast: (message: string, icon?: string) => void) {
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pendingArStreamRef = useRef<MediaStream | null>(null);
  const arVideoFrameRef = useRef({ lastFrame: -1, lastTime: -1, stuckTicks: 0, reconnecting: false });
  const nativeArReturnHandledRef = useRef(false);
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

    // eslint-disable-next-line react-hooks/set-state-in-effect -- al cerrar el modal se apaga la cámara (sistema externo) y se limpia su estado
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mensaje según el estado real de la cámara
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

  return {
    isArModalOpen,
    setIsArModalOpen,
    arCameraActive,
    arCameraMessage,
    setArCameraMessage,
    arCameraHelp,
    setArCameraHelp,
    isArCameraRequesting,
    arCameraAttempted,
    arScale,
    setArScale,
    arTrackingStatus,
    setArTrackingStatus,
    isArDishAnchored,
    setIsArDishAnchored,
    isRealArAvailable,
    setIsRealArAvailable,
    arDish,
    videoRef,
    mediaStreamRef,
    stopArCamera,
    playArVideoStream,
    startArCamera,
    openArViewer
  };
}
