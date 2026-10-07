import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ThreeDViewProps {
  dishId?: string;
  onInteract?: () => void;
  heightClass?: string;
  enableCameraBg?: boolean;
}

export const ThreeDView: React.FC<ThreeDViewProps> = ({
  dishId = 'chaufa-wok',
  onInteract,
  heightClass = 'h-64 sm:h-80',
  enableCameraBg = false
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentAngle, setCurrentAngle] = useState<'iso' | 'top' | 'side'>('iso');
  const [fps, setFps] = useState(60);
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
    if (!enableCameraBg) {
      scene.background = new THREE.Color(0x131418);
    }

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    const isMobile = width < 480;
    camera.position.set(0, isMobile ? 3.6 : 3.2, isMobile ? 4.8 : 4.2);
    camera.lookAt(0, 0, 0);

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
    renderer.toneMappingExposure = 1.65;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    const dishGroup = new THREE.Group();
    scene.add(dishGroup);

    // ==========================================
    // 💡 STUDIO LIGHTING
    // ==========================================
    const ambientLight = new THREE.AmbientLight(0xfff1e0, 2.3);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff3d6, 4.0);
    keyLight.position.set(3.5, 6, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0008;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff7722, 2.8);
    rimLight.position.set(-4, 3.5, -3.5);
    scene.add(rimLight);

    const topLight = new THREE.PointLight(0xffe2b8, 2.4, 12);
    topLight.position.set(0, 4.5, 0);
    scene.add(topLight);

    const bounceLight = new THREE.DirectionalLight(0xd97706, 1.3);
    bounceLight.position.set(0, -3, 2);
    scene.add(bounceLight);

    // ==========================================
    // 🍽️ BASE CERAMIC PLATES ACCORDING TO DISH
    // ==========================================
    if (dishId === 'wagyu-a5') {
      // Luxury Rectangular Slate Platter
      const slateGeo = new THREE.BoxGeometry(3.6, 0.14, 2.4);
      const slateMat = new THREE.MeshStandardMaterial({
        color: 0x1c1d22,
        roughness: 0.85,
        metalness: 0.15
      });
      const slate = new THREE.Mesh(slateGeo, slateMat);
      slate.position.y = -0.3;
      slate.receiveShadow = true;
      dishGroup.add(slate);
    } else if (dishId === 'aji-de-gallina') {
      // 🍗 AJÍ DE GALLINA CLÁSICO: Creamy golden yellow ají sauce with shredded chicken, quail eggs, botija olives, pecans
      const moundGeo = new THREE.CylinderGeometry(1.7, 1.8, 0.35, 32);
      const moundMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // Warm golden ají amarillo sauce
        roughness: 0.35,
        metalness: 0.08
      });
      const mound = new THREE.Mesh(moundGeo, moundMat);
      mound.position.y = 0.05;
      mound.receiveShadow = true;
      dishGroup.add(mound);

      // Shredded chicken breast texture
      const chickenGeo = new THREE.BoxGeometry(0.12, 0.08, 0.45);
      const chickenMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });
      for (let i = 0; i < 28; i++) {
        const ch = new THREE.Mesh(chickenGeo, chickenMat);
        const angle = Math.random() * Math.PI * 2;
        const r = 0.2 + Math.random() * 1.25;
        ch.position.set(Math.cos(angle) * r, 0.22 + Math.random() * 0.15, Math.sin(angle) * r);
        ch.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
        dishGroup.add(ch);
      }

      // Hard-boiled Quail Egg Halves (Yellow yolk + white base)
      const eggWhiteGeo = new THREE.SphereGeometry(0.24, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const eggWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
      const eggYolkGeo = new THREE.SphereGeometry(0.14, 16, 16);
      const eggYolkMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3 });

      const egg1 = new THREE.Group();
      egg1.add(new THREE.Mesh(eggWhiteGeo, eggWhiteMat));
      egg1.add(new THREE.Mesh(eggYolkGeo, eggYolkMat));
      egg1.position.set(-0.4, 0.25, 0.4);
      dishGroup.add(egg1);

      const egg2 = new THREE.Group();
      egg2.add(new THREE.Mesh(eggWhiteGeo, eggWhiteMat));
      egg2.add(new THREE.Mesh(eggYolkGeo, eggYolkMat));
      egg2.position.set(0.5, 0.25, -0.3);
      dishGroup.add(egg2);

      // Botija Black Olives (Glossy dark purple)
      const oliveGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const oliveMat = new THREE.MeshStandardMaterial({ color: 0x1e152a, roughness: 0.1, metalness: 0.2 });
      const olive1 = new THREE.Mesh(oliveGeo, oliveMat);
      olive1.position.set(0.1, 0.32, 0.55);
      olive1.scale.set(1, 1.25, 1);
      dishGroup.add(olive1);

      // Toasted Pecans
      const pecanGeo = new THREE.SphereGeometry(0.14, 12, 12);
      const pecanMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
      for (let i = 0; i < 5; i++) {
        const pec = new THREE.Mesh(pecanGeo, pecanMat);
        const angle = (i / 5) * Math.PI * 2;
        pec.position.set(Math.cos(angle) * 0.9, 0.26, Math.sin(angle) * 0.9);
        pec.scale.set(1.4, 0.6, 0.9);
        dishGroup.add(pec);
      }
    } else if (dishId === 'causa-limena') {
      // 🥔 CAUSA LIMEÑA DE CANGREJO REAL & PALTA: Yellow pressed potato terrine with layers
      const potatoBaseGeo = new THREE.CylinderGeometry(1.35, 1.35, 0.25, 32);
      const potatoMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.65 });
      const pBase = new THREE.Mesh(potatoBaseGeo, potatoMat);
      pBase.position.y = -0.05;
      dishGroup.add(pBase);

      // Avocado middle layer
      const avoGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.22, 32);
      const avoMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.5 });
      const avoLayer = new THREE.Mesh(avoGeo, avoMat);
      avoLayer.position.y = 0.16;
      dishGroup.add(avoLayer);

      // King crab meat layer
      const crabGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.22, 32);
      const crabMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.4 });
      const crabLayer = new THREE.Mesh(crabGeo, crabMat);
      crabLayer.position.y = 0.36;
      dishGroup.add(crabLayer);

      // Top potato crown
      const topGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.18, 32);
      const pTop = new THREE.Mesh(topGeo, potatoMat);
      pTop.position.y = 0.54;
      dishGroup.add(pTop);

      // Black olive droplet
      const oliveTop = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), new THREE.MeshStandardMaterial({ color: 0x1e152a, roughness: 0.1 }));
      oliveTop.position.set(0, 0.68, 0);
      dishGroup.add(oliveTop);
    } else if (dishId === 'risotto-porcini') {
      // 🍄 RISOTTO DE HONGOS PORCINI & TRUFA
      const risottoGeo = new THREE.CylinderGeometry(1.65, 1.75, 0.35, 32);
      const risottoMat = new THREE.MeshStandardMaterial({ color: 0xd6c4b2, roughness: 0.5 });
      const rMound = new THREE.Mesh(risottoGeo, risottoMat);
      rMound.position.y = 0.05;
      dishGroup.add(rMound);

      // Sautéed Porcini Mushroom Slices
      const mushGeo = new THREE.CylinderGeometry(0.35, 0.32, 0.1, 16);
      const mushMat = new THREE.MeshStandardMaterial({ color: 0x543d2b, roughness: 0.4 });
      for (let i = 0; i < 9; i++) {
        const m = new THREE.Mesh(mushGeo, mushMat);
        const angle = (i / 9) * Math.PI * 2;
        m.position.set(Math.cos(angle) * 0.85, 0.28, Math.sin(angle) * 0.85);
        m.rotation.set(0.3, Math.random() * Math.PI, 0.2);
        dishGroup.add(m);
      }

      // Shaved Black Truffle flakes
      const trufGeo = new THREE.BoxGeometry(0.2, 0.02, 0.15);
      const trufMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.8 });
      for (let i = 0; i < 14; i++) {
        const t = new THREE.Mesh(trufGeo, trufMat);
        t.position.set((Math.random() - 0.5) * 1.5, 0.28 + Math.random() * 0.06, (Math.random() - 0.5) * 1.5);
        t.rotation.y = Math.random() * Math.PI;
        dishGroup.add(t);
      }
    } else if (dishId === 'pollo-brasa') {
      // 🍗 POLLO A LA BRASA: Roasted quarter with crispy skin and french fries
      const chickenGeo = new THREE.SphereGeometry(1.2, 24, 24);
      const chickenMat = new THREE.MeshStandardMaterial({
        color: 0x78350f, // Golden charred roasted skin
        roughness: 0.35,
        metalness: 0.15
      });
      const ch = new THREE.Mesh(chickenGeo, chickenMat);
      ch.position.set(0, 0.35, 0);
      ch.scale.set(1.3, 0.7, 1);
      ch.castShadow = true;
      dishGroup.add(ch);

      // Golden Fries on the side
      const fryGeo = new THREE.BoxGeometry(0.14, 0.14, 1.2);
      const fryMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
      for (let i = 0; i < 16; i++) {
        const fry = new THREE.Mesh(fryGeo, fryMat);
        fry.position.set(-0.9 + Math.random() * 0.4, 0.2 + Math.random() * 0.2, -0.6 + i * 0.08);
        fry.rotation.set(0.2, Math.random() * 0.4, Math.random() * 0.3);
        dishGroup.add(fry);
      }
    } else if (dishId === 'smoked-old-fashioned') {
      // Transparent Coaster
      const coasterGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.08, 36);
      const coasterMat = new THREE.MeshStandardMaterial({
        color: 0x24252a,
        roughness: 0.5
      });
      const coaster = new THREE.Mesh(coasterGeo, coasterMat);
      coaster.position.y = -0.35;
      coaster.receiveShadow = true;
      dishGroup.add(coaster);
    } else {
      // Round Artisanal Ceramic Plate
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

      const rimGeo = new THREE.TorusGeometry(2.12, 0.045, 16, 64);
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0xd97706, // Amber / Gold Rim
        roughness: 0.25,
        metalness: 0.85
      });
      const bowlRim = new THREE.Mesh(rimGeo, rimMat);
      bowlRim.rotation.x = Math.PI / 2;
      bowlRim.position.y = 0.21;
      dishGroup.add(bowlRim);
    }

    // Shadow Floor
    const tableGeo = new THREE.CircleGeometry(3.6, 48);
    const tableMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.49;
    table.receiveShadow = true;
    scene.add(table);

    // ==========================================
    // 🍲 SPECIALIZED 3D FOOD GEOMETRIES PER DISH
    // ==========================================
    let steamParticles: THREE.Points | null = null;
    let steamGeo: THREE.BufferGeometry | null = null;
    const steamCount = 38;
    let steamSpeeds: Float32Array | null = null;

    if (dishId === 'lomo-saltado') {
      // 🥩 LOMO SALTADO AL WOK: Beef Tenderloin, Red Onions, Tomatoes, Fries, Cilantro
      const moundGeo = new THREE.CylinderGeometry(1.6, 1.7, 0.25, 24);
      const moundMat = new THREE.MeshStandardMaterial({ color: 0x3f2214, roughness: 0.7 });
      const mound = new THREE.Mesh(moundGeo, moundMat);
      mound.position.y = -0.05;
      dishGroup.add(mound);

      // Crispy Native Potato Fries (yellow prisms)
      const fryGeo = new THREE.BoxGeometry(0.14, 0.14, 1.15);
      const fryMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 });
      for (let i = 0; i < 18; i++) {
        const fry = new THREE.Mesh(fryGeo, fryMat);
        const angle = Math.random() * Math.PI * 2;
        const r = 0.3 + Math.random() * 0.9;
        fry.position.set(Math.cos(angle) * r, 0.25 + Math.random() * 0.25, Math.sin(angle) * r);
        fry.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.5);
        fry.castShadow = true;
        dishGroup.add(fry);
      }

      // Glazed Beef Tenderloin Cubes (Charred with glossy reduction shine)
      const beefGeo = new THREE.BoxGeometry(0.38, 0.26, 0.38);
      const beefMat = new THREE.MeshStandardMaterial({
        color: 0x581c0c,
        roughness: 0.2, // Shiny glaze!
        metalness: 0.1
      });
      for (let i = 0; i < 16; i++) {
        const beef = new THREE.Mesh(beefGeo, beefMat);
        const angle = Math.random() * Math.PI * 2;
        const r = 0.25 + Math.random() * 0.95;
        beef.position.set(Math.cos(angle) * r, 0.35 + Math.random() * 0.3, Math.sin(angle) * r);
        beef.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
        beef.castShadow = true;
        dishGroup.add(beef);
      }

      // Caramelized Red Onion Wedges
      const onionGeo = new THREE.TorusGeometry(0.28, 0.06, 8, 16, Math.PI * 0.8);
      const onionMat = new THREE.MeshStandardMaterial({ color: 0x9d174d, roughness: 0.3 });
      for (let i = 0; i < 14; i++) {
        const onion = new THREE.Mesh(onionGeo, onionMat);
        const angle = Math.random() * Math.PI * 2;
        const r = 0.2 + Math.random() * 1.1;
        onion.position.set(Math.cos(angle) * r, 0.38 + Math.random() * 0.25, Math.sin(angle) * r);
        onion.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dishGroup.add(onion);
      }

      // Sautéed Ripe Tomato Wedges
      const tomatoGeo = new THREE.BoxGeometry(0.35, 0.15, 0.22);
      const tomatoMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.25 });
      for (let i = 0; i < 10; i++) {
        const tomato = new THREE.Mesh(tomatoGeo, tomatoMat);
        const angle = Math.random() * Math.PI * 2;
        const r = 0.3 + Math.random() * 0.9;
        tomato.position.set(Math.cos(angle) * r, 0.4 + Math.random() * 0.2, Math.sin(angle) * r);
        tomato.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.4);
        dishGroup.add(tomato);
      }

      // Fresh Cilantro Leaves
      const cilantroGeo = new THREE.CircleGeometry(0.06, 6);
      const cilantroMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, side: THREE.DoubleSide });
      for (let i = 0; i < 28; i++) {
        const cilantro = new THREE.Mesh(cilantroGeo, cilantroMat);
        const angle = Math.random() * Math.PI * 2;
        const r = 0.15 + Math.random() * 1.2;
        cilantro.position.set(Math.cos(angle) * r, 0.55 + Math.random() * 0.15, Math.sin(angle) * r);
        cilantro.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        dishGroup.add(cilantro);
      }
    } else if (dishId === 'wagyu-a5') {
      // 🥩 WAGYU RIBEYE A5: Thick seared steak on slate with truffle and rosemary
      const steakGeo = new THREE.BoxGeometry(2.4, 0.45, 1.4);
      const steakMat = new THREE.MeshStandardMaterial({
        color: 0x3d1711,
        roughness: 0.3,
        metalness: 0.1
      });
      const steak = new THREE.Mesh(steakGeo, steakMat);
      steak.position.set(0, 0.05, 0);
      steak.rotation.y = 0.2;
      steak.castShadow = true;
      dishGroup.add(steak);

      // Shaved Black Truffle Slices
      const truffleGeo = new THREE.CircleGeometry(0.18, 12);
      const truffleMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.9, side: THREE.DoubleSide });
      for (let i = 0; i < 7; i++) {
        const tr = new THREE.Mesh(truffleGeo, truffleMat);
        tr.position.set(-0.6 + i * 0.22, 0.3, -0.2 + (i % 2) * 0.35);
        tr.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.2;
        dishGroup.add(tr);
      }

      // Fresh Rosemary Sprig
      const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x166534 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(0.7, 0.32, -0.3);
      stem.rotation.z = Math.PI / 2.5;
      stem.rotation.y = 0.6;
      dishGroup.add(stem);

      // Sea Salt Flakes (White crystals)
      const saltGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
      const saltMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
      for (let i = 0; i < 22; i++) {
        const s = new THREE.Mesh(saltGeo, saltMat);
        s.position.set((Math.random() - 0.5) * 2.2, 0.3, (Math.random() - 0.5) * 1.2);
        dishGroup.add(s);
      }
    } else if (dishId === 'pulpo-brasa') {
      // 🐙 PULPO ANTICUCHERO: Grilled octopus tentacle with roasted baby potatoes
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.1, 0.1, -0.4),
        new THREE.Vector3(-0.3, 0.65, -0.1),
        new THREE.Vector3(0.5, 0.8, 0.2),
        new THREE.Vector3(1.1, 0.35, 0.3),
        new THREE.Vector3(1.25, 0.15, -0.2)
      ]);
      const tentacleGeo = new THREE.TubeGeometry(curve, 32, 0.22, 16, false);
      const tentacleMat = new THREE.MeshStandardMaterial({
        color: 0x881337,
        roughness: 0.25,
        metalness: 0.15
      });
      const tentacle = new THREE.Mesh(tentacleGeo, tentacleMat);
      tentacle.castShadow = true;
      dishGroup.add(tentacle);

      // Roasted Baby Potatoes (Golden spheres)
      const potGeo = new THREE.SphereGeometry(0.3, 16, 16);
      const potMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
      for (let i = 0; i < 6; i++) {
        const pot = new THREE.Mesh(potGeo, potMat);
        const angle = (i / 6) * Math.PI * 2;
        pot.position.set(Math.cos(angle) * 1.1, 0.15, Math.sin(angle) * 1.1);
        pot.castShadow = true;
        dishGroup.add(pot);
      }
    } else if (dishId === 'tartar-nikkei') {
      // 🍣 TARTAR & CEVICHE NIKKEI: Layered cylinder of fresh salmon, tuna & avocado
      const baseAvoGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 32);
      const baseAvoMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.5 });
      const avo = new THREE.Mesh(baseAvoGeo, baseAvoMat);
      avo.position.y = 0.05;
      dishGroup.add(avo);

      const fishGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.45, 32);
      const fishMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3 });
      const fish = new THREE.Mesh(fishGeo, fishMat);
      fish.position.y = 0.42;
      dishGroup.add(fish);

      // Crispy Plantain Chips (Chifles)
      const chipGeo = new THREE.BoxGeometry(0.04, 0.85, 0.35);
      const chipMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
      const chip1 = new THREE.Mesh(chipGeo, chipMat);
      chip1.position.set(0.3, 0.85, 0.2);
      chip1.rotation.z = 0.4;
      chip1.rotation.y = 0.6;
      dishGroup.add(chip1);

      const chip2 = new THREE.Mesh(chipGeo, chipMat);
      chip2.position.set(-0.3, 0.85, -0.1);
      chip2.rotation.z = -0.35;
      chip2.rotation.y = -0.4;
      dishGroup.add(chip2);
    } else if (dishId === 'esfera-chocolate') {
      // 🍫 ESFERA DE CHOCOLATE VALRHONA: Glossy dark chocolate dome with caramel drizzle
      const sphereGeo = new THREE.SphereGeometry(1.1, 36, 36);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x271610,
        roughness: 0.15,
        metalness: 0.3
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.y = 0.55;
      sphere.castShadow = true;
      dishGroup.add(sphere);

      // Warm Salted Caramel Ribbon
      const caramelGeo = new THREE.TorusGeometry(1.12, 0.05, 16, 48);
      const caramelMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.1,
        metalness: 0.6
      });
      const caramel = new THREE.Mesh(caramelGeo, caramelMat);
      caramel.position.y = 0.75;
      caramel.rotation.x = Math.PI / 3;
      dishGroup.add(caramel);
    } else if (dishId === 'smoked-old-fashioned') {
      // 🥃 SMOKED OLD FASHIONED: Crystal glass, square ice, Bourbon, orange peel
      const glassGeo = new THREE.CylinderGeometry(0.9, 0.8, 1.6, 24, 1, true);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.9,
        opacity: 1,
        transparent: true,
        roughness: 0.05,
        ior: 1.5
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.y = 0.45;
      dishGroup.add(glass);

      // Bourbon liquid
      const bourbonGeo = new THREE.CylinderGeometry(0.85, 0.75, 1.0, 24);
      const bourbonMat = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        transparent: true,
        opacity: 0.82,
        roughness: 0.1
      });
      const bourbon = new THREE.Mesh(bourbonGeo, bourbonMat);
      bourbon.position.y = 0.18;
      dishGroup.add(bourbon);

      // Square clear ice block
      const iceGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
      const iceMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.95,
        transparent: true,
        roughness: 0.1
      });
      const ice = new THREE.Mesh(iceGeo, iceMat);
      ice.position.y = 0.35;
      ice.rotation.y = 0.4;
      dishGroup.add(ice);

      // Orange peel twist
      const peelGeo = new THREE.TorusGeometry(0.4, 0.05, 8, 16, Math.PI * 1.5);
      const peelMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.4 });
      const peel = new THREE.Mesh(peelGeo, peelMat);
      peel.position.set(0.2, 0.9, 0);
      peel.rotation.x = Math.PI / 2.2;
      dishGroup.add(peel);
    } else {
      // 🍚 DEFAULT & ARROZ CHAUFA WOK: Golden fried rice, Char Siu pork, egg ribbons, prawns, scallions
      const moundGeo = new THREE.SphereGeometry(1.82, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.49);
      const pos = moundGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const noise =
          Math.sin(vx * 6.5) * Math.cos(vz * 6.5) * 0.09 +
          Math.sin(vy * 9.0) * 0.045 +
          Math.cos(vx * 12.0) * 0.02;
        pos.setXYZ(i, vx + noise * 0.4, vy + noise * 0.75, vz + noise * 0.4);
      }
      moundGeo.computeVertexNormals();

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

      // Pork Char Siu cubes
      const meatGeo = new THREE.BoxGeometry(0.26, 0.17, 0.26);
      const meatMat = new THREE.MeshStandardMaterial({
        color: 0x991b1b,
        roughness: 0.2,
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

      // Scallions (Cebollita China)
      const scallionGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.09, 12, 1, true);
      const scallionMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
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

      // Egg ribbons
      const eggGeo = new THREE.BoxGeometry(0.32, 0.05, 0.13);
      const eggMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
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

      // Jumbo Prawns
      const prawnGeo = new THREE.TorusGeometry(0.24, 0.08, 14, 22, Math.PI * 1.4);
      const prawnMat = new THREE.MeshStandardMaterial({
        color: 0xfb7185,
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
    }

    // Steam particles for hot dishes
    if (dishId !== 'smoked-old-fashioned' && dishId !== 'tartar-nikkei') {
      steamGeo = new THREE.BufferGeometry();
      const steamPositions = new Float32Array(steamCount * 3);
      steamSpeeds = new Float32Array(steamCount);
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
      steamParticles = new THREE.Points(steamGeo, steamMat);
      dishGroup.add(steamParticles);
    }

    // ==========================================
    // 🖐️ SMART TOUCH: Allow vertical page scrolling!
    // ==========================================
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let prevX = 0;
    let prevY = 0;
    let isTouchScroll = false;

    const domEl = renderer.domElement;
    domEl.style.touchAction = 'pan-y'; // Critical for native mobile page scrolling

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      isTouchScroll = false;
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
      if (!isDragging || isTouchScroll) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - prevX;
      const dy = clientY - prevY;

      // Detect vertical scroll gesture vs horizontal 3D rotation
      if ('touches' in e) {
        const totalDx = Math.abs(clientX - startX);
        const totalDy = Math.abs(clientY - startY);
        if (totalDy > totalDx && totalDy > 10) {
          isTouchScroll = true;
          isDragging = false;
          return; // Allow page to scroll freely!
        }
      }

      targetRotYRef.current += dx * 0.01;
      targetRotXRef.current += dy * 0.007;
      targetRotXRef.current = Math.max(0.12, Math.min(1.18, targetRotXRef.current));

      prevX = clientX;
      prevY = clientY;
    };

    const onPointerUp = () => {
      isDragging = false;
      isTouchScroll = false;
      setTimeout(() => {
        if (isSubscribed) {
          autoRotateRef.current = true;
        }
      }, 4000);
    };

    domEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    domEl.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // ==========================================
    // 🎬 ANIMATION LOOP
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

      // Float steam
      if (steamGeo && steamSpeeds) {
        const posArr = steamGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < steamCount; i++) {
          posArr[i * 3 + 1] += steamSpeeds[i];
          if (posArr[i * 3 + 1] > 2.5) {
            posArr[i * 3 + 1] = 0.8;
          }
        }
        steamGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !isSubscribed) return;
      const newW = container.clientWidth || 360;
      const newH = container.clientHeight || 280;
      camera.aspect = newW / newH;
      const mobile = newW < 480;
      camera.position.set(0, mobile ? 3.6 : 3.2, mobile ? 4.8 : 4.2);
      camera.lookAt(0, 0, 0);
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

      // Optimización de memoria: Destruir geometrías y materiales de la GPU
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => mat.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });

      renderer.dispose();
    };
  }, [dishId, onInteract, enableCameraBg]);

  const setAngle = (angleName: 'iso' | 'top' | 'side') => {
    setCurrentAngle(angleName);
    autoRotateRef.current = false;

    // Calculamos el ángulo frontal (0°) más cercano según las vueltas que haya dado el plato
    const currentY = targetRotYRef.current;
    const PI2 = Math.PI * 2;
    const nearestFrontY = Math.round(currentY / PI2) * PI2;

    if (angleName === 'top') {
      targetRotXRef.current = 1.15; // Vista Cénital (Desde arriba)
      targetRotYRef.current = nearestFrontY; 
    } else if (angleName === 'side') {
      targetRotXRef.current = 0.18; // Vista Lateral (Casi a ras de mesa)
      targetRotYRef.current = nearestFrontY;
    } else if (angleName === 'iso') {
      targetRotXRef.current = 0.42; // Vista 45° clásica
      targetRotYRef.current = nearestFrontY;
    }

    // Reanudamos la rotación automática después de 4.5 segundos
    setTimeout(() => {
      autoRotateRef.current = true;
    }, 4500);
  };

  return (
    <div className={`relative w-full ${heightClass} ${enableCameraBg ? 'bg-transparent' : 'bg-[#131418]'} overflow-hidden select-none touch-pan-y`}>
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {!enableCameraBg && (
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#1a1b20] to-transparent pointer-events-none" />
      )}

      {/* Top Floating Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-[#ff5708] text-white font-mono-code text-[9px] sm:text-[10px] tracking-wide font-bold shadow-lg flex items-center gap-1">
            <svg className="w-3 h-3 text-amber-200 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
            </svg>
            <span>VISOR 3D</span>
          </span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1c1b1d]/90 backdrop-blur-md border border-[#ff5708]/40 text-[#ffb59c] text-[9px] sm:text-[10px] font-mono-code">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{fps} FPS</span>
        </div>
      </div>

      {/* Camera Angle Controls */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-auto">
        <div className="flex items-center gap-1 bg-[#121316]/90 backdrop-blur-md p-0.5 sm:p-1 rounded-lg border border-[#2a2a2c] shadow-lg">
          <button
            type="button"
            className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono-code transition-colors cursor-pointer ${
              currentAngle === 'iso' ? 'bg-[#ff5708] text-white font-bold' : 'text-[#bcbbc5] hover:text-white'
            }`}
            onClick={() => setAngle('iso')}
          >
            45°
          </button>
          <button
            type="button"
            className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono-code transition-colors cursor-pointer ${
              currentAngle === 'top' ? 'bg-[#ff5708] text-white font-bold' : 'text-[#bcbbc5] hover:text-white'
            }`}
            onClick={() => setAngle('top')}
          >
            Cénital
          </button>
          <button
            type="button"
            className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono-code transition-colors cursor-pointer ${
              currentAngle === 'side' ? 'bg-[#ff5708] text-white font-bold' : 'text-[#bcbbc5] hover:text-white'
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
