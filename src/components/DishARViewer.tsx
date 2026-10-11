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
  preferRealAR?: boolean;
}

type DishARProfile = {
  targetSize: number;
  heightBias: number;
  shadowScale: [number, number];
  shadowOpacity: number;
  orbitRadius: number;
  cameraHeight: number;
};

const DEFAULT_MODEL_PROFILE: DishARProfile = {
  targetSize: 1.52,
  heightBias: 0,
  shadowScale: [1.42, 0.54],
  shadowOpacity: 0.54,
  orbitRadius: 4.8,
  cameraHeight: 1.64,
};

const MODEL_PROFILES: Record<string, DishARProfile> = {
  'smoked-old-fashioned': {
    targetSize: 1.0,
    heightBias: 0,
    shadowScale: [0.84, 0.5],
    shadowOpacity: 0.46,
    orbitRadius: 4.15,
    cameraHeight: 1.42,
  },
  'aji-de-gallina': {
    targetSize: 1.62,
    heightBias: 0,
    shadowScale: [1.48, 0.56],
    shadowOpacity: 0.58,
    orbitRadius: 4.85,
    cameraHeight: 1.62,
  },
  'causa-limena': {
    targetSize: 1.62,
    heightBias: 0.01,
    shadowScale: [1.34, 0.5],
    shadowOpacity: 0.52,
    orbitRadius: 4.65,
    cameraHeight: 1.55,
  },
  'esfera-chocolate': {
    targetSize: 1.35,
    heightBias: 0,
    shadowScale: [1.18, 0.48],
    shadowOpacity: 0.5,
    orbitRadius: 4.45,
    cameraHeight: 1.5,
  },
  'tartar-nikkei': {
    targetSize: 1.45,
    heightBias: 0,
    shadowScale: [1.3, 0.5],
    shadowOpacity: 0.54,
    orbitRadius: 4.55,
    cameraHeight: 1.54,
  },
  'chaufa-wok': {
    targetSize: 1.66,
    heightBias: 0,
    shadowScale: [1.52, 0.58],
    shadowOpacity: 0.58,
    orbitRadius: 4.9,
    cameraHeight: 1.64,
  },
  'risotto-porcini': {
    targetSize: 1.58,
    heightBias: 0,
    shadowScale: [1.44, 0.54],
    shadowOpacity: 0.56,
    orbitRadius: 4.72,
    cameraHeight: 1.58,
  },
  'lomo-saltado': {
    targetSize: 1.66,
    heightBias: 0,
    shadowScale: [1.54, 0.58],
    shadowOpacity: 0.6,
    orbitRadius: 4.9,
    cameraHeight: 1.62,
  },
  'pulpo-brasa': {
    targetSize: 1.58,
    heightBias: 0,
    shadowScale: [1.48, 0.55],
    shadowOpacity: 0.58,
    orbitRadius: 4.78,
    cameraHeight: 1.6,
  },
  'wagyu-a5': {
    targetSize: 1.66,
    heightBias: 0,
    shadowScale: [1.56, 0.57],
    shadowOpacity: 0.6,
    orbitRadius: 4.95,
    cameraHeight: 1.62,
  },
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
  canvas.width = 384;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createRadialGradient(192, 192, 10, 192, 192, 176);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
    gradient.addColorStop(0.2, 'rgba(0, 0, 0, 0.42)');
    gradient.addColorStop(0.52, 'rgba(0, 0, 0, 0.16)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 384, 384);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createAmbientEnvironmentTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#fff1d8');
    sky.addColorStop(0.38, '#cfd8e8');
    sky.addColorStop(0.72, '#332823');
    sky.addColorStop(1, '#0f1116');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 256);

    const warmSpot = ctx.createRadialGradient(380, 62, 0, 380, 62, 190);
    warmSpot.addColorStop(0, 'rgba(255, 220, 170, 0.95)');
    warmSpot.addColorStop(0.36, 'rgba(255, 132, 64, 0.36)');
    warmSpot.addColorStop(1, 'rgba(255, 132, 64, 0)');
    ctx.fillStyle = warmSpot;
    ctx.fillRect(0, 0, 512, 256);

    const coolSpot = ctx.createRadialGradient(110, 120, 0, 110, 120, 180);
    coolSpot.addColorStop(0, 'rgba(125, 175, 255, 0.42)');
    coolSpot.addColorStop(1, 'rgba(125, 175, 255, 0)');
    ctx.fillStyle = coolSpot;
    ctx.fillRect(0, 0, 512, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}

async function requestDeviceOrientationAccess() {
  if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') return;

  const orientationEvent = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<PermissionState>;
  };

  if (typeof orientationEvent.requestPermission !== 'function') return;

  try {
    await orientationEvent.requestPermission();
  } catch {
    // Si el navegador no concede sensores, el visor sigue funcionando con arrastre manual.
  }
}

export const DishARViewer: React.FC<DishARViewerProps> = ({
  dishId,
  scale,
  isCameraActive,
  onStatusChange,
  onAnchorChange,
  onShowToast,
  preferRealAR = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const dishGroupRef = useRef<THREE.Group | null>(null);
  const anchorRef = useRef(false);
  const anchorProgressRef = useRef(0);
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
      anchorProgressRef.current = 0;
      anchorOffsetRef.current = { x: 0, y: 0 };
      manualOrbitRef.current = { x: 0, y: 0 };
      updateStatus('idle');
      onAnchorChange?.(false);
      onStatusChange?.('Esperando cámara');
      return;
    }

    anchorRef.current = false;
    anchorProgressRef.current = 0;
    anchorOffsetRef.current = { x: 0, y: 0 };
    updateStatus('scanning');
    onAnchorChange?.(false);
    onStatusChange?.('Buscando mesa');
    const timer = window.setTimeout(() => {
      if (statusRef.current === 'scanning') {
        updateStatus('surface-ready');
        onStatusChange?.('Mesa detectada');
      }
    }, 680);

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

    const profile = MODEL_PROFILES[dishId] ?? DEFAULT_MODEL_PROFILE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
    camera.position.set(0, 1.22, 3.1);
    camera.lookAt(0, 0.12, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.34;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = 'h-full w-full';

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(renderer.domElement);

    const environmentTexture = createAmbientEnvironmentTexture();
    scene.environment = environmentTexture;

    const root = new THREE.Group();
    root.position.set(0, -0.72, -2.08);
    root.rotation.x = -0.018;
    scene.add(root);

    const dishGroup = new THREE.Group();
    dishGroup.visible = false;
    dishGroupRef.current = dishGroup;
    root.add(dishGroup);

    const ambientLight = new THREE.HemisphereLight(0xfff4df, 0x1e2430, 1.92);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffe3bf, 3.45);
    keyLight.position.set(2.5, 4.6, 2.1);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.2;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.bias = -0.00008;
    keyLight.shadow.normalBias = 0.018;
    keyLight.shadow.radius = 4.2;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8fbaff, 0.66);
    fillLight.position.set(-2.8, 1.8, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff6a1a, 1.42);
    rimLight.position.set(-3.4, 2.4, -2.6);
    scene.add(rimLight);

    const topSoftLight = new THREE.PointLight(0xfff4df, 1.2, 5.4, 2);
    topSoftLight.position.set(0, 2.4, 1.2);
    scene.add(topSoftLight);

    const softShadowTexture = createSoftShadowTexture();
    const contactShadowMaterial = new THREE.MeshBasicMaterial({
      map: softShadowTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const contactShadow = new THREE.Mesh(new THREE.CircleGeometry(1.24, 112), contactShadowMaterial);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.scale.set(profile.shadowScale[0], profile.shadowScale[1], 1);
    contactShadow.position.set(0.02, -0.015, 0.06);
    root.add(contactShadow);

    const tableGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6a1a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const tableGlow = new THREE.Mesh(new THREE.CircleGeometry(1.06, 96), tableGlowMaterial);
    tableGlow.rotation.x = -Math.PI / 2;
    tableGlow.position.y = -0.018;
    tableGlow.scale.set(1.28, 0.46, 1);
    root.add(tableGlow);

    const anchorRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6a1a,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const anchorRing = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.735, 128), anchorRingMaterial);
    anchorRing.rotation.x = -Math.PI / 2;
    anchorRing.position.y = 0.004;
    root.add(anchorRing);

    const innerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const innerRing = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.252, 96), innerRingMaterial);
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

            const standardMat = mat as THREE.MeshStandardMaterial;
            if (standardMat.map) {
              standardMat.map.colorSpace = THREE.SRGBColorSpace;
              standardMat.map.needsUpdate = true;
            }
            if ('envMapIntensity' in standardMat) {
              standardMat.envMapIntensity = Math.max(standardMat.envMapIntensity || 0, 0.88);
            }
            if ('roughness' in standardMat && typeof standardMat.roughness === 'number') {
              standardMat.roughness = Math.min(0.86, Math.max(0.34, standardMat.roughness));
            }
            if ('metalness' in standardMat && typeof standardMat.metalness === 'number') {
              standardMat.metalness = Math.min(0.18, standardMat.metalness);
            }
          });
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.scale.setScalar(profile.targetSize / maxDim);

        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.y -= box.min.y - profile.heightBias;
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
    const defaultCameraPosition = new THREE.Vector3(0, 1.16, 3.04);
    const defaultLookTarget = new THREE.Vector3(0, 0.12, 0);
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

      anchorProgressRef.current = anchored
        ? Math.min(1, anchorProgressRef.current + 0.045)
        : Math.max(0, anchorProgressRef.current - 0.08);
      const entrance = 1 - Math.pow(1 - anchorProgressRef.current, 3);

      targetScaleVector.set(targetScale, targetScale, targetScale);
      root.scale.lerp(targetScaleVector, 0.12);

      const targetX = anchored ? anchorOffset.x * 1.02 : 0;
      const targetY = anchored ? -0.72 : -0.7;
      const targetZ = anchored ? -2.08 + anchorOffset.y * 0.38 : -2.08;
      root.position.x += (targetX - root.position.x) * 0.09;
      root.position.y += (targetY - root.position.y) * 0.085;
      root.position.z += (targetZ - root.position.z) * 0.08;
      root.rotation.y += (0 - root.rotation.y) * 0.08;

      dishGroup.scale.setScalar(0.78 + 0.22 * entrance);
      dishGroup.position.y = 0.04 * (1 - entrance);
      dishGroup.rotation.y += ((anchored ? 0 : 0.08) - dishGroup.rotation.y) * 0.08;

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
        const sensorOrbitX = THREE.MathUtils.clamp((yawDelta * 0.72 + gammaDelta * 1.08) / 58, -1.08, 1.08);
        const sensorOrbitY = THREE.MathUtils.clamp(betaDelta / 64, -0.48, 0.52);
        const manualOrbit = manualOrbitRef.current;
        const orbitX = THREE.MathUtils.clamp(sensorOrbitX + manualOrbit.x, -1.18, 1.18);
        const orbitY = THREE.MathUtils.clamp(sensorOrbitY + manualOrbit.y, -0.56, 0.58);

        anchoredLookTarget.set(root.position.x, root.position.y + 0.25, root.position.z + 0.01);
        desiredCameraPosition.set(
          anchoredLookTarget.x + Math.sin(orbitX) * profile.orbitRadius,
          anchoredLookTarget.y + profile.cameraHeight - orbitY * 0.92,
          anchoredLookTarget.z + Math.cos(orbitX) * profile.orbitRadius
        );
        camera.position.lerp(desiredCameraPosition, 0.09);
        camera.lookAt(anchoredLookTarget);
      } else {
        camera.position.lerp(defaultCameraPosition, 0.08);
        camera.lookAt(defaultLookTarget);
      }

      if (!anchored) {
        const surfaceReady = statusRef.current === 'surface-ready';
        anchorRing.visible = isCameraActive;
        innerRing.visible = isCameraActive;
        dishGroup.visible = false;
        anchorRing.rotation.z += surfaceReady ? 0.006 : 0.012;
        innerRing.rotation.z -= 0.008;
        anchorRing.scale.setScalar(surfaceReady ? 1.08 + Math.sin(performance.now() * 0.004) * 0.025 : 1);
        anchorRingMaterial.opacity += ((surfaceReady ? 0.26 : 0.16) - anchorRingMaterial.opacity) * 0.16;
        innerRingMaterial.opacity += ((surfaceReady ? 0.12 : 0.055) - innerRingMaterial.opacity) * 0.16;
        contactShadowMaterial.opacity += (0 - contactShadowMaterial.opacity) * 0.16;
        tableGlowMaterial.opacity += ((surfaceReady ? 0.08 : 0.025) - tableGlowMaterial.opacity) * 0.12;
      } else {
        dishGroup.visible = modelReadyRef.current;
        anchorRing.visible = true;
        innerRing.visible = true;
        anchorRing.scale.setScalar(1 + (1 - entrance) * 0.24);
        innerRing.scale.setScalar(1 + (1 - entrance) * 0.18);
        anchorRingMaterial.opacity += (0.035 - anchorRingMaterial.opacity) * 0.14;
        innerRingMaterial.opacity += (0.022 - innerRingMaterial.opacity) * 0.14;
        contactShadowMaterial.opacity += (profile.shadowOpacity * entrance - contactShadowMaterial.opacity) * 0.12;
        tableGlowMaterial.opacity += (0.025 - tableGlowMaterial.opacity) * 0.12;
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
      environmentTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      dishGroupRef.current = null;
    };
  }, [dishId, scale, isCameraActive]);

  const anchorDish = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isCameraActive || status === 'idle' || status === 'anchored' || preferRealAR) return;

    void requestDeviceOrientationAccess();

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) - 0.5;
    const y = ((event.clientY - rect.top) / rect.height) - 0.54;
    anchorOffsetRef.current = {
      x: THREE.MathUtils.clamp(x, -0.34, 0.34),
      y: THREE.MathUtils.clamp(y, -0.22, 0.24),
    };

    anchorOrientationRef.current = { ...orientationRef.current };
    manualOrbitRef.current = { x: 0, y: 0 };
    anchorProgressRef.current = 0;
    anchorRef.current = true;
    updateStatus('anchored');
    onAnchorChange?.(true);
    onStatusChange?.('Plato fijado en mesa');
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
      x: THREE.MathUtils.clamp(drag.baseX + dx * 2.1, -0.86, 0.86),
      y: THREE.MathUtils.clamp(drag.baseY + dy * 1.45, -0.42, 0.42),
    };
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId === event.pointerId) {
      dragRef.current = { active: false, pointerId: -1, startX: 0, startY: 0, baseX: 0, baseY: 0 };
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  };

  const statusText = status === 'anchored'
    ? 'Plato fijo: muévete alrededor o arrastra para verlo 360°'
    : preferRealAR
      ? 'AR real disponible: usa el botón de mesa para anclar con WebXR'
      : status === 'surface-ready'
      ? 'Mesa detectada: toca donde quieres colocar el plato'
      : status === 'scanning'
        ? 'Apunta a la mesa y muévete lento'
        : 'Activa la cámara para iniciar AR';

  return (
    <button
      type="button"
      onClick={anchorDish}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      disabled={!isCameraActive || status === 'idle' || (preferRealAR && status !== 'anchored')}
      className="absolute inset-0 z-10 block h-full w-full cursor-crosshair overflow-hidden bg-transparent text-left disabled:cursor-default"
      aria-label="Detectar superficie y anclar plato 3D"
    >
      <div ref={mountRef} className="absolute inset-0 pointer-events-none" />

      {isCameraActive && status !== 'anchored' && (
        <div className="pointer-events-none absolute left-1/2 top-[52%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4">
          <div className="relative h-24 w-24 rounded-full border border-[#ff6a1a]/40 bg-[#ff6a1a]/6 shadow-[0_0_38px_rgba(255,106,26,0.18)] backdrop-blur-[1px]">
            <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff6a1a] shadow-[0_0_20px_rgba(255,106,26,0.9)]" />
            <span className="absolute inset-6 rounded-full border border-dashed border-white/24" />
            <span className="absolute inset-2 rounded-full border border-white/8" />
          </div>
          <div className="max-w-[300px] rounded-full border border-white/12 bg-black/48 px-4 py-2.5 text-center text-white shadow-2xl backdrop-blur-md">
            <p className="text-[12px] font-black leading-snug">{statusText}</p>
            <p className="mt-1 text-[10px] leading-snug text-white/62">
              {modelReady ? 'Se colocará a escala real con sombra de contacto.' : 'Cargando modelo 3D del plato...'}
            </p>
          </div>
        </div>
      )}

      {isCameraActive && status === 'anchored' && (
        <div className="pointer-events-none absolute left-1/2 top-[12%] max-w-[340px] -translate-x-1/2 rounded-full border border-emerald-400/24 bg-black/42 px-4 py-2 text-center text-[11px] font-bold text-emerald-100 shadow-xl backdrop-blur-md">
          {statusText}
        </div>
      )}
    </button>
  );
};


