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
  'smoked-old-fashioned': 1.05,
  'aji-de-gallina': 1.75,
  'causa-limena': 1.75,
  'esfera-chocolate': 1.45,
  'tartar-nikkei': 1.55,
  'chaufa-wok': 1.8,
  'risotto-porcini': 1.7,
  'lomo-saltado': 1.8,
  'pulpo-brasa': 1.7,
  'wagyu-a5': 1.8,
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
  const orientationRef = useRef({ beta: 0, gamma: 0 });
  const [status, setStatus] = useState<ARStatus>('idle');
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    if (!isCameraActive) {
      anchorRef.current = false;
      setStatus('idle');
      onAnchorChange?.(false);
      onStatusChange?.('Esperando cámara');
      return;
    }

    anchorRef.current = false;
    setStatus('scanning');
    onAnchorChange?.(false);
    onStatusChange?.('Buscando superficie');
    const timer = window.setTimeout(() => {
      setStatus((current) => (current === 'scanning' ? 'surface-ready' : current));
      onStatusChange?.('Superficie detectada');
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [isCameraActive, onAnchorChange, onStatusChange]);

  useEffect(() => {
    const onOrientation = (event: DeviceOrientationEvent) => {
      orientationRef.current = {
        beta: event.beta ?? 0,
        gamma: event.gamma ?? 0,
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
    setModelReady(false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 100);
    camera.position.set(0, 1.35, 3.15);
    camera.lookAt(0, 0.28, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = 'h-full w-full';

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(renderer.domElement);

    const root = new THREE.Group();
    root.position.set(0, -0.48, -0.95);
    scene.add(root);

    const dishGroup = new THREE.Group();
    dishGroupRef.current = dishGroup;
    root.add(dishGroup);

    const ambientLight = new THREE.HemisphereLight(0xfff3dd, 0x1d1f2a, 2.15);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff0d6, 3.4);
    keyLight.position.set(2.8, 5, 2.6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff6a1a, 1.7);
    rimLight.position.set(-3.6, 2.2, -2.5);
    scene.add(rimLight);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.75, 72),
      new THREE.ShadowMaterial({ opacity: 0.34 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.01;
    shadow.receiveShadow = true;
    root.add(shadow);

    const anchorRing = new THREE.Mesh(
      new THREE.RingGeometry(1.46, 1.5, 96),
      new THREE.MeshBasicMaterial({ color: 0xff5708, transparent: true, opacity: 0.42, side: THREE.DoubleSide })
    );
    anchorRing.rotation.x = -Math.PI / 2;
    anchorRing.position.y = 0.006;
    root.add(anchorRing);

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
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetSize = MODEL_TARGET_SIZE[dishId] ?? 1.65;
        model.scale.setScalar(targetSize / maxDim);

        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.y -= box.min.y;
        model.position.z -= center.z;

        dishGroup.add(model);
        setModelReady(true);
      },
      undefined,
      (error) => {
        console.error(`No se pudo cargar el modelo AR ${dishId}`, error);
        setModelReady(true);
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

    const animate = () => {
      if (!active) return;
      frame = window.requestAnimationFrame(animate);

      const deviceTiltX = THREE.MathUtils.clamp(orientationRef.current.gamma / 45, -0.55, 0.55);
      const deviceTiltY = THREE.MathUtils.clamp((orientationRef.current.beta - 55) / 55, -0.45, 0.45);
      const anchored = anchorRef.current;
      const targetScale = Math.max(0.55, Math.min(1.55, scale));

      root.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
      root.position.x += (((anchored ? -deviceTiltX * 0.18 : 0) - root.position.x) * 0.045);
      root.position.z += (((anchored ? -0.95 + deviceTiltY * 0.16 : -0.95) - root.position.z) * 0.045);

      if (!anchored) {
        dishGroup.rotation.y += 0.006;
        anchorRing.rotation.z += 0.01;
        anchorRing.visible = isCameraActive;
        dishGroup.visible = isCameraActive;
      } else {
        dishGroup.rotation.y *= 0.98;
        anchorRing.visible = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      disposeObject(scene);
      shadow.geometry.dispose();
      (shadow.material as THREE.Material).dispose();
      anchorRing.geometry.dispose();
      (anchorRing.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      dishGroupRef.current = null;
    };
  }, [dishId, scale, isCameraActive]);

  const anchorDish = () => {
    if (!isCameraActive || status === 'idle') return;
    anchorRef.current = true;
    setStatus('anchored');
    onAnchorChange?.(true);
    onStatusChange?.('Plato anclado en mesa');
    onShowToast?.('Plato fijado sobre la superficie detectada', 'view_in_ar');
  };

  const statusText = status === 'anchored'
    ? 'Plato anclado: muévete alrededor para verlo'
    : status === 'surface-ready'
      ? 'Superficie detectada: toca la mesa para fijar el plato'
      : status === 'scanning'
        ? 'Mueve el celular lento hacia una mesa plana'
        : 'Activa la cámara para iniciar AR';

  return (
    <button
      type="button"
      onClick={anchorDish}
      disabled={!isCameraActive || status === 'idle'}
      className="absolute inset-0 z-10 block h-full w-full cursor-crosshair overflow-hidden bg-transparent text-left disabled:cursor-default"
      aria-label="Detectar superficie y anclar plato 3D"
    >
      <div ref={mountRef} className="absolute inset-0 pointer-events-none" />

      {isCameraActive && status !== 'anchored' && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
          <div className="relative h-40 w-40 rounded-full border border-[#ff5708]/70 bg-[#ff5708]/5 shadow-[0_0_36px_rgba(255,87,8,0.26)]">
            <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff5708] shadow-[0_0_18px_rgba(255,87,8,0.9)]" />
            <span className="absolute inset-6 rounded-full border border-dashed border-white/35" />
            <span className="absolute -left-5 top-1/2 h-px w-10 bg-[#ff5708]/70" />
            <span className="absolute -right-5 top-1/2 h-px w-10 bg-[#ff5708]/70" />
            <span className="absolute -top-5 left-1/2 h-10 w-px bg-[#ff5708]/70" />
            <span className="absolute -bottom-5 left-1/2 h-10 w-px bg-[#ff5708]/70" />
          </div>
          <div className="max-w-[280px] rounded-2xl border border-[#ff5708]/45 bg-black/72 px-4 py-3 text-center text-white shadow-2xl backdrop-blur-md">
            <p className="text-[12px] font-black leading-snug">{statusText}</p>
            <p className="mt-1 text-[10px] leading-snug text-white/65">
              {modelReady ? 'El visor está preparado para reemplazar este GLB por modelos RealityScan.' : 'Cargando plato 3D...'}
            </p>
          </div>
        </div>
      )}

      {isCameraActive && status === 'anchored' && (
        <div className="pointer-events-none absolute left-1/2 top-[18%] max-w-[300px] -translate-x-1/2 rounded-full border border-emerald-400/35 bg-black/55 px-4 py-2 text-center text-[11px] font-bold text-emerald-200 shadow-xl backdrop-blur-md">
          {statusText}
        </div>
      )}
    </button>
  );
};
