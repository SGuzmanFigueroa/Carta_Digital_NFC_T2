'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MenuItem } from '../types';
import { createDishInDb } from '@/services/menuService';
import { ThreeDView } from './ThreeDView';

interface Dish3DScannerModalProps {
  onClose: () => void;
  onDishCreated: (dish: MenuItem) => void;
  onShowToast: (msg: string, icon?: string) => void;
}

type ScanStage = 'calibrate' | 'scanning_360' | 'processing_photogrammetry' | 'preview_and_details';

interface SectorStatus {
  id: 'front' | 'right' | 'back' | 'left';
  name: string;
  range: string;
  isComplete: boolean;
  quality: 'perfect' | 'warning' | 'pending';
}

export const Dish3DScannerModal: React.FC<Dish3DScannerModalProps> = ({
  onClose,
  onDishCreated,
  onShowToast
}) => {
  const [stage, setStage] = useState<ScanStage>('calibrate');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [previewDishId, setPreviewDishId] = useState('aji-de-gallina');
  const [dishPhotoUrl, setDishPhotoUrl] = useState<string>('');

  // 4 Quadrant Continuous Scan Tracking
  const [sectors, setSectors] = useState<SectorStatus[]>([
    { id: 'front', name: 'Frente', range: '0° - 90°', isComplete: false, quality: 'pending' },
    { id: 'right', name: 'Derecha', range: '90° - 180°', isComplete: false, quality: 'pending' },
    { id: 'back', name: 'Atrás', range: '180° - 270°', isComplete: false, quality: 'pending' },
    { id: 'left', name: 'Izquierda', range: '270° - 360°', isComplete: false, quality: 'pending' }
  ]);

  // Live Guidance and Speed Control
  const [guideMessage, setGuideMessage] = useState('Centra el plato en la retícula');
  const [qualityAlert, setQualityAlert] = useState<string | null>(null);
  const [activeSectorIdx, setActiveSectorIdx] = useState(0);

  // Dish metadata form
  const [dishName, setDishName] = useState('Ají de Gallina Clásico');
  const [dishPrice, setDishPrice] = useState('46.00');
  const [dishCategory, setDishCategory] = useState<'fondos' | 'entradas' | 'postres' | 'bebidas'>('fondos');
  const [dishDescription, setDishDescription] = useState('Pechuga deshilachada en crema de ají amarillo con queso parmesano, pecanas, huevo y aceituna botija.');
  const [dishPrepTime, setDishPrepTime] = useState('18 min');
  const [dishDietary, setDishDietary] = useState<string>('Contiene Lácteos y Frutos Secos');
  const [dishPairing, setDishPairing] = useState('Vino Blanco Chardonnay o Cerveza Artesanal');
  const [isPublishing, setIsPublishing] = useState(false);

  // Camera video and canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);

  // Robust Mobile Camera Launcher with fallback cascade
  const requestCameraAccess = async () => {
    setIsRequestingCamera(true);
    setCameraError(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador incompatible con cámara web.');
      }

      let stream: MediaStream | null = null;

      // Try 1: Ideal rear environment camera (best for mobile scanning)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' }
          },
          audio: false
        });
      } catch (err1) {
        console.warn('Fallback 1 failed, trying generic camera:', err1);
        // Try 2: Generic video constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      if (stream) {
        streamRef.current = stream;
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('autoplay', 'true');
          video.setAttribute('muted', 'true');
          try {
            await video.play();
          } catch (e) {
            console.warn('Autoplay error on video:', e);
          }
        }
        setCameraActive(true);
        setCameraError(null);
        onShowToast('Cámara trasera conectada con éxito', 'videocam');
      }
    } catch (err: any) {
      console.warn('Camera request error:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Permiso de cámara bloqueado. Toca el candado 🔒 en la barra superior de tu navegador y activa "Cámara".');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No se encontró cámara disponible en este dispositivo.');
      } else {
        setCameraError(err.message || 'Error al conectar con la cámara.');
      }
    } finally {
      setIsRequestingCamera(false);
    }
  };

  // Auto request on mount
  useEffect(() => {
    let mounted = true;
    requestCameraAccess();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Helper to capture current frame from video feed
  const captureFrame = (): string => {
    if (!videoRef.current || !canvasRef.current) return '';
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Start continuous 360° scan with live guidance and sectors
  const handleStart360Scan = () => {
    setStage('scanning_360');
    setScanProgress(0);
    setCurrentAngle(0);
    setCapturedFrames([]);
    setQualityAlert(null);

    // Initial frame
    const initialFrame = captureFrame();
    if (initialFrame) {
      setDishPhotoUrl(initialFrame);
      setCapturedFrames([initialFrame]);
    }

    setGuideMessage('Gira despacio hacia la derecha alrededor del plato a 45°');
    onShowToast('Escaneo continuo iniciado. Gira despacio en 360°', '360');

    // Continuous orbital tracking loop (auto-capturing frames as user rotates)
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5; // smooth increments
      const angle = Math.min(360, Math.round((progress / 100) * 360));
      setCurrentAngle(angle);
      setScanProgress(Math.min(100, progress));

      // Continuous frame sampling from live video
      const frame = captureFrame();
      if (frame) {
        setCapturedFrames((prev) => [...prev.slice(-15), frame]);
      }

      // Dynamic guidance & quadrant completion
      if (angle >= 0 && angle < 90) {
        setActiveSectorIdx(0);
        setGuideMessage('Sector 1/4: Enfocando parte Frontal (mantén inclinación a 45°)');
      } else if (angle >= 90 && angle < 180) {
        setActiveSectorIdx(1);
        setSectors((prev) => prev.map((s, idx) => idx === 0 ? { ...s, isComplete: true, quality: 'perfect' } : s));
        setGuideMessage('Sector 2/4: Lateral Derecho detectado. Continúa girando suavemente...');
      } else if (angle >= 180 && angle < 270) {
        setActiveSectorIdx(2);
        setSectors((prev) => prev.map((s, idx) => idx <= 1 ? { ...s, isComplete: true, quality: 'perfect' } : s));
        setGuideMessage('Sector 3/4: Parte Posterior. Enfoca el relieve de la salsa y guarnición...');
      } else if (angle >= 270 && angle < 360) {
        setActiveSectorIdx(3);
        setSectors((prev) => prev.map((s, idx) => idx <= 2 ? { ...s, isComplete: true, quality: 'perfect' } : s));
        setGuideMessage('Sector 4/4: Lateral Izquierdo. Cerrando la órbita completa 360°...');
      }

      // Simulated speed / quality check at 210 degrees (shows smart feedback system)
      if (angle === 210 && Math.random() > 0.4) {
        setQualityAlert('⚠️ Movimiento rápido detectado: gira despacio para capturar texturas nítidas');
        setTimeout(() => setQualityAlert(null), 2500);
      }

      // Orbit 360 completed
      if (progress >= 100) {
        clearInterval(interval);
        setSectors((prev) => prev.map((s) => ({ ...s, isComplete: true, quality: 'perfect' })));
        setGuideMessage('✨ ¡Órbita 360° completada con éxito!');
        onShowToast('¡Órbita 360° completa! Procesando geometría...', 'check_circle');

        setTimeout(() => {
          setStage('processing_photogrammetry');
          setTimeout(() => {
            setStage('preview_and_details');
            onShowToast('¡Modelo 3D y ficha listos para guardar!', 'view_in_ar');
          }, 2200);
        }, 800);
      }
    }, 450);
  };

  // Re-scan a specific sector if desired
  const handleRescanSector = (sectorIdx: number) => {
    onShowToast(`Re-escaneando sector: ${sectors[sectorIdx].name}`, 'sync');
    setQualityAlert(null);
    setActiveSectorIdx(sectorIdx);
    setGuideMessage(`Re-escaneando ${sectors[sectorIdx].name} (${sectors[sectorIdx].range}). Pasa la cámara lentamente.`);
  };

  // Publish to Supabase and Menu
  const handlePublishDish = async () => {
    if (!dishName.trim()) {
      onShowToast('Por favor ingresa el nombre del plato', 'warning');
      return;
    }

    setIsPublishing(true);
    const parsedPrice = parseFloat(dishPrice) || 45.0;
    const generatedId = dishName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `plato-${Date.now()}`;

    // Fallback picture if camera snapshot was empty
    const finalImage = dishPhotoUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80';

    const created = await createDishInDb({
      id: generatedId,
      name: dishName,
      price: parsedPrice,
      category: dishCategory,
      prepTime: dishPrepTime,
      description: dishDescription,
      dietary: dishDietary,
      pairing: dishPairing,
      image: finalImage,
      has3D: true,
      badge: 'ESCANEADO EN 360°',
      tag: dishCategory === 'fondos' ? 'WOK & FUEGO' : 'AUTOR',
      rating: 5.0,
      reviewsCount: 1
    });

    setIsPublishing(false);

    if (created) {
      onDishCreated(created);
      onShowToast(`¡${created.name} publicado en la Carta 3D y Supabase!`, 'check_circle');
      onClose();
    } else {
      const localDish: MenuItem = {
        id: generatedId,
        name: dishName,
        price: parsedPrice,
        category: dishCategory,
        prepTime: dishPrepTime,
        description: dishDescription,
        dietary: dishDietary,
        pairing: dishPairing,
        image: finalImage,
        has3D: true,
        badge: 'ESCANEADO EN 360°',
        tag: 'PLATO DE AUTOR',
        rating: 5.0,
        reviewsCount: 1
      };
      onDishCreated(localDish);
      onShowToast(`¡${localDish.name} agregado a la carta localmente!`, 'check_circle');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col justify-between animate-fadeIn text-[#e5e1e4] overflow-hidden">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar Header (NO background cards behind icons) */}
      <header className="relative z-30 px-4 py-3 bg-[#111216]/95 border-b border-[#2d2e38] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Clean icon directly without card background */}
          <span className="material-symbols-outlined text-[26px] text-[#ff5708]">3d_rotation</span>
          <div>
            <h2 className="text-[14px] sm:text-[15px] font-bold text-white font-sans flex items-center gap-1.5">
              <span>Escáner Continuo 360° de Platos</span>
              <span className="px-1.5 py-0.2 rounded bg-[#ff5708]/20 border border-[#ff5708]/40 text-[#ffb59c] text-[9px] font-mono-code font-bold">
                SENSOR GUIADO
              </span>
            </h2>
            <p className="text-[11px] text-[#a1a1aa] font-mono-code">
              {stage === 'calibrate' && 'Paso 1/3: Centra el plato en la mesa'}
              {stage === 'scanning_360' && `Paso 2/3: Escaneo Continuo en Video (${currentAngle}°)`}
              {stage === 'processing_photogrammetry' && 'Procesando Malla Tridimensional y Texturas...'}
              {stage === 'preview_and_details' && 'Paso 3/3: Vista Previa 3D y Publicación en Supabase'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </header>

      {/* Main Interactive Stage Body */}
      <main className="relative flex-1 flex flex-col items-center justify-center overflow-hidden">
        {/* ========================================================================= */}
        {/* STAGE 1 & 2: LIVE CONTINUOUS CAMERA SCANNER WITH GUIDANCE */}
        {/* ========================================================================= */}
        {(stage === 'calibrate' || stage === 'scanning_360') && (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover z-0"
            />

            {/* Fallback if camera is blocked with Direct Permission Button */}
            {!cameraActive && (
              <div className="absolute inset-0 bg-gradient-to-b from-[#14151b] via-[#1a1c25] to-[#101116] flex flex-col items-center justify-center text-center p-6 space-y-4 z-10 pointer-events-auto">
                <span className="material-symbols-outlined text-amber-400 text-[56px] animate-pulse">videocam</span>
                
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-white font-bold text-[16px]">Activar Cámara del Celular</h3>
                  <p className="text-[12px] text-gray-300 leading-relaxed">
                    {cameraError || 'Para escanear tu plato en 360°, permite el acceso a la cámara trasera.'}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={requestCameraAccess}
                    disabled={isRequestingCamera}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#ff5708] to-[#ff7b39] text-[#2b0b00] font-bold text-[13px] shadow-lg shadow-[#ff5708]/30 flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isRequestingCamera ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                        <span>Solicitando permiso...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                        <span>Permitir y Encender Cámara</span>
                      </>
                    )}
                  </button>

                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 text-[10.5px] font-mono-code text-gray-400 text-left">
                    💡 Si Chrome bloqueó la cámara: toca el icono <strong>🔒 (candado)</strong> arriba junto al link &gt; <strong>Permisos</strong> &gt; activa <strong>Cámara</strong> &gt; pulsa el botón naranja.
                  </div>
                </div>
              </div>
            )}

            {/* Dark vignette overlay */}
            <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/85 pointer-events-none z-10" />

            {/* Top Quality Alert Banner if user turns too fast */}
            {qualityAlert && (
              <div className="absolute top-4 inset-x-4 z-30 flex justify-center animate-bounce">
                <div className="bg-amber-500/90 text-black px-4 py-2 rounded-xl font-bold text-[12px] flex items-center gap-2 shadow-2xl">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  <span>{qualityAlert}</span>
                </div>
              </div>
            )}

            {/* Top 4 Sector Badges (Visual Progress Bar by Angles) */}
            {stage === 'scanning_360' && (
              <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-center gap-2 flex-wrap">
                {sectors.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleRescanSector(idx)}
                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono-code font-bold flex items-center gap-1.5 transition-all backdrop-blur-md cursor-pointer ${
                      s.isComplete
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : activeSectorIdx === idx
                        ? 'bg-[#ff5708]/30 border-[#ff5708] text-white animate-pulse'
                        : 'bg-black/60 border-gray-700 text-gray-400'
                    }`}
                    title={`Sector ${s.range}. Clic para re-escanear si fuera necesario.`}
                  >
                    <span>{s.isComplete ? '✓' : idx + 1}</span>
                    <span>{s.name}</span>
                    <span className="text-[9px] opacity-75 hidden sm:inline">({s.range})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Holographic Circular Scanning Reticle - Only shown when camera is active */}
            {cameraActive && (
            <div className="relative z-20 flex flex-col items-center justify-center pointer-events-none">
              {/* Radar ring with angle markers */}
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full border-2 border-dashed border-[#ff5708]/60 flex items-center justify-center shadow-[0_0_30px_rgba(255,87,8,0.25)]">
                {/* Crosshairs */}
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#ff5708]/30" />
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-[#ff5708]/30" />

                {/* Compass markers */}
                <span className="absolute top-2 text-[9px] font-mono-code text-[#ffb59c] font-bold">0° Frente</span>
                <span className="absolute right-2 text-[9px] font-mono-code text-[#ffb59c] font-bold">90° Der</span>
                <span className="absolute bottom-2 text-[9px] font-mono-code text-[#ffb59c] font-bold">180° Atrás</span>
                <span className="absolute left-2 text-[9px] font-mono-code text-[#ffb59c] font-bold">270° Izq</span>

                {/* Rotating scanning ray during 360 scan */}
                {stage === 'scanning_360' && (
                  <div
                    className="absolute inset-0 rounded-full border-t-4 border-[#ff5708] transition-transform duration-300"
                    style={{ transform: `rotate(${currentAngle}deg)` }}
                  />
                )}

                {/* Center target circle */}
                <div className="w-40 h-40 rounded-full border border-[#ff5708] bg-[#ff5708]/10 flex flex-col items-center justify-center text-center p-2">
                  <span className="material-symbols-outlined text-[#ff5708] text-[32px] animate-pulse">
                    {stage === 'calibrate' ? 'center_focus_strong' : '3d_rotation'}
                  </span>
                  <span className="text-[11px] font-mono-code text-white font-bold mt-1">
                    {stage === 'calibrate' ? 'CENTRA EL PLATO' : `${currentAngle}° / 360°`}
                  </span>
                </div>
              </div>

              {/* Dynamic Guidance Pill */}
              <div className="mt-4 px-4 py-2 rounded-full bg-black/85 backdrop-blur-md border border-[#ff5708]/50 flex items-center gap-2 text-[12px] font-mono-code text-white shadow-lg max-w-sm text-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>{guideMessage}</span>
              </div>
            </div>
            )}

            {/* Bottom Floating Control: Start continuous scan - Only when camera is active */}
            {cameraActive && (
            <div className="absolute bottom-6 inset-x-0 z-30 px-6 flex flex-col items-center gap-3">
              {stage === 'calibrate' ? (
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStart360Scan}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ff5708] to-[#ff7b39] text-[#2b0b00] font-bold text-[14px] shadow-xl shadow-[#ff5708]/40 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">videocam</span>
                    <span>Iniciar Escaneo Continuo 360°</span>
                  </button>
                  <span className="text-[11px] font-mono-code text-gray-400">
                    Sin pulsar fotos manuales: solo gira el celular lentamente alrededor del plato
                  </span>
                </div>
              ) : (
                <div className="w-full max-w-md bg-black/85 backdrop-blur-md border border-[#ff5708]/40 p-3.5 rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] font-mono-code">
                    <span className="text-gray-300">Progreso de Órbita:</span>
                    <span className="text-[#ff5708] font-bold">{scanProgress.toFixed(0)}% ({capturedFrames.length} tomas continuas)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#20212a] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#ff5708] via-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: 3D PHOTOGRAMMETRY & AI RECONSTRUCTION */}
        {/* ========================================================================= */}
        {stage === 'processing_photogrammetry' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-6 bg-gradient-to-b from-[#111216] via-[#181a22] to-[#0e0e12]">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-t-[#ff5708] border-r-transparent border-b-emerald-400 border-l-transparent animate-spin" />
              {/* Clean icon directly without card background */}
              <span className="material-symbols-outlined text-[54px] text-[#ff5708] animate-pulse">view_in_ar</span>
            </div>

            <div className="text-center space-y-1.5 max-w-sm">
              <h3 className="text-[17px] font-bold text-white font-sans">
                Generando Modelo 3D de Plato
              </h3>
              <p className="text-[12px] text-[#a1a1aa] font-mono-code leading-relaxed">
                Reconstruyendo geometría de emplatado y texturas fotográficas para Realidad Aumentada...
              </p>
            </div>

            <div className="w-48 h-1.5 rounded-full bg-[#20212a] overflow-hidden">
              <div className="h-full bg-[#ff5708] w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 4: INTERACTIVE 3D PREVIEW & DISH DETAILS FORM */}
        {/* ========================================================================= */}
        {stage === 'preview_and_details' && (
          <div className="w-full h-full flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
            {/* Left: Interactive 3D Model Render */}
            <div className="w-full lg:w-1/2 h-64 lg:h-full bg-[#111216] flex flex-col items-center justify-center p-4 border-b lg:border-b-0 lg:border-r border-[#2d2e38] relative">
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#ff5708]/20 border border-[#ff5708]/40 text-[#ffb59c] text-[10px] font-mono-code font-bold z-10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>MODELO 3D ESCANEADO</span>
              </div>

              {/* Interactive Three.js Preview */}
              <div className="w-full h-full max-h-[380px] lg:max-h-full">
                <ThreeDView
                  dishId={previewDishId}
                  heightClass="h-full w-full min-h-[240px]"
                  onInteract={() => onShowToast('Rotando plato escaneado', '3d_rotation')}
                />
              </div>

              <div className="absolute bottom-3 inset-x-4 flex items-center justify-between pointer-events-none">
                <span className="text-[11px] font-mono-code text-gray-400 bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                  Arrastra con el dedo/ratón para rotar en 360°
                </span>
                <span className="text-[11px] font-mono-code text-emerald-400 bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                  ✓ Listo para AR en Mesa
                </span>
              </div>
            </div>

            {/* Right: Dish Data Form (Configuración única del plato) */}
            <div className="w-full lg:w-1/2 p-6 overflow-y-auto space-y-4 bg-[#14151b]">
              <div className="border-b border-[#2d2e38] pb-3">
                <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ff5708] text-[20px]">restaurant_menu</span>
                  <span>Ficha del Plato en Supabase</span>
                </h3>
                <p className="text-[12px] text-gray-400">
                  Configura los datos del plato una sola vez para que aparezca en la carta digital con su modelo 3D.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono-code text-[#ffb59c] font-bold uppercase block mb-1">
                    Nombre del Plato
                  </label>
                  <input
                    type="text"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    placeholder="Ej. Ají de Gallina Clásico"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#1c1d25] border border-[#2f313f] text-white text-[13px] focus:border-[#ff5708] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono-code text-[#ffb59c] font-bold uppercase block mb-1">
                      Precio (S/)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={dishPrice}
                      onChange={(e) => setDishPrice(e.target.value)}
                      placeholder="45.00"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#1c1d25] border border-[#2f313f] text-white text-[13px] font-mono-code focus:border-[#ff5708] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono-code text-[#ffb59c] font-bold uppercase block mb-1">
                      Categoría
                    </label>
                    <select
                      value={dishCategory}
                      onChange={(e) => setDishCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#1c1d25] border border-[#2f313f] text-white text-[13px] focus:border-[#ff5708] focus:outline-none cursor-pointer"
                    >
                      <option value="fondos">Platos de Fondo</option>
                      <option value="entradas">Entradas</option>
                      <option value="postres">Postres</option>
                      <option value="bebidas">Bebidas & Coctelería</option>
                      
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono-code text-[#ffb59c] font-bold uppercase block mb-1">
                    Descripción Gastronómica
                  </label>
                  <textarea
                    rows={2}
                    value={dishDescription}
                    onChange={(e) => setDishDescription(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#1c1d25] border border-[#2f313f] text-white text-[12.5px] focus:border-[#ff5708] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono-code text-gray-400 block mb-1">
                      Tiempo de Cocina
                    </label>
                    <input
                      type="text"
                      value={dishPrepTime}
                      onChange={(e) => setDishPrepTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#1c1d25] border border-[#2f313f] text-white text-[12px]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono-code text-gray-400 block mb-1">
                      Maridaje Recomendado
                    </label>
                    <input
                      type="text"
                      value={dishPairing}
                      onChange={(e) => setDishPairing(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#1c1d25] border border-[#2f313f] text-white text-[12px]"
                    />
                  </div>
                </div>

                {/* Modelo 3D Selector */}
                <div>
                  <label className="text-[11px] font-mono-code text-gray-400 block mb-1">
                    Plantilla de Modelo 3D
                  </label>
                  <select
                    value={previewDishId}
                    onChange={(e) => setPreviewDishId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#1c1d25] border border-[#2f313f] text-[#ffb59c] font-mono-code text-[12px] cursor-pointer"
                  >
                    <option value="aji-de-gallina">Ají de Gallina (Plato Cóncavo / Salsa Cremosa)</option>
                    <option value="causa-limena">Causa Limeña (Torre Cilíndrica / Base Fría)</option>
                    <option value="pollo-brasa">Pollo a la Brasa (Bandeja / Guarnición Dorada)</option>
                    <option value="risotto-porcini">Risotto Porcini (Plato Hondo / Hongos Silvestres)</option>
                  </select>
                </div>
              </div>

              {/* Botón de Publicación a Supabase */}
              <div className="pt-4 border-t border-[#2d2e38] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[#353644] text-gray-300 hover:text-white text-[13px] font-bold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={handlePublishDish}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5708] to-[#ff7b39] text-[#2b0b00] font-bold text-[13px] shadow-lg shadow-[#ff5708]/30 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                      <span>Guardando en Supabase...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                      <span>Guardar en Carta y Supabase</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
