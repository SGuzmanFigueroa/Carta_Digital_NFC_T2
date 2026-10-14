'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getArDishDimensionCm } from '@/config/arDishProfiles';

type XRNavigator = Navigator & {
  xr?: XRSystem;
};

interface WebXRDishLauncherProps {
  dishId: string;
  scale: number;
  isCameraActive: boolean;
  isAnchored: boolean;
  onStatusChange?: (label: string) => void;
  onShowToast?: (msg: string, icon?: string) => void;
  onAvailabilityChange?: (available: boolean) => void;
  onBeforeStart?: () => void;
  onSessionEnd?: () => void;
}

type WebXRProfile = {
  yBias: number;
  shadow: [number, number, number];
};

const WEBXR_PROFILE_BY_DISH: Record<string, WebXRProfile> = {
  'smoked-old-fashioned': { yBias: 0, shadow: [0.16, 0.1, 0.32] },
  'aji-de-gallina': { yBias: 0, shadow: [0.3, 0.15, 0.48] },
  'causa-limena': { yBias: 0.004, shadow: [0.24, 0.12, 0.44] },
  'esfera-chocolate': { yBias: 0, shadow: [0.22, 0.11, 0.42] },
  'tartar-nikkei': { yBias: 0, shadow: [0.24, 0.12, 0.44] },
  'chaufa-wok': { yBias: 0, shadow: [0.31, 0.15, 0.5] },
  'risotto-porcini': { yBias: 0, shadow: [0.3, 0.14, 0.48] },
  'lomo-saltado': { yBias: 0, shadow: [0.32, 0.15, 0.52] },
  'pulpo-brasa': { yBias: 0, shadow: [0.31, 0.15, 0.5] },
  'wagyu-a5': { yBias: 0, shadow: [0.33, 0.16, 0.52] },
};

const DEFAULT_WEBXR_PROFILE: WebXRProfile = { yBias: 0, shadow: [0.28, 0.14, 0.46] };

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((mat) => mat.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

function createContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createRadialGradient(192, 192, 8, 192, 192, 176);
    gradient.addColorStop(0, 'rgba(0,0,0,0.68)');
    gradient.addColorStop(0.22, 'rgba(0,0,0,0.45)');
    gradient.addColorStop(0.55, 'rgba(0,0,0,0.16)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 384, 384);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createWebXRReticle() {
  const group = new THREE.Group();
  group.matrixAutoUpdate = true;
  group.visible = false;

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6a1a,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.105, 0.112, 96), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  const innerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const inner = new THREE.Mesh(new THREE.RingGeometry(0.034, 0.036, 72), innerMaterial);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.002;
  group.add(inner);

  const dotMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6a1a,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 32), dotMaterial);
  dot.rotation.x = -Math.PI / 2;
  dot.position.y = 0.003;
  group.add(dot);

  return { group, ringMaterial, innerMaterial, dotMaterial };
}

function loadDishModel(dishId: string, profile: WebXRProfile, scale: number) {
  const loader = new GLTFLoader();
  const calibratedScale = THREE.MathUtils.clamp(scale, 0.7, 1.3);
  const modelSizeMeters = getArDishDimensionCm(dishId) / 100;

  return new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      `/models-ar/${dishId}.glb`,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;

          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            if (!mat) return;
            mat.side = THREE.FrontSide;
            mat.needsUpdate = true;
            const standardMat = mat as THREE.MeshStandardMaterial;
            if (standardMat.map) {
              standardMat.map.colorSpace = THREE.SRGBColorSpace;
              standardMat.map.needsUpdate = true;
            }
            if ('envMapIntensity' in standardMat) {
              standardMat.envMapIntensity = Math.max(standardMat.envMapIntensity || 0, 0.92);
            }
            if ('roughness' in standardMat && typeof standardMat.roughness === 'number') {
              standardMat.roughness = THREE.MathUtils.clamp(standardMat.roughness, 0.38, 0.88);
            }
            if ('metalness' in standardMat && typeof standardMat.metalness === 'number') {
              standardMat.metalness = Math.min(0.18, standardMat.metalness);
            }
          });
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.scale.setScalar((modelSizeMeters * calibratedScale) / maxDim);

        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.y -= box.min.y - profile.yBias;
        model.position.z -= center.z;

        const group = new THREE.Group();
        group.add(model);
        resolve(group);
      },
      undefined,
      reject
    );
  });
}

export const WebXRDishLauncher: React.FC<WebXRDishLauncherProps> = ({
  dishId,
  scale,
  isCameraActive,
  isAnchored,
  onStatusChange,
  onShowToast,
  onAvailabilityChange,
  onBeforeStart,
  onSessionEnd,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [webXRSupported, setWebXRSupported] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'ready' | 'placed'>('idle');
  const [wasUnsupported, setWasUnsupported] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const detectWebXR = async () => {
      setIsChecking(true);
      const xr = (navigator as XRNavigator).xr;
      if (!xr?.isSessionSupported) {
        if (!cancelled) {
          setWebXRSupported(false);
          setWasUnsupported(true);
          onAvailabilityChange?.(false);
          setIsChecking(false);
        }
        return;
      }

      try {
        const supported = await xr.isSessionSupported('immersive-ar');
        if (!cancelled) {
          setWebXRSupported(supported);
          setWasUnsupported(!supported);
          onAvailabilityChange?.(supported);
          setIsChecking(false);
        }
      } catch {
        if (!cancelled) {
          setWebXRSupported(false);
          setWasUnsupported(true);
          onAvailabilityChange?.(false);
          setIsChecking(false);
        }
      }
    };

    detectWebXR();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [onAvailabilityChange]);

  const startRealWebXR = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const xr = (navigator as XRNavigator).xr;
    if (!xr?.requestSession || !hostRef.current) {
      setWasUnsupported(true);
      onAvailabilityChange?.(false);
      onStatusChange?.('Modo asistido listo');
      onShowToast?.('AR real no está disponible; usa el visor asistido', 'info');
      return;
    }

    setIsLaunching(true);
    setPhase('scanning');
    onStatusChange?.('Preparando AR real');

    let renderer: THREE.WebGLRenderer | null = null;
    let session: XRSession | null = null;
    let hitTestSource: XRHitTestSource | null = null;
    let hitTestSourceRequested = false;
    let placed = false;
    let surfaceDetected = false;
    let scanFallbackTimer: number | null = null;
    let disposed = false;

    try {
      onBeforeStart?.();

      const profile = WEBXR_PROFILE_BY_DISH[dishId] ?? DEFAULT_WEBXR_PROFILE;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / Math.max(window.innerHeight, 1), 0.01, 30);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType('local');
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.position = 'fixed';
      renderer.domElement.style.inset = '0';
      renderer.domElement.style.zIndex = '70';
      renderer.domElement.style.width = '100dvw';
      renderer.domElement.style.height = '100dvh';
      renderer.domElement.style.pointerEvents = 'none';
      hostRef.current.appendChild(renderer.domElement);

      const ambient = new THREE.HemisphereLight(0xfff4df, 0x1b2430, 1.68);
      scene.add(ambient);

      const keyLight = new THREE.DirectionalLight(0xffe0bd, 3.1);
      keyLight.position.set(1.8, 3.6, 2.2);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.00008;
      keyLight.shadow.normalBias = 0.016;
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x8fbaff, 0.72);
      fillLight.position.set(-2.4, 1.6, 1.4);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0xff6a1a, 1.1);
      rimLight.position.set(-1.8, 2.2, -1.8);
      scene.add(rimLight);

      const dishRoot = new THREE.Group();
      dishRoot.visible = false;
      scene.add(dishRoot);

      const shadowTexture = createContactShadowTexture();
      const shadowMaterial = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: profile.shadow[2],
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 96), shadowMaterial);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.002;
      shadow.scale.set(profile.shadow[0], profile.shadow[1], 1);
      dishRoot.add(shadow);

      const dishModel = await loadDishModel(dishId, profile, scale);
      dishRoot.add(dishModel);

      const reticle = createWebXRReticle();
      scene.add(reticle.group);

      cleanupRef.current = () => {
        if (disposed) return;
        disposed = true;
        renderer?.setAnimationLoop(null);
        if (scanFallbackTimer !== null) {
          window.clearTimeout(scanFallbackTimer);
          scanFallbackTimer = null;
        }
        hitTestSource?.cancel?.();
        disposeObject(scene);
        shadowTexture.dispose();
        reticle.ringMaterial.dispose();
        reticle.innerMaterial.dispose();
        reticle.dotMaterial.dispose();
        renderer?.dispose();
        if (renderer?.domElement.parentElement) {
          renderer.domElement.parentElement.removeChild(renderer.domElement);
        }
      };

      const sessionInit = {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['local-floor', 'dom-overlay'],
        domOverlay: overlayRef.current ? { root: overlayRef.current } : undefined,
      } as XRSessionInit & { domOverlay?: { root: Element } };

      session = await xr.requestSession('immersive-ar', sessionInit);
      session.addEventListener('end', () => {
        if (scanFallbackTimer !== null) {
          window.clearTimeout(scanFallbackTimer);
          scanFallbackTimer = null;
        }
        cleanupRef.current?.();
        cleanupRef.current = null;
        setIsPresenting(false);
        setIsLaunching(false);
        setPhase('idle');
        onSessionEnd?.();
        onStatusChange?.('AR cerrado');
      });
      session.addEventListener('select', () => {
        if (!reticle.group.visible || placed) return;
        placed = true;
        dishRoot.visible = true;
        dishRoot.matrix.copy(reticle.group.matrix);
        dishRoot.matrix.decompose(dishRoot.position, dishRoot.quaternion, dishRoot.scale);
        reticle.group.visible = false;
        setPhase('placed');
        onStatusChange?.('Plato colocado en AR real');
        onShowToast?.('Plato fijo sobre la mesa: muévete alrededor', 'check_circle');
      });

      await renderer.xr.setSession(session);
      setIsPresenting(true);
      setIsLaunching(false);
      setPhase('scanning');
      onStatusChange?.('Busca una mesa');
      onShowToast?.('Mueve el celular hasta detectar la mesa y toca para colocar', 'view_in_ar');

      scanFallbackTimer = window.setTimeout(() => {
        if (placed || surfaceDetected || !session) return;
        setWasUnsupported(true);
        onAvailabilityChange?.(false);
        onStatusChange?.('Modo asistido listo');
        onShowToast?.('No se detectó la mesa con AR real; usa el modo asistido', 'info');
        void session.end();
      }, 12000);

      renderer.setAnimationLoop((_, frame) => {
        if (!frame || !renderer) return;

        const referenceSpace = renderer.xr.getReferenceSpace();
        const currentSession = renderer.xr.getSession();
        if (!referenceSpace || !currentSession) return;

        if (!hitTestSourceRequested) {
          hitTestSourceRequested = true;
          currentSession.requestReferenceSpace('viewer')
            .then((viewerSpace) => currentSession.requestHitTestSource?.({ space: viewerSpace }))
            .then((source) => {
              hitTestSource = source ?? null;
              onStatusChange?.('Buscando superficie');
            })
            .catch((error) => {
              console.warn('No se pudo iniciar hit-test WebXR', error);
              onStatusChange?.('No se detectó la mesa');
            });
        }

        if (!placed && hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);
          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);
            if (pose) {
              surfaceDetected = true;
              if (scanFallbackTimer !== null) {
                window.clearTimeout(scanFallbackTimer);
                scanFallbackTimer = null;
              }
              reticle.group.visible = true;
              reticle.group.matrix.fromArray(pose.transform.matrix);
              reticle.group.matrix.decompose(reticle.group.position, reticle.group.quaternion, reticle.group.scale);
              reticle.group.rotation.z += 0.018;
              const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.035;
              reticle.group.scale.setScalar(pulse);
              setPhase((current) => current === 'ready' ? current : 'ready');
            }
          } else {
            reticle.group.visible = false;
          }
        }

        if (placed) {
          dishRoot.rotation.y += (0 - dishRoot.rotation.y) * 0.02;
        }

        renderer.render(scene, camera);
      });
    } catch (error) {
      console.warn('No se pudo iniciar WebXR real', error);
      cleanupRef.current?.();
      cleanupRef.current = null;
      setIsLaunching(false);
      setIsPresenting(false);
      setWasUnsupported(true);
      setPhase('idle');
      onAvailabilityChange?.(false);
      onStatusChange?.('Modo asistido listo');
      onShowToast?.('Este celular no inició AR real; usa el visor asistido', 'info');
    }
  };

  if (isAnchored || wasUnsupported || (!webXRSupported && !isChecking)) return null;

  const phaseLabel = phase === 'placed'
    ? 'Plato fijo: muévete alrededor'
    : phase === 'ready'
      ? 'Mesa detectada: toca para colocar'
      : phase === 'scanning'
        ? 'Buscando superficie real'
        : isCameraActive
          ? 'Listo para AR real'
          : 'AR real disponible';

  return (
    <div ref={hostRef} className="absolute inset-0 z-30 pointer-events-none">
      <div ref={overlayRef} className="fixed inset-0 z-[80] pointer-events-none">
        {isPresenting && (
          <div className="absolute left-1/2 top-[calc(env(safe-area-inset-top,0px)+18px)] w-[min(360px,calc(100vw-32px))] -translate-x-1/2 rounded-full border border-white/15 bg-black/52 px-4 py-2 text-center text-[12px] font-black text-white shadow-2xl backdrop-blur-md">
            {phaseLabel}
          </div>
        )}
      </div>

      {!isPresenting && (
        <div className="absolute left-1/2 top-[22%] w-[min(330px,calc(100vw-32px))] -translate-x-1/2 pointer-events-auto">
          <div className="rounded-2xl border border-[#ff5708]/42 bg-black/66 p-3 text-white shadow-2xl backdrop-blur-md">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined mt-0.5 text-[22px] text-[#ff5708]">view_in_ar</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black leading-snug">AR real de mesa</p>
                <p className="mt-1 text-[10px] leading-snug text-white/68">
                  Detecta la superficie y deja el plato fijo para verlo como en mesa real.
                </p>
                <button
                  type="button"
                  onClick={startRealWebXR}
                  disabled={isChecking || isLaunching || !webXRSupported}
                  className="mt-2 min-h-[40px] rounded-xl bg-[#ff5708] px-3.5 py-2 text-[12px] font-black text-[#2b0b00] shadow-lg transition active:scale-95 disabled:cursor-wait disabled:opacity-65"
                >
                  {isLaunching ? 'Abriendo AR real...' : isChecking ? 'Comprobando AR...' : 'Colocar con AR real'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


