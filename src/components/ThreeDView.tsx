import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface ThreeDViewProps {
  onInteract?: () => void;
  heightClass?: string;
}

export const ThreeDView: React.FC<ThreeDViewProps> = ({ onInteract, heightClass = 'h-64 sm:h-80' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentAngle, setCurrentAngle] = useState<'iso' | 'top' | 'side'>('iso');
  const [fps, setFps] = useState(60);
  const [isReady, setIsReady] = useState(false);
  const targetRotXRef = useRef(0.42);
  const targetRotYRef = useRef(0);
  const autoRotateRef = useRef(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let isSubscribed = true;
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 280;

    // Scene & Camera
    const scene = new THREE.Scene();
    
    // Warm gradient ambient background
    scene.background = new THREE.Color(0x131418);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    // Adjusted camera distance for mobile framing
    const isMobile = width < 480;
    camera.position.set(0, isMobile ? 3.6 : 3.2, isMobile ? 4.8 : 4.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6; // Vibrant, luminous appetizing exposure

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    const dishGroup = new THREE.Group();
    scene.add(dishGroup);

    // ==========================================
    // 💡 STUDIO LIGHTING SETUP (Appetizing & Luminous)
    // ==========================================
    // 1. Ambient Warm Light (prevents any dark/black voids)
    const ambientLight = new THREE.AmbientLight(0xfff1e0, 2.2);
    scene.add(ambientLight);

    // 2. Main Key Sun Spotlight (Warm, casting delicious specular glaze on meat & prawns)
    const keyLight = new THREE.DirectionalLight(0xfff3d6, 3.8);
    keyLight.position.set(3.5, 6, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0008;
    scene.add(keyLight);

    // 3. Warm Orange Rim / Kick Light (creates golden rim highlights on food silhouette)
    const rimLight = new THREE.DirectionalLight(0xff7722, 2.8);
    rimLight.position.set(-4, 3.5, -3.5);
    scene.add(rimLight);

    // 4. Overhead Accent Soft Light
    const topLight = new THREE.PointLight(0xffe2b8, 2.2, 12);
    topLight.position.set(0, 4.5, 0);
    scene.add(topLight);

    // 5. Upward Fill Light (soft warm glow from below)
    const bounceLight = new THREE.DirectionalLight(0xd97706, 1.2);
    bounceLight.position.set(0, -3, 2);
    scene.add(bounceLight);

    // ==========================================
    // 🍽️ ELEGANT ARTISANAL CERAMIC PLATE & PEDESTAL
    // ==========================================
    // Presentation Pedestal (Luxury dark slate stone)
    const pedestalGeo = new THREE.CylinderGeometry(2.35, 2.45, 0.12, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1a1b20,
      roughness: 0.8,
      metalness: 0.1
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.42;
    pedestal.receiveShadow = true;
    dishGroup.add(pedestal);

    // Soft Shadow Table Floor
    const tableGeo = new THREE.CircleGeometry(3.6, 48);
    const tableMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.49;
    table.receiveShadow = true;
    scene.add(table);

    // Main Ceramic Wok Bowl (Deep luxury dark charcoal with speckled rim)
    const bowlGeo = new THREE.CylinderGeometry(2.1, 1.35, 0.65, 48, 1, false);
    const bowlMat = new THREE.MeshStandardMaterial({
      color: 0x24252a,
      roughness: 0.3,
      metalness: 0.25
    });
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    bowl.position.y = -0.12;
    bowl.receiveShadow = true;
    bowl.castShadow = true;
    dishGroup.add(bowl);

    // Golden Bronze Rim on Bowl Edge
    const rimGeo = new THREE.TorusGeometry(2.12, 0.045, 16, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Rich Gold / Amber
      roughness: 0.25,
      metalness: 0.85
    });
    const bowlRim = new THREE.Mesh(rimGeo, rimMat);
    bowlRim.rotation.x = Math.PI / 2;
    bowlRim.position.y = 0.21;
    dishGroup.add(bowlRim);

    // ==========================================
    // 🍚 CHAUFA RICE MOUND (Golden Wok Hei Grains)
    // ==========================================
    const moundGeo = new THREE.SphereGeometry(1.82, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.49);
    const pos = moundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      // Realistic wok-fried textured bumps
      const noise =
        Math.sin(vx * 6.5) * Math.cos(vz * 6.5) * 0.09 +
        Math.sin(vy * 9.0) * 0.045 +
        Math.cos(vx * 12.0) * 0.02;
      pos.setXYZ(i, vx + noise * 0.4, vy + noise * 0.75, vz + noise * 0.4);
    }
    moundGeo.computeVertexNormals();

    // Warm golden-brown fried rice color (NOT black!)
    const riceMat = new THREE.MeshStandardMaterial({
      color: 0xd9822b, // Golden toasted chaufa rice
      roughness: 0.65,
      metalness: 0.12,
      flatShading: true
    });
    const riceMound = new THREE.Mesh(moundGeo, riceMat);
    riceMound.position.y = -0.1;
    riceMound.castShadow = true;
    riceMound.receiveShadow = true;
    dishGroup.add(riceMound);

    // Micro-grains layer for realism & texture
    const grainGeo = new THREE.ConeGeometry(0.045, 0.1, 4);
    const grainMatLight = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
    const grainMatDark = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 });
    for (let i = 0; i < 45; i++) {
      const g = new THREE.Mesh(grainGeo, i % 2 === 0 ? grainMatLight : grainMatDark);
      const angle = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 1.35;
      const h = 0.35 + Math.random() * 0.42;
      g.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
      g.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dishGroup.add(g);
    }

    // ==========================================
    // 🥓 CHAR SIU PORK BELLY (Glazed Red-Brown Cubes)
    // ==========================================
    const meatGeo = new THREE.BoxGeometry(0.26, 0.17, 0.26);
    const meatMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // Rich glazed red Char Siu
      roughness: 0.2, // Specular glaze reflections!
      metalness: 0.15
    });
    for (let i = 0; i < 24; i++) {
      const meat = new THREE.Mesh(meatGeo, meatMat);
      const angle = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 1.25;
      const h = 0.32 + Math.random() * 0.48;
      meat.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
      meat.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.4);
      meat.castShadow = true;
      dishGroup.add(meat);
    }

    // ==========================================
    // 🌿 FRESH SCALLIONS (Cebollita China - Crisp Green)
    // ==========================================
    const scallionGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.09, 12, 1, true);
    const scallionMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e, // Fresh vivid emerald green
      roughness: 0.35,
      side: THREE.DoubleSide
    });
    for (let i = 0; i < 42; i++) {
      const sc = new THREE.Mesh(scallionGeo, scallionMat);
      const angle = Math.random() * Math.PI * 2;
      const r = 0.15 + Math.random() * 1.45;
      const h = 0.38 + Math.random() * 0.5;
      sc.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
      sc.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      sc.scale.set(1 + Math.random() * 0.35, 1, 1 + Math.random() * 0.35);
      sc.castShadow = true;
      dishGroup.add(sc);
    }

    // ==========================================
    // 🍳 GOLDEN EGG RIBBONS (Tortilla Picada)
    // ==========================================
    const eggGeo = new THREE.BoxGeometry(0.32, 0.05, 0.13);
    const eggMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // Bright egg yellow
      roughness: 0.5
    });
    for (let i = 0; i < 20; i++) {
      const egg = new THREE.Mesh(eggGeo, eggMat);
      const angle = Math.random() * Math.PI * 2;
      const r = 0.25 + Math.random() * 1.3;
      const h = 0.4 + Math.random() * 0.46;
      egg.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
      egg.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.3);
      egg.castShadow = true;
      dishGroup.add(egg);
    }

    // ==========================================
    // 🦐 JUMBO PRAWNS (Langostinos Flameados)
    // ==========================================
    const prawnGeo = new THREE.TorusGeometry(0.24, 0.08, 14, 22, Math.PI * 1.4);
    const prawnMat = new THREE.MeshStandardMaterial({
      color: 0xfb7185, // Tender coral pink
      roughness: 0.25,
      metalness: 0.08
    });
    for (let i = 0; i < 5; i++) {
      const prawn = new THREE.Mesh(prawnGeo, prawnMat);
      const angle = (i / 5) * Math.PI * 2 + 0.3;
      const r = 0.88;
      const h = 0.54 + (i % 2) * 0.08;
      prawn.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
      prawn.rotation.set(-0.35, -angle, 0.55);
      prawn.castShadow = true;
      dishGroup.add(prawn);
    }

    // ==========================================
    // 💨 RISING STEAM PARTICLES (Vapor de Wok Hei)
    // ==========================================
    const steamCount = 38;
    const steamGeo = new THREE.BufferGeometry();
    const steamPositions = new Float32Array(steamCount * 3);
    const steamSpeeds = new Float32Array(steamCount);
    for (let i = 0; i < steamCount; i++) {
      steamPositions[i * 3] = (Math.random() - 0.5) * 1.5;
      steamPositions[i * 3 + 1] = 0.8 + Math.random() * 1.6;
      steamPositions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
      steamSpeeds[i] = 0.007 + Math.random() * 0.012;
    }
    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));
    const steamMat = new THREE.PointsMaterial({
      color: 0xffedd5,
      size: 0.09,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const steamParticles = new THREE.Points(steamGeo, steamMat);
    dishGroup.add(steamParticles);

    // ==========================================
    // 🖐️ TOUCH & MOUSE CONTROLS (Non-blocking vertical scroll)
    // ==========================================
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let prevX = 0;
    let prevY = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      autoRotateRef.current = false;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;
      prevX = clientX;
      prevY = clientY;
      onInteract?.();
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - prevX;
      const dy = clientY - prevY;

      targetRotYRef.current += dx * 0.01;
      targetRotXRef.current += dy * 0.007;
      targetRotXRef.current = Math.max(0.12, Math.min(1.18, targetRotXRef.current));

      prevX = clientX;
      prevY = clientY;
    };

    const onPointerUp = () => {
      isDragging = false;
      setTimeout(() => {
        if (isSubscribed) {
          autoRotateRef.current = true;
        }
      }, 4000);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    domEl.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // ==========================================
    // 🎬 SMOOTH ANIMATION LOOP
    // ==========================================
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      if (!isSubscribed) return;
      animationFrameId = requestAnimationFrame(animate);

      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }

      if (autoRotateRef.current) {
        targetRotYRef.current += 0.007;
      }

      dishGroup.rotation.y += (targetRotYRef.current - dishGroup.rotation.y) * 0.08;
      dishGroup.rotation.x += (targetRotXRef.current - dishGroup.rotation.x) * 0.08;

      // Float steam particles upward
      const posArr = steamGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < steamCount; i++) {
        posArr[i * 3 + 1] += steamSpeeds[i];
        if (posArr[i * 3 + 1] > 2.5) {
          posArr[i * 3 + 1] = 0.8;
        }
      }
      steamGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();
    setIsReady(true);

    const handleResize = () => {
      if (!container || !isSubscribed) return;
      const newW = container.clientWidth || 360;
      const newH = container.clientHeight || 280;
      camera.aspect = newW / newH;
      const mobile = newW < 480;
      camera.position.set(0, mobile ? 3.6 : 3.2, mobile ? 4.8 : 4.2);
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isSubscribed = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domEl.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      renderer.dispose();
    };
  }, [onInteract]);

  const setAngle = (angleName: 'iso' | 'top' | 'side') => {
    setCurrentAngle(angleName);
    autoRotateRef.current = false;
    if (angleName === 'top') {
      targetRotXRef.current = 1.15;
    } else if (angleName === 'side') {
      targetRotXRef.current = 0.18;
    } else if (angleName === 'iso') {
      targetRotXRef.current = 0.42;
    }
    setTimeout(() => {
      autoRotateRef.current = true;
    }, 4500);
  };

  return (
    <div className={`relative w-full ${heightClass} bg-[#131418] overflow-hidden select-none touch-pan-y`}>
      {/* Three.js canvas container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Subtle bottom gradient scrim */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#1a1b20] to-transparent pointer-events-none" />

      {/* Top Floating Badges (Clean, no text wrapping) */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-[#ff5708] text-white font-mono-code text-[9px] sm:text-[10px] tracking-wide font-bold shadow-lg flex items-center gap-1">
            <svg className="w-3 h-3 text-amber-200 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
            </svg>
            <span>WOK HEI 3D</span>
          </span>
          <span className="hidden xs:inline-flex px-2 py-0.5 rounded-full bg-[#1c1b1d]/90 backdrop-blur-md text-[#a1c9ff] font-mono-code text-[9px] border border-[#a1c9ff]/30">
            AUTOR
          </span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1c1b1d]/90 backdrop-blur-md border border-[#ff5708]/40 text-[#ffb59c] text-[9px] sm:text-[10px] font-mono-code">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{fps} FPS</span>
        </div>
      </div>

      {/* Camera Angle Controls Overlay (Ultra-compact for mobile) */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-auto">
        <div className="flex items-center gap-1 bg-[#121316]/90 backdrop-blur-md p-0.5 sm:p-1 rounded-lg border border-[#2a2a2c] shadow-lg">
          <button
            type="button"
            className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono-code transition-colors cursor-pointer ${
              currentAngle === 'iso'
                ? 'bg-[#ff5708] text-white font-bold'
                : 'text-[#bcbbc5] hover:text-white'
            }`}
            onClick={() => setAngle('iso')}
          >
            45°
          </button>
          <button
            type="button"
            className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono-code transition-colors cursor-pointer ${
              currentAngle === 'top'
                ? 'bg-[#ff5708] text-white font-bold'
                : 'text-[#bcbbc5] hover:text-white'
            }`}
            onClick={() => setAngle('top')}
          >
            Cénital
          </button>
          <button
            type="button"
            className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono-code transition-colors cursor-pointer ${
              currentAngle === 'side'
                ? 'bg-[#ff5708] text-white font-bold'
                : 'text-[#bcbbc5] hover:text-white'
            }`}
            onClick={() => setAngle('side')}
          >
            Lateral
          </button>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#121316]/90 backdrop-blur-md border border-[#2a2a2c] text-[#bcbbc5] text-[9px] sm:text-[10px] font-mono-code shadow-lg">
          <svg className="w-3 h-3 text-[#ff5708]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden xs:inline">Arrastra para </span>Rotar
        </div>
      </div>
    </div>
  );
};
