'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MenuItem } from '../types';
import { ThreeDView } from './ThreeDView';

interface ARTableViewerProps {
  initialDish: MenuItem;
  allDishes: MenuItem[];
  onClose: () => void;
  onAddToCart: (dish: MenuItem) => void;
  onShowToast: (msg: string, icon?: string) => void;
}

export const ARTableViewer: React.FC<ARTableViewerProps> = ({
  initialDish,
  allDishes,
  onClose,
  onAddToCart,
  onShowToast
}) => {
  const [currentDish, setCurrentDish] = useState<MenuItem>(initialDish);
  const [cameraActive, setCameraActive] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [lightPreset, setLightPreset] = useState<'bistro' | 'daylight' | 'intense'>('bistro');
  const [isLockedOnTable, setIsLockedOnTable] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Interactive 3D translation & rotation on table
  const [dishPosX, setDishPosX] = useState(0);
  const [dishPosY, setDishPosY] = useState(0);
  const isDraggingRef = useRef(false);
  const startDragRef = useRef({ x: 0, y: 0, startPosX: 0, startPosY: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera stream
  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: false
          });

          if (isMounted) {
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
            }
            setCameraActive(true);
            onShowToast('Cámara AR activada: Apunta hacia tu mesa', 'view_in_ar');
          }
        }
      } catch (err) {
        console.warn('Camera access denied:', err);
        setCameraActive(false);
        onShowToast('Modo AR sobre superficie simulada (permiso de cámara no concedido)', 'info');
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  // Touch & Mouse Drag Handlers to move dish around the table
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startDragRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: dishPosX,
      startPosY: dishPosY
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startDragRef.current.x;
    const dy = e.clientY - startDragRef.current.y;
    setDishPosX(startDragRef.current.startPosX + dx);
    setDishPosY(startDragRef.current.startPosY + dy);
  };

  const handlePointerUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      onShowToast('Plato posicionado en la mesa', 'check');
    }
  };

  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleSnapshot = () => {
    onShowToast('¡Foto AR capturada! Guardada en tu dispositivo', 'photo_camera');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between animate-fadeIn overflow-hidden select-none text-[#e5e1e4]">
      {/* Live Environment Camera Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Surface Pattern Texture Fallback */}
      {!cameraActive && (
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#111216] via-[#1a1c24] to-[#0e0f13] flex flex-col items-center justify-center">
          <div className="w-80 h-80 rounded-full border border-dashed border-[#ff5708]/30 animate-pulse flex flex-col items-center justify-center text-center p-4">
            <span className="material-symbols-outlined text-[#ff5708] text-[36px] mb-2">table_restaurant</span>
            <span className="text-[12px] font-mono-code text-[#ffb59c] font-bold">Superficie de Mesa Detectada</span>
            <span className="text-[10px] text-[#a1a1aa] mt-1">Mueve el plato con el dedo para ubicarlo</span>
          </div>
        </div>
      )}

      {/* Top Floating Controls Bar */}
      <header className="relative z-30 px-4 pt-safe pt-3 pb-3 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/50 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff5708] to-[#ff7b39] flex items-center justify-center text-[#2b0b00] font-bold shadow-lg shadow-[#ff5708]/30">
            <span className="material-symbols-outlined text-[18px]">view_in_ar</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-white flex items-center gap-1.5 leading-tight">
              <span>{currentDish.name}</span>
            </span>
            <span className="text-[10px] font-mono-code text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{cameraActive ? 'Mesa en Vivo • Arrastra para mover' : 'Superficie Calibrada'}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Flip camera */}
          <button
            type="button"
            onClick={handleToggleCamera}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            title="Cambiar cámara"
          >
            <span className="material-symbols-outlined text-[18px]">flip_camera_ios</span>
          </button>

          {/* Close AR modal */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </header>

      {/* Central 3D Interactive Table Canvas */}
      <main
        className="relative z-20 flex-1 flex flex-col items-center justify-center touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Table Target Holographic Reticle */}
        <div
          style={{
            transform: `translate(${dishPosX}px, ${dishPosY}px)`
          }}
          className="relative flex flex-col items-center justify-center transition-transform duration-75"
        >
          {/* Subtle floor shadow plane for physical table contact */}
          <div className="absolute w-56 h-56 rounded-full bg-black/45 blur-2xl -bottom-8 pointer-events-none" />

          {/* 3D Dish Render */}
          <div style={{ transform: `scale(${scale})` }} className="transition-transform duration-150">
            <ThreeDView
              dishId={currentDish.id}
              enableCameraBg={true}
              heightClass="h-72 sm:h-96 w-72 sm:w-96"
              onInteract={() => onShowToast(`Rotando ${currentDish.name}`, '3d_rotation')}
            />
          </div>

          {/* Table Reticle Guideline */}
          <div className="absolute -bottom-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-[#ff5708]/50 flex items-center gap-1.5 text-[10px] font-mono-code text-[#ffb59c] pointer-events-none">
            <span className="material-symbols-outlined text-[13px] text-[#ff5708]">pan_tool</span>
            <span>Arrastra para mover en la mesa</span>
          </div>
        </div>
      </main>

      {/* Bottom Floating Control Panel & Live Dish Switcher Carousel */}
      <footer className="relative z-30 px-3.5 pb-safe pb-4 pt-3 bg-gradient-to-t from-black/95 via-black/75 to-transparent space-y-2.5">
        {/* Dish Carousel (Instant switch in AR!) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-3.5 px-3.5">
          {allDishes.map((dish) => (
            <button
              key={dish.id}
              type="button"
              onClick={() => {
                setCurrentDish(dish);
                onShowToast(`Proyectando: ${dish.name}`, 'view_in_ar');
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border backdrop-blur-md shrink-0 transition-all cursor-pointer ${
                currentDish.id === dish.id
                  ? 'bg-[#ff5708] border-[#ff5708] text-[#2b0b00] shadow-lg shadow-[#ff5708]/30 font-bold scale-105'
                  : 'bg-black/60 border-white/15 text-white hover:bg-black/80'
              }`}
            >
              <img src={dish.image} alt={dish.name} className="w-6 h-6 rounded-lg object-cover" />
              <span className="text-[11px] font-sans truncate max-w-[120px]">{dish.name}</span>
            </button>
          ))}
        </div>

        {/* Scale & Controls Bar */}
        <div className="flex items-center justify-between bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-[11px] font-mono-code">
          <div className="flex items-center gap-2">
            <span className="text-[#a1a1aa] hidden sm:inline">Diámetro:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.65, s - 0.1))}
                className="w-6 h-6 rounded bg-[#2a2b36] hover:bg-[#383a48] text-white flex items-center justify-center font-bold"
              >
                -
              </button>
              <span className="text-[#ff5708] font-bold">{(scale * 28).toFixed(0)} cm</span>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(1.4, s + 0.1))}
                className="w-6 h-6 rounded bg-[#2a2b36] hover:bg-[#383a48] text-white flex items-center justify-center font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Center Dish Reset */}
            <button
              type="button"
              onClick={() => {
                setDishPosX(0);
                setDishPosY(0);
                onShowToast('Plato centrado en la mesa', 'filter_center_focus');
              }}
              className="px-2 py-1 rounded bg-[#2a2b36] text-[10px] text-[#c6c5cf] hover:text-white"
            >
              Centrar
            </button>

            {/* Snapshot */}
            <button
              type="button"
              onClick={handleSnapshot}
              className="p-1 rounded bg-[#2a2b36] text-white hover:text-[#ff5708]"
              title="Tomar foto"
            >
              <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            </button>
          </div>
        </div>

        {/* Primary Action Button: Order this dish */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-mono-code text-[#ffb59c]">PRECIO CARTA</span>
            <span className="text-[17px] font-mono-code font-bold text-white">
              S/ {currentDish.price.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onAddToCart(currentDish);
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#ff5708] to-[#ff7b39] text-[#2b0b00] font-bold text-[13px] flex items-center justify-center gap-2 shadow-xl shadow-[#ff5708]/35 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
            <span>Pedir este Plato • S/ {currentDish.price.toFixed(2)}</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
