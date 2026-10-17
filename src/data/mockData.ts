import { MenuItem, TableStatus, SystemConfigState, Runner, StaffMember, StationLoad } from '../types';

/**
 * Datos de respaldo y de ejemplo (un solo archivo; antes estaban repartidos
 * entre mockData e initialData, con INITIAL_STAFF duplicado). La app real lee
 * todo de Supabase: esto solo se usa sin conexión o mientras carga.
 */

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
    dietaryPreferences: ['spicy', 'dairy-free'],
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
    dietaryPreferences: ['gluten-free'],
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
    dietaryPreferences: ['spicy'],
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
    dietaryPreferences: ['spicy'],
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
    dietaryPreferences: ['gluten-free', 'dairy-free', 'spicy'],
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
    dietaryPreferences: ['gluten-free', 'dairy-free', 'spicy'],
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
    dietaryPreferences: ['vegetarian'],
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

export const INITIAL_RUNNERS: Runner[] = [
  {
    id: 'runner-1',
    runnerNumber: 1,
    name: 'Mateo C.',
    status: 'Libre en Pase',
    location: 'Libre en Pase',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    ordersHandledToday: 24,
    avgDeliveryMinutes: 1.6
  },
  {
    id: 'runner-2',
    runnerNumber: 2,
    name: 'Valeria P.',
    status: 'En Mesa',
    currentTable: 'Mesa 07',
    location: 'En Mesa 07',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    ordersHandledToday: 19,
    avgDeliveryMinutes: 1.9
  },
  {
    id: 'runner-3',
    runnerNumber: 3,
    name: 'Rodrigo S.',
    status: 'Libre en Pase',
    location: 'Libre en Pase',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    ordersHandledToday: 21,
    avgDeliveryMinutes: 1.8
  },
  {
    id: 'runner-4',
    runnerNumber: 4,
    name: 'Andrea T.',
    status: 'Libre en Pase',
    location: 'Libre en Pase',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    ordersHandledToday: 15,
    avgDeliveryMinutes: 2.1
  }
];

export const INITIAL_STATION_LOADS: StationLoad[] = [
  {
    id: 'fuego_grill',
    name: 'P1 Fuego & Grill',
    code: 'P1',
    loadPercentage: 85,
    activeOrders: 6,
    avgPrepMinutes: 13.8,
    color: '#ff5708'
  },
  {
    id: 'frio_nikkei',
    name: 'P2 Frío & Nikkei',
    code: 'P2',
    loadPercentage: 45,
    activeOrders: 3,
    avgPrepMinutes: 7.2,
    color: '#0494fc'
  },
  {
    id: 'wok_saute',
    name: 'P3 Wok & Sauté',
    code: 'P3',
    loadPercentage: 30,
    activeOrders: 2,
    avgPrepMinutes: 6.5,
    color: '#ffb59c'
  },
  {
    id: 'pasteleria',
    name: 'P4 Pastelería',
    code: 'P4',
    loadPercentage: 20,
    activeOrders: 1,
    avgPrepMinutes: 5.0,
    color: '#e3e1ec'
  },
  {
    id: 'barra_mixologia',
    name: 'P5 Barra Mixología',
    code: 'P5',
    loadPercentage: 40,
    activeOrders: 2,
    avgPrepMinutes: 4.2,
    color: '#a1c9ff'
  }
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Alonso Echegaray',
    role: 'Chef Ejecutivo',
    station: 'Pase General / Expedición',
    status: 'En servicio',
    avatarUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&auto=format&fit=crop&q=80',
    phone: '+51 987 654 321',
    shiftHours: '12:00 - 23:30',
    specialty: 'Alta Cocina & Pase de Mesa'
  },
  {
    id: 'staff-2',
    name: 'Camila Morán',
    role: 'Sous Chef / Jefe de Fuego',
    station: 'P1 Fuego & Grill',
    status: 'En servicio',
    avatarUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=200&auto=format&fit=crop&q=80',
    phone: '+51 984 123 456',
    shiftHours: '11:00 - 20:00',
    specialty: 'Carnes A5 & Brasa Josper'
  },
  {
    id: 'staff-3',
    name: 'Kenji Takahashi',
    role: 'Itamae / Jefe Cuarto Frío',
    station: 'P2 Frío & Nikkei',
    status: 'En servicio',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    phone: '+51 991 789 012',
    shiftHours: '12:30 - 22:00',
    specialty: 'Cortes Sashimi & Marinados'
  },
  {
    id: 'staff-4',
    name: 'Bao Ming',
    role: 'Wok Master',
    station: 'P3 Wok & Sauté',
    status: 'En servicio',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    phone: '+51 965 432 198',
    shiftHours: '13:00 - 23:00',
    specialty: 'Wok Hei & Salteados Cantonés'
  },
  {
    id: 'staff-5',
    name: 'Sofía Ramos',
    role: 'Head Bartender',
    station: 'P5 Barra Mixología',
    status: 'En servicio',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    phone: '+51 978 901 234',
    shiftHours: '14:00 - 01:00',
    specialty: 'Coctelería Botánica & Destilados'
  },
  {
    id: 'staff-6',
    name: 'Lucía Benavides',
    role: 'Chef Pastelera',
    station: 'P4 Pastelería',
    status: 'Descanso',
    avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=200&auto=format&fit=crop&q=80',
    phone: '+51 955 678 901',
    shiftHours: '10:00 - 18:30',
    specialty: 'Chocolatería Valrhona & Heladería'
  }
];

export const CATALOG_DISHES = [
  {
    id: 'cat-1',
    name: 'Wagyu Ribeye A5',
    category: 'Fuego & Grill',
    station: 'fuego_grill' as const,
    stationBadge: 'GRILL',
    price: 165.0,
    photoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    prepTime: '14 min',
    allergens: ['Lácteos'],
    notes: 'Término Medio (54°C). Salsa trufada aparte en salsera precalentada.'
  },
  {
    id: 'cat-2',
    name: 'Risotto Hongos Porcini & Trufa',
    category: 'Fuego & Grill',
    station: 'fuego_grill' as const,
    stationBadge: 'MONTAJE',
    price: 80.0,
    photoUrl: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=800&auto=format&fit=crop&q=80',
    prepTime: '12 min',
    allergens: ['Lácteos'],
    notes: 'Emulsión mantequilla clarificada francesa y trufa negra rallada al pase.'
  },
  {
    id: 'cat-3',
    name: 'Tartar Nikkei de Atún Bluefin',
    category: 'Cuarto Frío & Nikkei',
    station: 'frio_nikkei' as const,
    stationBadge: 'FRÍO',
    price: 48.0,
    photoUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80',
    prepTime: '8 min',
    allergens: ['Pescado', 'Sésamo', 'Soya'],
    notes: 'Wonton crocante, palta fuerte, reducción de ponzu añejo.'
  },
  {
    id: 'cat-4',
    name: 'Pulpo a la Brasa al Carbón',
    category: 'Fuego & Grill',
    station: 'fuego_grill' as const,
    stationBadge: 'GRILL',
    price: 72.0,
    photoUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop&q=80',
    prepTime: '10 min',
    allergens: ['Moluscos'],
    notes: 'Tentáculo sellado a 300°C con chimichurri andino y papas nativas.'
  },
  {
    id: 'cat-5',
    name: 'Chaufa Especial de Pato & Cecina',
    category: 'Wok & Sauté',
    station: 'wok_saute' as const,
    stationBadge: 'WOK HEI',
    price: 58.0,
    photoUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80',
    prepTime: '7 min',
    allergens: ['Huevo', 'Soya'],
    notes: 'Huevo de codorniz frito, confit de pato y cecina de la selva ahumada.'
  },
  {
    id: 'cat-6',
    name: 'Esfera Chocolate Valrhona',
    category: 'Pastelería',
    station: 'pasteleria' as const,
    stationBadge: 'POSTRE',
    price: 46.0,
    photoUrl: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop&q=80',
    prepTime: '5 min',
    allergens: ['Lácteos', 'Gluten'],
    notes: 'Caramelo salado caliente servido en jarrita y helado de vainilla Papantla.'
  },
  {
    id: 'cat-7',
    name: 'Cóctel Ahumado Áurea',
    category: 'Barra Mixología',
    station: 'barra_mixologia' as const,
    stationBadge: 'BARRA',
    price: 48.0,
    photoUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&auto=format&fit=crop&q=80',
    prepTime: '4 min',
    allergens: ['Alcohol'],
    notes: 'Gin infusionado en botánicos andinos con campana de humo de romero.'
  },
  {
    id: 'cat-8',
    name: 'Ceviche Clásico de Corvina',
    category: 'Cuarto Frío & Nikkei',
    station: 'frio_nikkei' as const,
    stationBadge: 'FRÍO',
    price: 68.0,
    photoUrl: 'https://images.unsplash.com/photo-1535400255456-984241443b29?w=800&auto=format&fit=crop&q=80',
    prepTime: '6 min',
    allergens: ['Pescado'],
    notes: 'Leche de tigre recién batida con ají limo, choclo tierno y camote glaseado.'
  }
];
