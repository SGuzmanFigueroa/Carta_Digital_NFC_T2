import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ThreeDViewProps {
  onInteract?: () => void;
}

export const ThreeDView: React.FC<ThreeDViewProps> = ({ onInteract }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentAngle, setCurrentAngle] = useState<'iso' | 'top' | 'side'>('iso');
  const [fps, setFps] = useState(60);
  const targetRotXRef = useRef(0.35);
  const targetRotYRef = useRef(0);
  const autoRotateRef = useRef(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 320;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 4.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // Clean any prior canvas
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    const dishGroup = new THREE.Group();
    scene.add(dishGroup);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.8);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xff9944, 1.6);
    fillLight.position.set(-4, 2, -2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffaa55, 2.2, 10);
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    // Bowl Base
    const bowlGeo = new THREE.CylinderGeometry(2.1, 1.3, 0.7, 48, 1, false);
    const bowlMat = new THREE.MeshStandardMaterial({
      color: 0x161519,
      roughness: 0.35,
      metalness: 0.15
    });
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    bowl.position.y = -0.15;
    bowl.receiveShadow = true;
    bowl.castShadow = true;
    dishGroup.add(bowl);

    const rimGeo = new THREE.TorusGeometry(2.12, 0.03, 16, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      roughness: 0.2,
      metalness: 0.85
    });
    const bowlRim = new THREE.Mesh(rimGeo, rimMat);
    bowlRim.rotation.x = Math.PI / 2;
    bowlRim.position.y = 0.2;
    dishGroup.add(bowlRim);

    const tableGeo = new THREE.CircleGeometry(2.8, 48);
    const tableMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.51;
    table.receiveShadow = true;
    scene.add(table);

    // Chaufa Rice Mound
    const moundGeo = new THREE.SphereGeometry(1.8, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.48);
    const pos = moundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const noise = Math.sin(vx * 5.0) * Math.cos(vz * 5.0) * 0.08 + Math.sin(vy * 8.0) * 0.04;
      pos.setXYZ(i, vx + noise * 0.5, vy + noise * 0.9, vz + noise * 0.5);
    }
    moundGeo.computeVertexNormals();

    const riceMat = new THREE.MeshStandardMaterial({
      color: 0x93652f,
      roughness: 0.75,
      metalness: 0.08,
      flatShading: true
    });
    const riceMound = new THREE.Mesh(moundGeo, riceMat);
    riceMound.position.y = -0.15;
    riceMound.castShadow = true;
    riceMound.receiveShadow = true;
    dishGroup.add(riceMound);

    // Meat chunks (Pork Char Siu)
    const meatGeo = new THREE.BoxGeometry(0.24, 0.16, 0.24);
    const meatMat = new THREE.MeshStandardMaterial({
      color: 0x6e2612,
      roughness: 0.3,
      metalness: 0.1
    });
    for (let i = 0; i < 22; i++) {
      const meat = new THREE.Mesh(meatGeo, meatMat);
      const angle = Math.random() * Math.PI * 2;
      const r = 0.35 + Math.random() * 1.15;
      const h = 0.3 + Math.random() * 0.45;
      meat.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
      meat.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
      meat.castShadow = true;
      dishGroup.add(meat);
    }

    // Scallions (Cebollita China)
    const scallionGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12, 1, true);
    const scallionMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.4,
      side: THREE.DoubleSide
    });
    for (let i = 0; i < 40; i++) {
      const sc = new THREE.Mesh(scallionGeo, scallionMat);
      const angle = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 1.4;
      const h = 0.35 + Math.random() * 0.48;
      sc.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
      sc.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      sc.scale.set(1 + Math.random() * 0.4, 1, 1 + Math.random() * 0.4);
      sc.castShadow = true;
      dishGroup.add(sc);
    }

    // Egg Strips
    const eggGeo = new THREE.BoxGeometry(0.3, 0.05, 0.12);
    const eggMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.6
    });
    for (let i = 0; i < 18; i++) {
      const egg = new THREE.Mesh(eggGeo, eggMat);
      const angle = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 1.2;
      const h = 0.38 + Math.random() * 0.45;
      egg.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
      egg.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
      egg.castShadow = true;
      dishGroup.add(egg);
    }

    // Prawns (Langostinos)
    const prawnGeo = new THREE.TorusGeometry(0.22, 0.07, 12, 20, Math.PI * 1.4);
    const prawnMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.35,
      metalness: 0.05
    });
    for (let i = 0; i < 4; i++) {
      const prawn = new THREE.Mesh(prawnGeo, prawnMat);
      const angle = (i / 4) * Math.PI * 2 + 0.4;
      const r = 0.85;
      const h = 0.52 + (i % 2) * 0.08;
      prawn.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
      prawn.rotation.set(-0.4, -angle, 0.6);
      prawn.castShadow = true;
      dishGroup.add(prawn);
    }

    // Steam Particles
    const steamCount = 35;
    const steamGeo = new THREE.BufferGeometry();
    const steamPositions = new Float32Array(steamCount * 3);
    const steamSpeeds = new Float32Array(steamCount);
    for (let i = 0; i < steamCount; i++) {
      steamPositions[i * 3] = (Math.random() - 0.5) * 1.6;
      steamPositions[i * 3 + 1] = 0.8 + Math.random() * 1.5;
      steamPositions[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
      steamSpeeds[i] = 0.008 + Math.random() * 0.012;
    }
    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));
    const steamMat = new THREE.PointsMaterial({
      color: 0xffeedd,
      size: 0.08,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const steamParticles = new THREE.Points(steamGeo, steamMat);
    dishGroup.add(steamParticles);

    // Interactive Drag Controls
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      autoRotateRef.current = false;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
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
      targetRotXRef.current += dy * 0.008;
      targetRotXRef.current = Math.max(0.1, Math.min(1.15, targetRotXRef.current));

      prevX = clientX;
      prevY = clientY;
    };

    const onPointerUp = () => {
      isDragging = false;
      setTimeout(() => {
        autoRotateRef.current = true;
      }, 3500);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    domEl.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Simple FPS counter
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }

      if (autoRotateRef.current) {
        targetRotYRef.current += 0.006;
      }

      dishGroup.rotation.y += (targetRotYRef.current - dishGroup.rotation.y) * 0.08;
      dishGroup.rotation.x += (targetRotXRef.current - dishGroup.rotation.x) * 0.08;

      // Update Steam
      const posArr = steamGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < steamCount; i++) {
        posArr[i * 3 + 1] += steamSpeeds[i];
        if (posArr[i * 3 + 1] > 2.4) {
          posArr[i * 3 + 1] = 0.8;
        }
      }
      steamGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 380;
      const newH = container.clientHeight || 320;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
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
  }, []);

  const setAngle = (angleName: 'iso' | 'top' | 'side') => {
    setCurrentAngle(angleName);
    autoRotateRef.current = false;
    if (angleName === 'top') {
      targetRotXRef.current = 1.1;
    } else if (angleName === 'side') {
      targetRotXRef.current = 0.2;
    } else if (angleName === 'iso') {
      targetRotXRef.current = 0.45;
    }
    setTimeout(() => {
      autoRotateRef.current = true;
    }, 4500);
  };

  return (
    <div className="relative w-full h-80 bg-[#0e0e10] overflow-hidden select-none">
      {/* Three.js container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Gradient Scrim overlay */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#201f22] to-transparent pointer-events-none" />

      {/* Top Badges Overlay */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
        <span className="px-2 py-0.5 rounded bg-[#ff5708] text-[#511500] font-label-code text-[10px] tracking-wider flex items-center gap-1 shadow-md font-bold">
          <span className="material-symbols-outlined text-[13px]">local_fire_department</span>
          NUEVO LANZAMIENTO
        </span>
        <span className="px-2 py-0.5 rounded bg-[#0e0e10]/90 backdrop-blur-md text-[#a1c9ff] font-label-code text-[10px] border border-[#a1c9ff]/30">
          WOK DE AUTOR
        </span>
      </div>

      {/* AR Scale Ready Pill */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0e0e10]/90 backdrop-blur-md border border-[#ff5708]/40 shadow-lg pointer-events-none">
        <span className="material-symbols-outlined text-[15px] text-[#ff5708] animate-pulse">view_in_ar</span>
        <span className="font-label-code text-[10px] text-[#e5e1e4] font-semibold tracking-wide">AR Listo (Escala 1:1)</span>
      </div>

      {/* Wok Hei & Steam Indicator */}
      <div className="absolute bottom-12 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0e0e10]/80 backdrop-blur-md text-[#e5beb2] font-label-code text-[10px] pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Vapor & Wok Hei Térmico Activo ({fps} FPS)</span>
      </div>

      {/* Camera Angle Controls Overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-1 bg-[#0e0e10]/85 backdrop-blur-md p-1 rounded-lg border border-[#2a2a2c]">
          <button
            type="button"
            className={`px-2 py-1 rounded text-[10px] font-label-code transition-colors cursor-pointer ${
              currentAngle === 'top'
                ? 'bg-[#ff5708] text-[#511500] font-bold'
                : 'bg-[#2a2a2c] text-[#e5e1e4] hover:text-[#ffb59c]'
            }`}
            onClick={() => setAngle('top')}
          >
            Cénital / Top
          </button>
          <button
            type="button"
            className={`px-2 py-1 rounded text-[10px] font-label-code transition-colors cursor-pointer ${
              currentAngle === 'iso'
                ? 'bg-[#ff5708] text-[#511500] font-bold'
                : 'bg-[#2a2a2c] text-[#e5e1e4] hover:text-[#ffb59c]'
            }`}
            onClick={() => setAngle('iso')}
          >
            45° Perspectiva
          </button>
          <button
            type="button"
            className={`px-2 py-1 rounded text-[10px] font-label-code transition-colors cursor-pointer ${
              currentAngle === 'side'
                ? 'bg-[#ff5708] text-[#511500] font-bold'
                : 'bg-[#2a2a2c] text-[#e5e1e4] hover:text-[#ffb59c]'
            }`}
            onClick={() => setAngle('side')}
          >
            Lateral
          </button>
        </div>

        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0e0e10]/85 backdrop-blur-md border border-[#2a2a2c] text-[#c6c5cf] text-[11px] font-label-code">
          <span className="material-symbols-outlined text-[14px] text-[#ff5708]">touch_app</span>
          <span>360° Rotar</span>
        </div>
      </div>
    </div>
  );
};
