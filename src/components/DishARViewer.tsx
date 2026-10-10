import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type ARStatus = 'idle' | 'scanning' | 'surface-ready' | 'anchored';

interface DishARViewerProps {
  dishId: string;
  scale: number;
  isCameraActive: boolean;
  onStatusChange?: (label: string) => void;
  onAnchorChange?: (anchored: boolean) => void;
  onShowToast?: (msg: string, icon?: string) => void;
}

const MODEL_TARGET_SIZE: Record<string, number> = {
  'smoked-old-fashioned': 1.0,
  'aji-de-gallina': 1.62,
  'causa-limena': 1.62,
  'esfera-chocolate': 1.35,
  'tartar-nikkei': 1.45,
  'chaufa-wok': 1.66,
  'risotto-porcini': 1.58,
  'lomo-saltado': 1.66,
  'pulpo-brasa': 1.58,
  'wagyu-a5': 1.66,
};

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

function normalizeAngleDelta(current: number, base: number) {
  let delta = current - base;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function createSoftShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 122);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.56)');
    gradient.addColorStop(0.28, 'rgba(0, 0, 0, 0.34)');
    gradient.addColorStop(0.62, 'rgba(0, 0, 0, 0.13)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export const DishARViewer: React.FC<DishARViewerProps> = ({
  dishId,
  scale,
  isCameraActive,
  onStatusChange,
  onAnchorChange,
  onShowToast,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const dishGroupRef = useRef<THREE.Group | null>(null);
  const anchorRef = useRef(false);
  const anchorOffsetRef = useRef({ x: 0, y: 0 });
  const orientationRef = useRef({ alpha: 0, beta: 0, gamma: 0, hasReading: false });
  const anchorOrientationRef = useRef({ alpha: 0, beta: 0, gamma: 0, hasReading: false });
  const manualOrbitRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, pointerId: -1, startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const statusRef = useRef<ARStatus>('idle');
  const modelReadyRef = useRef(false);
  const [status, setStatus] = useState<ARStatus>('idle');
  const [modelReady, setModelReady] = useState(false);

  const updateStatus = (nextStatus: ARStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  };

  const updateModelReady = (ready: boolean) => {
    modelReadyRef.current = ready;
    setModelReady(ready);
  };

  useEffect(() => {
    if (!isCameraActive) {
      anchorRef.current = false;
      anchorOffsetRef.current = { x: 0, y: 0 };
      manualOrbitRef.current = { x: 0, y: 0 };
      updateStatus('idle');
      onAnchorChange?.(false);
      onStatusChange?.('Esperando cámara');
      return;
    }

    anchorRef.current = false;
    anchorOffsetRef.current = { x: 0, y: 0 };
    updateStatus('scanning');
    onAnchorChange?.(false);
    onStatusChange?.('Buscando superficie');
    const timer = window.setTimeout(() => {
      if (statusRef.current === 'scanning') {
        updateStatus('surface-ready');
        onStatusChange?.('Superficie detectada');
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [isCameraActive, onAnchorChange, onStatusChange]);

  useEffect(() => {
    const onOrientation = (event: DeviceOrientationEvent) => {
      orientationRef.current = {
        alpha: event.alpha ?? 0,
        beta: event.beta ?? 0,
        gamma: event.gamma ?? 0,
        hasReading: event.alpha !== null || event.beta !== null || event.gamma !== null,
      };
    };

    window.addEventListener('deviceorientation', onOrientation, true);
    return () => window.removeEventListener('deviceorientation', onOrientation, true);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let active = true;
    let frame = 0;
    updateModelReady(false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, 0.01, 100);
    camera.position.set(0, 1.28, 3.25);
    camera.lookAt(0, 0.18, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = 'h-full w-full';

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(renderer.domElement);

    const root = new THREE.Group();
    root.position.set(0, -0.7, -2.12);
    root.rotation.x = -0.03;
    scene.add(root);

    const dishGroup = new THREE.Group();
    dishGroup.visible = false;
    dishGroupRef.current = dishGroup;
    root.add(dishGroup);

    const ambientLight = new THREE.HemisphereLight(0xfff3df, 0x1a1f2d, 2.05);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffecd2, 3.15);
    keyLight.position.set(2.8, 4.8, 2.4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.2;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.radius = 3.5;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x7fb5ff, 0.72);
    fillLight.position.set(-2.6, 1.9, 2.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff6a1a, 1.28);
    rimLight.position.set(-3.6, 2.2, -2.4);
    scene.add(rimLight);

    const softShadowTexture = createSoftShadowTexture();
    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.18, 96),
      new THREE.MeshBasicMaterial({
        map: softShadowTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.scale.set(1.35, 0.5, 1);
    contactShadow.position.set(0.02, -0.012, 0.06);
    root.add(contactShadow);

    const anchorRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6a1a,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const anchorRing = new THREE.Mesh(new THREE.RingGeometry(0.86, 0.89, 112), anchorRingMaterial);
    anchorRing.rotation.x = -Math.PI / 2;
    anchorRing.position.y = 0.004;
    root.add(anchorRing);

    const innerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const innerRing = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.45, 96), innerRingMaterial);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.006;
    root.add(innerRing);

    const loader = new GLTFLoader();
    loader.load(
      `/models-ar/${dishId}.glb`,
      (gltf) => {
        if (!active) {
          disposeObject(gltf.scene);
          return;
        }

        const model = gltf.scene;
        model.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const material = mesh.material;
          const materials = Array.isArray(material) ? material : [material];
          materials.forEach((mat) => {
            if (!mat) return;
            mat.side = THREE.FrontSide;
            mat.needsUpdate = true;
            if ('envMapIntensity' in mat) {
              (mat as THREE.MeshStandardMaterial).envMapIntensity = 0.72;
            }
          });
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetSize = MODEL_TARGET_SIZE[dishId] ?? 1.52;
        model.scale.setScalar(targetSize / maxDim);

        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.y -= box.min.y;
        model.position.z -= center.z;

        dishGroup.add(model);
        updateModelReady(true);
      },
      undefined,
      (error) => {
        console.error(`No se pudo cargar el modelo AR ${dishId}`, error);
        updateModelReady(true);
      }
    );

    const resize = () => {
      const width = container.clientWidth || window.innerWidth || 360;
      const height = container.clientHeight || window.innerHeight || 640;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    window.addEventListener('resize', resize);

    const targetScaleVector = new THREE.Vector3(1, 1, 1);
    const defaultCameraPosition = new THREE.Vector3(0, 1.28, 3.25);
    const defaultLookTarget = new THREE.Vector3(0, 0.18, 0);
    const anchoredLookTarget = new THREE.Vector3();
    const desiredCameraPosition = new THREE.Vector3();

    const animate = () => {
      if (!active) return;
      frame = window.requestAnimationFrame(animate);

      const anchored = anchorRef.current;
      const anchorOffset = anchorOffsetRef.current;
      const currentOrientation = orientationRef.current;
      const anchorOrientation = anchorOrientationRef.current;
      const targetScale = Math.max(0.48, Math.min(1.34, scale));

      targetScaleVector.set(targetScale, targetScale, targetScale);
      root.scale.lerp(targetScaleVector, 0.12);

      const targetX = anchored ? anchorOffset.x * 1.08 : 0;
      const targetY = anchored ? -0.7 : -0.68;
      const targetZ = anchored ? -2.12 + anchorOffset.y * 0.42 : -2.12;
      root.position.x += (targetX - root.position.x) * 0.08;
      root.position.y += (targetY - root.position.y) * 0.075;
      root.position.z += (targetZ - root.position.z) * 0.075;
      root.rotation.y += (0 - root.rotation.y) * 0.08;

      if (anchored) {
        const yawDelta = currentOrientation.hasReading && anchorOrientation.hasReading
          ? normalizeAngleDelta(currentOrientation.alpha, anchorOrientation.alpha)
          : 0;
        const gammaDelta = currentOrientation.hasReading && anchorOrientation.hasReading
          ? currentOrientation.gamma - anchorOrientation.gamma
          : 0;
        const betaDelta = currentOrientation.hasReading && anchorOrientation.hasReading
          ? currentOrientation.beta - anchorOrientation.beta
          : 0;
        const sensorOrbitX = THREE.MathUtils.clamp((yawDelta * 0.65 + gammaDelta * 1.05) / 58, -0.95, 0.95);
        const sensorOrbitY = THREE.MathUtils.clamp(betaDelta / 62, -0.42, 0.48);
        const manualOrbit = manualOrbitRef.current;
        const orbitX = THREE.MathUtils.clamp(sensorOrbitX + manualOrbit.x, -1.08, 1.08);
        const orbitY = THREE.MathUtils.clamp(sensorOrbitY + manualOrbit.y, -0.52, 0.56);
        const orbitRadius = 5.34;

        anchoredLookTarget.set(root.position.x, root.position.y + 0.28, root.position.z + 0.02);
        desiredCameraPosition.set(
          anchoredLookTarget.x + Math.sin(orbitX) * orbitRadius,
          anchoredLookTarget.y + 1.78 - orbitY * 0.92,
          anchoredLookTarget.z + Math.cos(orbitX) * orbitRadius
        );
        camera.position.lerp(desiredCameraPosition, 0.075);
        camera.lookAt(anchoredLookTarget);
      } else {
        camera.position.lerp(defaultCameraPosition, 0.08);
        camera.lookAt(defaultLookTarget);
      }

      if (!anchored) {
        anchorRing.visible = isCameraActive;
        innerRing.visible = isCameraActive;
        dishGroup.visible = false;
        anchorRing.rotation.z += 0.012;
        innerRing.rotation.z -= 0.008;
        const surfaceReady = statusRef.current === 'surface-ready';
        anchorRingMaterial.opacity = surfaceReady ? 0.38 : 0.22;
        innerRingMaterial.opacity = surfaceReady ? 0.14 : 0.08;
        (contactShadow.material as THREE.MeshBasicMaterial).opacity += (0 - (contactShadow.material as THREE.MeshBasicMaterial).opacity) * 0.16;
      } else {
        dishGroup.visible = modelReadyRef.current;
        anchorRing.visible = true;
        innerRing.visible = true;
        anchorRingMaterial.opacity += (0.055 - anchorRingMaterial.opacity) * 0.12;
        innerRingMaterial.opacity += (0.035 - innerRingMaterial.opacity) * 0.12;
        (contactShadow.material as THREE.MeshBasicMaterial).opacity += (0.58 - (contactShadow.material as THREE.MeshBasicMaterial).opacity) * 0.1;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      disposeObject(scene);
      softShadowTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      dishGroupRef.current = null;
    };
  }, [dishId, scale, isCameraActive]);

  const anchorDish = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isCameraActive || status === 'idle' || status === 'anchored') return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) - 0.5;
    const y = ((event.clientY - rect.top) / rect.height) - 0.54;
    anchorOffsetRef.current = {
      x: THREE.MathUtils.clamp(x, -0.36, 0.36),
      y: THREE.MathUtils.clamp(y, -0.22, 0.24),
    };

    anchorOrientationRef.current = { ...orientationRef.current };
    manualOrbitRef.current = { x: 0, y: 0 };
    anchorRef.current = true;
    updateStatus('anchored');
    onAnchorChange?.(true);
    onStatusChange?.('Plato fijado');
    onShowToast?.('Plato colocado sobre la mesa', 'view_in_ar');
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (status !== 'anchored') return;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: manualOrbitRef.current.x,
      baseY: manualOrbitRef.current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - drag.startX) / Math.max(rect.width, 1);
    const dy = (event.clientY - drag.startY) / Math.max(rect.height, 1);
    manualOrbitRef.current = {
      x: THREE.MathUtils.clamp(drag.baseX + dx * 1.95, -0.72, 0.72),
      y: THREE.MathUtils.clamp(drag.baseY + dy * 1.35, -0.36, 0.36),
    };
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId === event.pointerId) {
      dragRef.current = { active: false, pointerId: -1, startX: 0, startY: 0, baseX: manualOrbitRef.current.x, baseY: manualOrbitRef.current.y };
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  };

  const statusText = status === 'anchored'
    ? 'Plato fijo en mesa: muévete alrededor o arrastra para verlo 360°'
    : status === 'surface-ready'
      ? 'Toca la mesa para colocar el plato'
      : status === 'scanning'
        ? 'Apunta a una mesa y muévete lento'
        : 'Activa la cámara para iniciar AR';

  return (
    <button
      type="button"
      onClick={anchorDish}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      disabled={!isCameraActive || status === 'idle'}
      className="absolute inset-0 z-10 block h-full w-full cursor-crosshair overflow-hidden bg-transparent text-left disabled:cursor-default"
      aria-label="Detectar superficie y anclar plato 3D"
    >
      <div ref={mountRef} className="absolute inset-0 pointer-events-none" />

      {isCameraActive && status !== 'anchored' && (
        <div className="pointer-events-none absolute left-1/2 top-[48%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
          <div className="relative h-28 w-28 rounded-full border border-[#ff5708]/60 bg-[#ff5708]/5 shadow-[0_0_32px_rgba(255,87,8,0.22)]">
            <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff5708] shadow-[0_0_18px_rgba(255,87,8,0.9)]" />
            <span className="absolute inset-5 rounded-full border border-dashed border-white/28" />
            <span className="absolute -left-4 top-1/2 h-px w-8 bg-[#ff5708]/60" />
            <span className="absolute -right-4 top-1/2 h-px w-8 bg-[#ff5708]/60" />
            <span className="absolute -top-4 left-1/2 h-8 w-px bg-[#ff5708]/60" />
            <span className="absolute -bottom-4 left-1/2 h-8 w-px bg-[#ff5708]/60" />
          </div>
          <div className="max-w-[270px] rounded-2xl border border-[#ff5708]/40 bg-black/68 px-4 py-3 text-center text-white shadow-2xl backdrop-blur-md">
            <p className="text-[12px] font-black leading-snug">{statusText}</p>
            <p className="mt-1 text-[10px] leading-snug text-white/65">
              {modelReady ? 'Cuando lo toques, el plato quedará fijado ahí.' : 'Cargando plato 3D...'}
            </p>
          </div>
        </div>
      )}

      {isCameraActive && status === 'anchored' && (
        <div className="pointer-events-none absolute left-1/2 top-[14%] max-w-[310px] -translate-x-1/2 rounded-full border border-emerald-400/30 bg-black/48 px-4 py-2 text-center text-[11px] font-bold text-emerald-200 shadow-xl backdrop-blur-md">
          {statusText}
        </div>
      )}
    </button>
  );
};

