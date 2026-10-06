import { ActivePromoOffer, MenuItem, TableStatus, OrderTicket, StaffMember, SystemConfigState } from '../types';
import { calculatePromoPricing } from '../utils/promo';

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'chaufa-wok',
    name: 'Arroz Chaufa Especial Wok de Autor',
    description: 'Arroz de grano largo salteado al wok a fuego vivo con panceta Char Siu confitada, langostinos jumbo, tortilla de huevo dorado, cebollita china crujiente y toque ahumado de aceite de ajonjolí tostado.',
    price: 58.00,
    category: 'fondos',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcYPFrcetdgC1dazh0ANWzgwRHx4V-L3cnceNamoMrs5PbK6Pj0OxoLpB3w9BBpc-2x3NTwXneDFMMfHNl2qNkle7Y1vbe6ziJYqyI84o_9MSrl4zNTm-VJKLATujDUKDux_S5dT5aDZ4eKuxcyNs-D4iIMfoEElxRqe49eBMjs0yIVqMaNq_iYLU5IJf8tPiNhU1LTXAGOUwV9q6fYDF9ZXhbcu1x3Ou4VX1ebIGsV9pHlD-fwZNFJQ',
    image_url_hd: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcYPFrcetdgC1dazh0ANWzgwRHx4V-L3cnceNamoMrs5PbK6Pj0OxoLpB3w9BBpc-2x3NTwXneDFMMfHNl2qNkle7Y1vbe6ziJYqyI84o_9MSrl4zNTm-VJKLATujDUKDux_S5dT5aDZ4eKuxcyNs-D4iIMfoEElxRqe49eBMjs0yIVqMaNq_iYLU5IJf8tPiNhU1LTXAGOUwV9q6fYDF9ZXhbcu1x3Ou4VX1ebIGsV9pHlD-fwZNFJQ',
    rating: 5.0,
    reviewsCount: 310,
    allergens: ['Mariscos', 'Huevo', 'Sésamo', 'Soya'],
    badge: 'NUEVO LANZAMIENTO',
    tag: 'WOK DE AUTOR',
    dietary: 'Wok Hei 60 FPS',
    pairing: 'Cerveza artesanal o Té Jazmín',
    has3D: true,
    prepTime: 'Salteado: 4 min',
    popularityShare: 48,
    ordersCount: 38
  },
  {
    id: 'wagyu-a5',
    name: 'Wagyu Ribeye A5 Trufado',
    description: 'Corte sellado a la leña con reducción de oporto y lascas de trufa negra fresca, mousseline de chirivía.',
    price: 115.00,
    category: 'fondos',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsuX-oMvRCVEG-2XXQw3CI41kEEXkH_kkKwomfeLKSGAtgdEvt40ObuRfs9T5tQ4CKxIcWqx2Ixp3rIf87k3_X9JMT6lEhaODsh3pNltRoKxBCEr9rvmDaJFg8tEOhpTdBD7sCd02qdWV40F3tHE-UcyEvRWmuqWBa3A7qK2BuNCnhc7jUVhAVnqaSDRfRM0n7w2Hpvu_AVvLw1HZ_JCcXrNV2gDiH-hzJRV94lq4P04fN4x6MiDwNKA',
    image_url_hd: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsuX-oMvRCVEG-2XXQw3CI41kEEXkH_kkKwomfeLKSGAtgdEvt40ObuRfs9T5tQ4CKxIcWqx2Ixp3rIf87k3_X9JMT6lEhaODsh3pNltRoKxBCEr9rvmDaJFg8tEOhpTdBD7sCd02qdWV40F3tHE-UcyEvRWmuqWBa3A7qK2BuNCnhc7jUVhAVnqaSDRfRM0n7w2Hpvu_AVvLw1HZ_JCcXrNV2gDiH-hzJRV94lq4P04fN4x6MiDwNKA',
    rating: 4.9,
    reviewsCount: 184,
    allergens: ['Lácteos'],
    badge: 'CHEF CHOICE',
    tag: 'A5 MIYAZAKI',
    dietary: 'Gluten Free',
    pairing: 'Pinot Noir',
    has3D: true,
    prepTime: 'Parrilla: 14 min',
    popularityShare: 41,
    ordersCount: 24
  },
  {
    id: 'lomo-saltado',
    name: 'Lomo Saltado al Wok de Autor',
    description: 'Lomo fino saltado a fuego vivo con cebolla morada glaseada, tomates cherry, papas nativas crocantes y jugo de reducción al pisco.',
    price: 68.00,
    category: 'fondos',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCG8U8wjqtkNywYW5SViNtiOewo0on_DNwCO1vtyigp9SUyFzFb_ElBeuuUcS4meggmUfeq3lIguhhSVOBnhdmBn24N_i7a7Br6N7R823cSHQl106XxGmQmChJmDXoRW9mHyHQFltqUR6gymqIV3CE3BXqr9_Dqu80S_mZg_81AW_IR--rcoFDLElmjmeEnh57bJvqza_JIoLmmPozPwjsBxq5fWnNuZdnCiVLL20Mhr0QEvQVqZHZrJA',
    image_url_hd: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCG8U8wjqtkNywYW5SViNtiOewo0on_DNwCO1vtyigp9SUyFzFb_ElBeuuUcS4meggmUfeq3lIguhhSVOBnhdmBn24N_i7a7Br6N7R823cSHQl106XxGmQmChJmDXoRW9mHyHQFltqUR6gymqIV3CE3BXqr9_Dqu80S_mZg_81AW_IR--rcoFDLElmjmeEnh57bJvqza_JIoLmmPozPwjsBxq5fWnNuZdnCiVLL20Mhr0QEvQVqZHZrJA',
    rating: 4.9,
    reviewsCount: 240,
    allergens: ['Gluten', 'Soya'],
    badge: 'CLÁSICO GOURMET',
    tag: 'WOK HEI',
    dietary: 'Wok Hei',
    pairing: 'Malbec Reserva',
    has3D: true,
    prepTime: 'Salteado: 6 min',
    popularityShare: 36,
    ordersCount: 29
  },
  {
    id: 'pulpo-brasa',
    name: 'Pulpo Anticuchero a la Brasa',
    description: 'Tentáculo de pulpo macerado en ají panca y especias andinas, sellado al carbón con mousseline de papas doradas y chimichurri rústico.',
    price: 72.00,
    category: 'fondos',
   image: '/images/pulpo-anticuchero.jpg',
    image_url_hd: '/images/pulpo-anticuchero.jpg',
    rating: 4.9,
    reviewsCount: 185,
    allergens: ['Moluscos'],
    badge: 'ESPECIALIDAD',
    tag: 'A LAS BRASAS',
    dietary: 'A las Brasas',
    pairing: 'Sauvignon Blanc',
    has3D: true,
    prepTime: 'Brasa: 12 min',
    popularityShare: 24,
    ordersCount: 14
  },
  {
    id: 'tartar-nikkei',
    name: 'Tartar & Ceviche Nikkei',
    description: 'Atún rojo y salmón fresco curado con leche de tigre de maracuyá, palta tatemada y crocantes chips de plátano verde.',
    price: 52.00,
    category: 'entradas',
    image: '/images/tartar-salmon.jpg',
    image_url_hd: '/images/tartar-salmon.jpg',
    rating: 4.8,
    reviewsCount: 112,
    allergens: ['Pescado', 'Sésamo', 'Soya'],
    badge: 'FRESCO',
    tag: 'FUSIÓN NIKKEI',
    dietary: 'Picante Suave',
    pairing: 'Pisco Sour',
    has3D: true,
    prepTime: 'Frío: 3 min',
    popularityShare: 32,
    ordersCount: 19
  },
  {
    id: 'causa-limena',
    name: 'Causa Limeña de Cangrejo Real & Palta',
    description: 'Terrina de papa amarilla al ají amarillo prensada a mano, rellena de pulpa de cangrejo real, palta tatemada, huevo de codorniz y emulsión de botija.',
    price: 54.00,
    category: 'entradas',
    image: '/images/causa-limena.jpg',
    image_url_hd: '/images/causa-limena.jpg',
    rating: 4.8,
    reviewsCount: 96,
    allergens: ['Crustáceos', 'Huevo'],
    badge: 'ENTRADA DE AUTOR',
    tag: 'CANGREJO REAL',
    dietary: 'Gluten Free',
    pairing: 'Albariño',
    has3D: true,
    prepTime: 'Frío: 4 min',
    popularityShare: 22,
    ordersCount: 12
  },
  {
    id: 'risotto-porcini',
    name: 'Risotto de Hongos Porcini & Trufa',
    description: 'Arroz arborio cremoso mantecado con mantequilla de trufa negra, mix de setas silvestres, porcini caramelizados y lascas de parmigiano 24 meses.',
    price: 62.00,
    category: 'fondos',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVtwNSINEAacOuIcUaJWCXeiIdNj7PH2xN-vzf7-VV9M3bS2rv-xW7ZDxnLWxEgxKl4xcP1hYRjcqeLRF7RB2B0Y8ogOwteUtvLpdPOXobFjJzhl9HzvvX0nCoABLMS1jdftMDkCUucGwfRGSnK4kXULAIVaPBh2_QDs_6IKuULt-fcFbLxgZ_plrNgQy-pEMCOJw8jraRE0CKZHcsjJt9JjQF3tKMnyLHHkSWUovHxJdmMs46PG-1KQ',
    image_url_hd: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVtwNSINEAacOuIcUaJWCXeiIdNj7PH2xN-vzf7-VV9M3bS2rv-xW7ZDxnLWxEgxKl4xcP1hYRjcqeLRF7RB2B0Y8ogOwteUtvLpdPOXobFjJzhl9HzvvX0nCoABLMS1jdftMDkCUucGwfRGSnK4kXULAIVaPBh2_QDs_6IKuULt-fcFbLxgZ_plrNgQy-pEMCOJw8jraRE0CKZHcsjJt9JjQF3tKMnyLHHkSWUovHxJdmMs46PG-1KQ',
    rating: 4.8,
    reviewsCount: 142,
    allergens: ['Lácteos'],
    badge: 'VEGETARIANO',
    tag: 'TRUFA NEGRA',
    dietary: 'Vegetariano',
    pairing: 'Pinot Noir',
    has3D: true,
    prepTime: 'Sauté: 11 min',
    popularityShare: 28,
    ordersCount: 16
  },
  {
    id: 'esfera-chocolate',
    name: 'Esfera de Chocolate Valrhona & Caramelo',
    description: 'Domo de chocolate negro 70% relleno de mousse aterciopelado, bañado con caramelo tibio de sal de Maras, crumble de cacao y coulis de maracuyá.',
    price: 42.00,
    category: 'postres',
    image: '/images/esfera-chocolate.jpg',
    image_url_hd: '/images/esfera-chocolate.jpg',
    rating: 5.0,
    reviewsCount: 178,
    allergens: ['Lácteos', 'Gluten'],
    badge: 'POSTRE SIGNATURE',
    tag: 'VALRHONA 70%',
    dietary: 'Postre de Autor',
    pairing: 'Oporto Tawny',
    has3D: true,
    prepTime: 'Postres: 5 min',
    popularityShare: 35,
    ordersCount: 22
  },
  {
    id: 'smoked-old-fashioned',
    name: 'Smoked Old Fashioned',
    description: 'Cóctel de autor con Bourbon premium, bitter de angostura, piel de naranja flameada y cubo de hielo tallado a mano bañado en humo aromático de roble.',
    price: 45.00,
    category: 'bebidas',
    image: '/images/smoked-old-fashioned.jpg',
    image_url_hd: '/images/smoked-old-fashioned.jpg',
    rating: 4.9,
    reviewsCount: 190,
    allergens: ['Alcohol'],
    badge: 'COCTEL SIGNATURE',
    tag: 'ROBLE AHUMADO',
    dietary: 'Barra de Autor',
    pairing: 'Pisco & Bourbon Infused',
    has3D: false,
    prepTime: 'Bar: 3 min',
    popularityShare: 54,
    ordersCount: 31
  }
];

export const INITIAL_TABLES: TableStatus[] = [
  {
    id: 't-01',
    number: '01',
    pax: 4,
    capacity: 4,
    zone: 'salon',
    status: 'comiendo',
    waiter: 'Marcos R.',
    amount: 168.00,
    timeActive: '32 min act.',
    dishesCount: '3 platos • 2 maridajes'
  },
  {
    id: 't-02',
    number: '02',
    pax: 2,
    capacity: 2,
    zone: 'salon',
    status: 'demora',
    waiter: 'Lucía M.',
    amount: 114.50,
    timeActive: '18 min en prep',
    kdsDelayInfo: 'RETRASO KDS: PARRILLA - 1x Wagyu Ribeye A5'
  },
  {
    id: 't-03',
    number: '03',
    pax: 6,
    capacity: 6,
    zone: 'salon',
    status: 'cuenta',
    waiter: 'Roberto V.',
    amount: 342.00,
    dishesCount: 'Tarjeta Visa / Split (2)'
  },
  {
    id: 't-04',
    number: '04',
    pax: 2,
    capacity: 2,
    zone: 'salon',
    status: 'qr',
    waiter: 'Auto-pedido QR',
    amount: 58.00,
    timeActive: 'Enviado 4m ago',
    dishesCount: '2 Cócteles + 1 Entrada'
  },
  {
    id: 't-05',
    number: '05',
    pax: 4,
    capacity: 4,
    zone: 'salon',
    status: 'disponible',
    waiter: 'Salón Lounge'
  },
  {
    id: 't-06',
    number: '06',
    pax: 2,
    capacity: 2,
    zone: 'terraza',
    status: 'disponible',
    waiter: 'Terraza',
    reservationTime: '21:30',
    reservationName: 'M. Gómez'
  },
  {
    id: 't-07',
    number: '07',
    pax: 4,
    capacity: 4,
    zone: 'barra',
    status: 'comiendo',
    waiter: 'Mateo R.',
    amount: 98.00,
    timeActive: '15 min act.',
    dishesCount: '2 Cócteles • 1 Tapa'
  },
  {
    id: 't-08',
    number: '08',
    pax: 4,
    capacity: 4,
    zone: 'salon',
    status: 'comiendo',
    waiter: 'Lucía M.',
    amount: 210.00,
    timeActive: '45 min act.',
    dishesCount: '4 platos principales'
  },
  {
    id: 't-09',
    number: '09',
    pax: 2,
    capacity: 4,
    zone: 'salon',
    status: 'comiendo',
    waiter: 'Carlos D.',
    amount: 140.00,
    timeActive: '20 min act.',
    dishesCount: '2 Chaufa Imperial'
  },
  {
    id: 't-10',
    number: '10',
    pax: 0,
    capacity: 2,
    zone: 'terraza',
    status: 'disponible',
    waiter: 'Terraza Lounge'
  },
  {
    id: 't-11',
    number: '11',
    pax: 0,
    capacity: 4,
    zone: 'terraza',
    status: 'disponible',
    waiter: 'Terraza Lounge'
  },
  {
    id: 't-12',
    number: '12',
    pax: 0,
    capacity: 6,
    zone: 'barra',
    status: 'disponible',
    waiter: 'Barra Alta'
  }
];

export const INITIAL_ORDERS: OrderTicket[] = [
  {
    id: 'cmd-0482',
    table: 'MESA 04',
    pax: 2,
    timeAgo: 'Hace 2m',
    createdTime: '20:42:15',
    origin: 'QR COMENSAL',
    status: 'por-validar',
    items: [
      { id: 'i-1', name: '1x Wagyu Ribeye A5 250g', quantity: 1, price: 115.00, notes: 'Término: 3/4 sellado', station: 'Parrilla' },
      { id: 'i-2', name: '1x Tartar Nikkei Trufado', quantity: 1, price: 42.50, allergen: 'Alérgeno: Sésamo', station: 'Cuarto Frío' },
      { id: 'i-3', name: '1x Copa Gran Malbec Reserva', quantity: 1, price: 21.00, notes: 'Bodega 01', station: 'Barra' }
    ],
    subtotal: 178.50,
    total: 178.50
  },
  {
    id: 'cmd-0480',
    table: 'MESA 12',
    pax: 4,
    timeAgo: 'Hace 4m',
    createdTime: '20:39:10',
    origin: 'GARZÓN',
    waiter: 'Carlos Durand',
    status: 'por-validar',
    items: [
      { id: 'i-4', name: '2x Cóctel Ahumado Roble', quantity: 2, price: 72.00, station: 'Mixología' },
      { id: 'i-5', name: '1x Pulpo Anticuchero al Carbón', quantity: 1, price: 54.00, station: 'Parrilla' }
    ],
    subtotal: 126.00,
    total: 126.00
  },
  {
    id: 'tk-108',
    table: '#TK-108',
    pax: 1,
    timeAgo: 'Hace 1m',
    createdTime: '20:44:00',
    origin: 'DELIVERY APP',
    status: 'por-validar',
    items: [
      { id: 'i-6', name: '2x Smash Burger Dry-Aged C/ Papas Trufa', quantity: 2, price: 84.00, notes: 'Empaque térmico reforzado', station: 'Parrilla' }
    ],
    subtotal: 84.00,
    total: 84.00
  },
  {
    id: 'cmd-0475',
    table: 'MESA 02',
    pax: 2,
    timeAgo: '18:45 min',
    createdTime: '20:25:00',
    origin: 'GARZÓN',
    waiter: 'Lucía Mendoza',
    status: 'en-cocina',
    isCritical: true,
    preparationPercent: 85,
    stationTarget: 'PARRILLA & SAUTÉ',
    items: [
      { id: 'i-7', name: '1x Lomo Saltado Criollo Wagyu', quantity: 1, price: 68.00, station: 'Wok 01' },
      { id: 'i-8', name: '1x Risotto Hongos Porcini Silvestres', quantity: 1, price: 62.00, station: 'Sauté 03' }
    ],
    subtotal: 130.00,
    total: 130.00
  },
  {
    id: 'cmd-0478',
    table: 'MESA 07',
    pax: 4,
    timeAgo: '03:20 min',
    createdTime: '20:40:12',
    origin: 'GARZÓN',
    waiter: 'Mateo Rivera',
    status: 'en-cocina',
    preparationPercent: 35,
    stationTarget: 'BARRA PRINCIPAL',
    items: [
      { id: 'i-9', name: "2x Cócteles de Autor 'Pisco Infused'", quantity: 2, price: 78.00, station: 'Barra Mix' }
    ],
    subtotal: 78.00,
    total: 78.00
  },
  {
    id: 'cmd-0476',
    table: 'MESA 09',
    pax: 2,
    timeAgo: '05:10 min',
    createdTime: '20:38:00',
    origin: 'GARZÓN',
    waiter: 'Carlos Durand',
    status: 'en-cocina',
    preparationPercent: 50,
    stationTarget: 'SALÓN CENTRAL',
    items: [
      { id: 'i-10', name: '2x Arroz Chaufa Especial Wok Imperial', quantity: 2, price: 116.00, station: 'Wok Station' }
    ],
    subtotal: 116.00,
    total: 116.00
  },
  {
    id: 'cmd-0470',
    table: 'MESA 01',
    pax: 4,
    timeAgo: 'Listo 2m',
    createdTime: '20:20:00',
    origin: 'GARZÓN',
    waiter: 'Marcos R.',
    status: 'pase-listo',
    runnerAssigned: 'Andrea Solís',
    items: [
      { id: 'i-11', name: '2x Wagyu A5 Filet Mignon', quantity: 2, price: 230.00, station: 'Campana 01' },
      { id: 'i-12', name: '1x Esfera Chocolate 70% Cacao', quantity: 1, price: 42.00, station: 'Postres' }
    ],
    subtotal: 272.00,
    total: 272.00
  },
  {
    id: 'cmd-0472',
    table: 'MESA 05',
    pax: 4,
    timeAgo: 'En espera',
    createdTime: '20:30:00',
    origin: 'QR COMENSAL',
    status: 'pase-listo',
    accountRequested: true,
    paymentMethod: 'POS Móvil Visa',
    items: [
      { id: 'i-13', name: '2x Tartar Nikkei', quantity: 2, price: 85.00 },
      { id: 'i-14', name: '1x Pisco Sour Catedral', quantity: 1, price: 44.40 }
    ],
    subtotal: 129.40,
    total: 129.40
  }
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'st-1',
    name: 'Martín Valenzuela',
    initials: 'M',
    role: 'admin',
    roleTitle: 'ADMIN GENERAL',
    status: 'En Turno Activo',
    assignment: 'Dirección Operativa & Caja Z',
    permissions: 'Acceso Total, Corte de Caja Z, Edición de Carta',
    lastAccess: 'Hoy 21:05',
    pin: '9021',
    isPinRevealed: false,
    username: 'admin',
    email: 'admin@aureabistro.pe',
    password: 'admin123'
  },
  {
    id: 'st-2',
    name: 'Lucía Mendoza',
    initials: 'L',
    role: 'floor',
    roleTitle: 'CAMARERO / SALA',
    status: 'Conectado (Móvil)',
    assignment: 'Salón Principal (Mesas 01-06)',
    permissions: 'TPV Móvil, Facturación Simple',
    lastAccess: 'Hoy 20:58',
    ordersToday: 34,
    pin: '1042',
    isPinRevealed: false,
    username: 'lucia.m',
    email: 'salon@aureabistro.pe',
    password: 'salon123'
  },
  {
    id: 'st-3',
    name: 'Carlos Durand',
    initials: 'C',
    role: 'floor',
    roleTitle: 'CAMARERO / SALA',
    status: 'Conectado (Móvil)',
    assignment: 'Terraza Lounge (Mesas 07-12)',
    permissions: 'TPV Móvil, Facturación Simple',
    lastAccess: 'Hoy 20:50',
    ordersToday: 28,
    pin: '1045',
    isPinRevealed: false,
    username: 'carlos.d',
    email: 'carlos@aureabistro.pe',
    password: 'salon123'
  },
  {
    id: 'st-4',
    name: 'Kenji Takahashi',
    initials: 'K',
    role: 'kitchen',
    roleTitle: 'JEFE DE COCINA / SOUS CHEF',
    status: 'En Cocina KDS',
    assignment: 'Estación Grill & Wok',
    permissions: 'KDS Cocina, Marcar Listo, Pausar Platos (Stock Cero)',
    lastAccess: 'Hoy 21:00',
    pin: '2001',
    isPinRevealed: false,
    username: 'chef.kenji',
    email: 'cocina@aureabistro.pe',
    password: 'kds123'
  },
  {
    id: 'st-5',
    name: 'Mateo Rivera',
    initials: 'M',
    role: 'bar',
    roleTitle: 'BARTENDER PRINCIPAL',
    status: 'Activo',
    assignment: 'Barra & Mixología',
    permissions: 'KDS Barra, Control de Licores, Anulación Coctelería',
    lastAccess: 'Hoy 20:45',
    pin: '3010',
    isPinRevealed: false,
    username: 'mateo.bar',
    email: 'bar@aureabistro.pe',
    password: 'bar123'
  },
  {
    id: 'st-6',
    name: 'Andrea Solís',
    initials: 'A',
    role: 'runner',
    roleTitle: 'RUNNER / ENTREGA',
    status: 'Activo',
    assignment: 'Pase & Despacho',
    permissions: 'Notificación de Pase Listo, Confirmar Entrega en Mesa',
    lastAccess: 'Hoy 20:55',
    pin: '4002',
    isPinRevealed: false,
    username: 'andrea.runner',
    email: 'runner@aureabistro.pe',
    password: 'run123'
  }
];

export const INITIAL_CONFIG: SystemConfigState = {
  branchName: 'AUREA Bistro - Miraflores',
  branchRuc: '20608941203',
  managerName: 'Martín Valenzuela - Gerente General',
  email: 'gerencia@aureabistro.pe',
  phone: '+51 984 521 002',
  soundAlerts: true,
  delayAlerts: true,
  paymentAlerts: true,
  lowStockAlerts: true,
  themeMode: 'obsidian',
  colorAccent: 'amber',
  density: 'compact',
  language: 'Español (Perú)',
  currency: 'Soles Peruanos (S/)',
  timezone: 'America/Lima (UTC-5)',
  timeFormat: '24h',
  printerIp: '192.168.1.120',
  printerPort: '9100',
  paperWidth: '80mm',
  autoCut: true,
  acousticBuzzer: true
};

// ==========================================
// CD-17 · Ofertas Flash del panel de administración
// ==========================================

/**
 * Oferta demo del panel: el precio promocional y el ahorro se derivan del
 * precio real de carta (nunca se escribe un precio "a mano").
 */
function seedPromoOffer(
  offer: Omit<ActivePromoOffer, 'originalPrice' | 'promoPrice' | 'discountPercent'> & {
    basePrice: number;
    percent: number;
  }
): ActivePromoOffer {
  const { basePrice, percent, ...rest } = offer;
  const pricing = calculatePromoPricing(basePrice, percent);
  return {
    ...rest,
    originalPrice: pricing.originalPrice,
    promoPrice: pricing.promoPrice,
    discountPercent: pricing.discountPercent
  };
}

/** Promociones en curso que alimentan la parrilla "Ofertas Activas Actualmente". */
export const INITIAL_ACTIVE_PROMO_OFFERS: ActivePromoOffer[] = [
  seedPromoOffer({
    id: 'promo-wagyu-15',
    mechanic: 'discount',
    mainDishId: 'wagyu-a5',
    complementaryDishId: '',
    badge: '-15% OFF',
    kicker: 'PLATO DEL CHEF',
    timingLabel: 'Termina en 12:35 (Hoy)',
    title: 'Wagyu Ribeye A5 Trufado',
    subtitle: '280g corte japonés con escamas de sal marina',
    image: '/images/pulpo-anticuchero.jpg',
    note: 'Ahorro S/ 17.25',
    isActive: true,
    basePrice: 115,
    percent: 15
  }),
  seedPromoOffer({
    id: 'promo-tartar-2da',
    mechanic: 'second_unit',
    mainDishId: 'tartar-nikkei',
    complementaryDishId: 'causa-limena',
    badge: '2da -50%',
    kicker: '2DA UNIDAD',
    timingLabel: 'Termina en 08:45 (Hoy)',
    title: 'Tartar & Ceviche Nikkei',
    subtitle: 'Atún rojo, leche de tigre al ají amarillo y palta',
    image: '/images/tartar-salmon.jpg',
    note: '2da al 50%',
    isActive: true,
    basePrice: 38,
    percent: 50
  }),
  seedPromoOffer({
    id: 'promo-pisco-2x1',
    mechanic: 'two_for_one',
    mainDishId: 'smoked-old-fashioned',
    complementaryDishId: '',
    badge: '2x1 FLASH',
    kicker: 'HAPPY HOUR BAR',
    timingLabel: 'Hasta 21:00',
    title: '2x1 Pisco Sour & Cócteles',
    subtitle: 'Destilados premium de autor en barra principal',
    image: '/images/smoked-old-fashioned.jpg',
    note: 'Lleva 2 x 1',
    isActive: true,
    basePrice: 19,
    percent: 50
  }),
  seedPromoOffer({
    id: 'promo-volcan-pack',
    mechanic: 'combo',
    mainDishId: 'esfera-chocolate',
    complementaryDishId: 'smoked-old-fashioned',
    badge: 'MARIDAJE',
    kicker: 'POSTRE + DIGESTIVO',
    timingLabel: 'Turno Cena',
    title: 'Volcán Belga + Maridaje',
    subtitle: 'Volcán 70% cacao + Copa de Oporto o Amaro',
    image: '/images/esfera-chocolate.jpg',
    note: '-25% Pack',
    isActive: true,
    basePrice: 22,
    percent: 25
  })
];
