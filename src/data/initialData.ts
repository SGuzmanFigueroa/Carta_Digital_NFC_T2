import { Ticket, Runner, StaffMember, StationLoad } from '../types';

export const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'ticket-104',
    orderNumber: 104,
    table: 'MESA 02',
    zone: 'VIP SALA 1',
    serviceType: 'Almuerzo Degustación',
    elapsedSeconds: 1129, // 18m 49s
    targetSeconds: 660, // 11m (exceeded by 8m)
    isUrgent: true,
    allergyAlert: 'ALERTA ALÉRGENOS: SEVERA INTOLERANCIA A FRUTOS SECOS',
    serverOrRunner: 'CARLOS M.',
    serverRole: 'CAMARERO',
    totalAmount: 245.0,
    status: 'en_fuego',
    timestamp: '14:29:33',
    stationFilterTags: ['fuego_grill'],
    items: [
      {
        id: 'item-104-1',
        name: '1x Wagyu Ribeye A5',
        quantity: 1,
        station: 'fuego_grill',
        stationBadge: 'LISTO EN PLANCHA',
        stationBadgeColor: 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50',
        status: 'listo_plancha',
        checked: true,
        cookingNotes: [
          'Término: Término Medio (54°C núcleo)',
          'Salsa trufada aparte en salsera precalentada'
        ],
        price: 165.0,
        photoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
        allergens: ['Sin Frutos Secos', 'Lácteos (en salsa)'],
        prepTimeMinutes: 14
      },
      {
        id: 'item-104-2',
        name: '1x Risotto Hongos Porcini',
        quantity: 1,
        station: 'fuego_grill',
        stationBadge: 'EN MONTAJE',
        stationBadgeColor: 'bg-[#353437] text-[#ffb59c] border border-[#5c4037]/40',
        status: 'en_montaje',
        checked: false,
        cookingNotes: [
          'Emulsión con mantequilla francesa clarificada',
          'Láminas de trufa negra de verano ralladas en pase'
        ],
        price: 80.0,
        photoUrl: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=800&auto=format&fit=crop&q=80',
        allergens: ['Lácteos', 'Sin Frutos Secos (Estricto)'],
        prepTimeMinutes: 12
      }
    ]
  },
  {
    id: 'ticket-105',
    orderNumber: 105,
    table: 'MESA 04',
    zone: 'TERRAZA CENTRAL',
    serviceType: 'Servicio Cena',
    elapsedSeconds: 262, // 04:22
    targetSeconds: 720, // 12m
    isUrgent: false,
    synchronousDepartureNote: 'SALIDA SIMULTÁNEA REQUERIDA (2 PLATOS)',
    passTemp: 'PASE: 18°C',
    serverOrRunner: 'MATEO',
    serverRole: 'RUNNER ASIGNADO',
    totalAmount: 168.0,
    status: 'en_fuego',
    timestamp: '14:44:00',
    stationFilterTags: ['frio_nikkei', 'fuego_grill'],
    items: [
      {
        id: 'item-105-1',
        name: '2x Tartar Nikkei de Atún',
        quantity: 2,
        station: 'frio_nikkei',
        stationBadge: 'FRÍO',
        stationBadgeColor: 'bg-[#0494fc]/20 text-[#a1c9ff] border border-[#0494fc]/30',
        status: 'en_montaje',
        checked: false,
        cookingNotes: [
          'Wonton crocante de sésamo, emulsión de palta fuerte',
          'Ponzu añejo reducción'
        ],
        price: 96.0,
        photoUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80',
        allergens: ['Pescado', 'Sésamo', 'Soya'],
        prepTimeMinutes: 8
      },
      {
        id: 'item-105-2',
        name: '1x Pulpo a la Brasa al Carbón',
        quantity: 1,
        station: 'fuego_grill',
        stationBadge: 'GRILL',
        stationBadgeColor: 'bg-[#ff5708]/20 text-[#ffb59c] border border-[#ff5708]/30',
        status: 'pendiente',
        checked: false,
        cookingNotes: [
          'Tentáculo sellado a 300°C con chimichurri andino',
          'Papas nativas aplastadas al ají amarillo'
        ],
        price: 72.0,
        photoUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop&q=80',
        allergens: ['Moluscos'],
        prepTimeMinutes: 10
      }
    ]
  },
  {
    id: 'ticket-106',
    orderNumber: 106,
    table: 'MESA 09',
    zone: 'SALÓN PRINCIPAL',
    serviceType: 'Comanda #2',
    elapsedSeconds: 129, // 02:09
    targetSeconds: 600, // 10m
    isUrgent: false,
    specialPrepNote: 'Salteado al Wok en directo frente a mesa',
    serverOrRunner: 'PASE DIRECTO',
    serverRole: 'PASE DIRECTO',
    totalAmount: 116.0,
    status: 'ingresada',
    timestamp: '14:46:13',
    stationFilterTags: ['wok_saute'],
    items: [
      {
        id: 'item-106-1',
        name: '2x Chaufa Especial de Pato & Cecina',
        quantity: 2,
        station: 'wok_saute',
        stationBadge: 'WOK HEI',
        stationBadgeColor: 'bg-[#ff5708]/20 text-[#ff5708] border border-[#ff5708]/30',
        status: 'pendiente',
        checked: false,
        cookingNotes: [
          'Huevo de codorniz frito montado encima',
          'Sin cebollita china en una de las porciones'
        ],
        price: 116.0,
        photoUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80',
        allergens: ['Huevo', 'Soya'],
        prepTimeMinutes: 7
      }
    ]
  },
  {
    id: 'ticket-107',
    orderNumber: 107,
    table: 'MESA 11',
    zone: 'BARRA CENTRAL',
    serviceType: 'Postres & Tragos',
    elapsedSeconds: 74, // 01:14
    targetSeconds: 360, // 6m
    isUrgent: false,
    specialPrepNote: 'ESTACIONES: PASTELERÍA + BARRA • TIEMPO ESTIMADO: 6 MIN',
    serverOrRunner: 'SOFÍA R.',
    serverRole: 'BARTENDER',
    totalAmount: 94.0,
    status: 'ingresada',
    timestamp: '14:47:08',
    stationFilterTags: ['pasteleria', 'barra_mixologia'],
    items: [
      {
        id: 'item-107-1',
        name: '1x Esfera Chocolate Valrhona',
        quantity: 1,
        station: 'pasteleria',
        stationBadge: 'PASTELERÍA',
        stationBadgeColor: 'bg-[#c6c5cf]/20 text-[#e5e1e4] border border-[#c6c5cf]/30',
        status: 'pendiente',
        checked: false,
        cookingNotes: [
          'Caramelo salado caliente servido en jarrita',
          'Helado de vainilla de Papantla al lado'
        ],
        price: 46.0,
        photoUrl: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop&q=80',
        allergens: ['Lácteos', 'Gluten'],
        prepTimeMinutes: 5
      },
      {
        id: 'item-107-2',
        name: '2x Cóctel Ahumado Áurea',
        quantity: 2,
        station: 'barra_mixologia',
        stationBadge: 'BARRA',
        stationBadgeColor: 'bg-[#0494fc]/20 text-[#a1c9ff] border border-[#0494fc]/30',
        status: 'pendiente',
        checked: false,
        cookingNotes: [
          'Gin macerado en botánicos andinos, campana de humo',
          'Destapar frente al comensal'
        ],
        price: 48.0,
        photoUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&auto=format&fit=crop&q=80',
        allergens: ['Alcohol'],
        prepTimeMinutes: 4
      }
    ]
  },
  {
    id: 'ticket-108',
    orderNumber: 108,
    table: 'MESA 16',
    zone: 'TERRAZA NORTE',
    serviceType: 'Comanda Principal',
    elapsedSeconds: 310,
    targetSeconds: 600,
    isUrgent: false,
    serverOrRunner: 'VALERIA P.',
    serverRole: 'RUNNER ASIGNADO',
    totalAmount: 142.0,
    status: 'en_fuego',
    timestamp: '14:43:10',
    stationFilterTags: ['frio_nikkei'],
    items: [
      {
        id: 'item-108-1',
        name: '1x Ceviche Clásico de Corvina',
        quantity: 1,
        station: 'frio_nikkei',
        stationBadge: 'FRÍO',
        stationBadgeColor: 'bg-[#0494fc]/20 text-[#a1c9ff]',
        status: 'en_montaje',
        checked: false,
        cookingNotes: [
          'Leche de tigre de ají limo al instante',
          'Choclo desgranado y camote glaseado'
        ],
        price: 68.0,
        photoUrl: 'https://images.unsplash.com/photo-1535400255456-984241443b29?w=800&auto=format&fit=crop&q=80',
        allergens: ['Pescado'],
        prepTimeMinutes: 6
      },
      {
        id: 'item-108-2',
        name: '1x Salmón Glaseado Miso',
        quantity: 1,
        station: 'fuego_grill',
        stationBadge: 'GRILL',
        stationBadgeColor: 'bg-[#ff5708]/20 text-[#ffb59c]',
        status: 'pendiente',
        checked: false,
        cookingNotes: [
          'Glaseado reducción mirin-saikyo miso',
          'Bok choy salteado con sésamo'
        ],
        price: 74.0,
        photoUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop&q=80',
        allergens: ['Pescado', 'Soya'],
        prepTimeMinutes: 9
      }
    ]
  }
];

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
