/**
 * GastroPulse OS · CD-31
 * Datos de localización del contenido dinámico de la carta (ES → EN).
 *
 * ⚠️ SIMULACIÓN TEMPORAL: estos textos representan lo que en producción saldrá de la
 * base de datos (`dishes.name_en`, `dishes.description_en`, ...). Se indexan por el `id`
 * real del plato / de la oferta para que el frontend demuestre la experiencia completa
 * sin ejecutar migraciones SQL. Añadir un plato nuevo a la carta no rompe nada: si no
 * está en este diccionario, se muestra su texto original.
 */

import type { ActivePromoOffer } from '@/types';

/** Campos de un plato que se pueden traducir (nombre, descripción y etiquetas gourmet). */
export interface DishContentOverride {
  name?: string;
  description?: string;
  tag?: string;
  badge?: string;
  dietary?: string;
  pairing?: string;
  prepTime?: string;
  /** Alérgenos traducidos, en el mismo orden y longitud que `MenuItem.allergens`. */
  allergens?: string[];
}

/** Campos traducibles de una Oferta Flash publicada por el panel de administración. */
export type PromoOfferContentOverride = Partial<
  Pick<ActivePromoOffer, 'title' | 'subtitle' | 'kicker' | 'badge' | 'timingLabel' | 'note'>
>;

/** Alérgenos frecuentes de la carta (los `allergens` de la BD llegan en español). */
export const ALLERGENS_EN: Record<string, string> = {
  Mariscos: 'Shellfish',
  Moluscos: 'Molluscs',
  Crustáceos: 'Crustaceans',
  Pescado: 'Fish',
  Huevo: 'Egg',
  Lácteos: 'Dairy',
  Gluten: 'Gluten',
  Sésamo: 'Sesame',
  Soya: 'Soy',
  Alcohol: 'Alcohol'
};

/** Categorías de la carta: pestañas y etiqueta larga, por idioma. */
export const MENU_CATEGORY_META = {
  es: {
    tabs: [
      { id: 'todos', label: 'Todos' },
      { id: 'fondos', label: 'Fondos & Wok' },
      { id: 'entradas', label: 'Entradas Nikkei' },
      { id: 'postres', label: 'Postres de Autor' },
      { id: 'bebidas', label: 'Bebidas Signature' }
    ],
    labels: {
      fondos: 'Fondos & Wok',
      entradas: 'Entradas Nikkei',
      postres: 'Postres de Autor',
      bebidas: 'Bebidas Signature'
    }
  },
  en: {
    tabs: [
      { id: 'todos', label: 'All' },
      { id: 'fondos', label: 'Mains & Wok' },
      { id: 'entradas', label: 'Nikkei Starters' },
      { id: 'postres', label: 'Signature Desserts' },
      { id: 'bebidas', label: 'Signature Drinks' }
    ],
    labels: {
      fondos: 'Mains & Wok',
      entradas: 'Nikkei Starters',
      postres: 'Signature Desserts',
      bebidas: 'Signature Drinks'
    }
  }
} as const;

/**
 * Traducciones simuladas (EN) de los platos de la carta, indexadas por el `id` de la BD.
 * En producción este mapa se sustituye por las columnas `name_en` / `description_en`.
 */
export const DISH_CONTENT_EN: Record<string, DishContentOverride> = {
  'chaufa-wok': {
    name: 'Signature Wok Fried Rice',
    description:
      'Long-grain rice wok-tossed over a fierce flame with confit Char Siu pork belly, jumbo prawns, golden egg omelette, crispy spring onion and a smoky touch of toasted sesame oil.',
    tag: 'SIGNATURE WOK',
    badge: 'NEW RELEASE',
    dietary: 'Wok Hei 60 FPS',
    pairing: 'Craft beer or Jasmine tea',
    prepTime: 'Stir-fried: 4 min',
    allergens: ['Shellfish', 'Egg', 'Sesame', 'Soy']
  },
  'wagyu-a5': {
    name: 'Truffled Wagyu Ribeye A5',
    description:
      'Wood-fired seared cut with a port wine reduction and fresh black truffle shavings, parsnip mousseline.',
    tag: 'A5 MIYAZAKI',
    badge: 'CHEF CHOICE',
    dietary: 'Gluten Free',
    pairing: 'Pinot Noir',
    prepTime: 'Grill: 14 min',
    allergens: ['Dairy']
  },
  'lomo-saltado': {
    name: 'Signature Wok Lomo Saltado',
    description:
      'Fine beef tenderloin stir-fried over high heat with glazed red onion, cherry tomatoes, crispy native potatoes and a pisco reduction jus.',
    tag: 'WOK HEI',
    badge: 'GOURMET CLASSIC',
    dietary: 'Wok Hei',
    pairing: 'Reserva Malbec',
    prepTime: 'Stir-fried: 6 min',
    allergens: ['Gluten', 'Soy']
  },
  'pulpo-brasa': {
    name: 'Charcoal-Grilled Anticuchero Octopus',
    description:
      'Octopus tentacle marinated in ají panca and Andean spices, seared over charcoal with golden potato mousseline and rustic chimichurri.',
    tag: 'OVER CHARCOAL',
    badge: 'SPECIALITY',
    dietary: 'Over Charcoal',
    pairing: 'Sauvignon Blanc',
    prepTime: 'Charcoal: 12 min',
    allergens: ['Molluscs']
  },
  'tartar-nikkei': {
    name: 'Nikkei Tartare & Ceviche',
    description:
      'Red tuna and fresh salmon cured in passion fruit leche de tigre, torched avocado and crispy green plantain chips.',
    tag: 'NIKKEI FUSION',
    badge: 'FRESH',
    dietary: 'Mild Spicy',
    pairing: 'Pisco Sour',
    prepTime: 'Cold: 3 min',
    allergens: ['Fish', 'Sesame', 'Soy']
  },

  'causa-limena': {
    name: 'Limeño Causa with King Crab & Avocado',
    description:
      'Hand-pressed yellow potato terrine with ají amarillo, filled with king crab meat, torched avocado, quail egg and botija olive emulsion.',
    tag: 'KING CRAB',
    badge: 'SIGNATURE STARTER',
    dietary: 'Gluten Free',
    pairing: 'Albariño',
    prepTime: 'Cold: 4 min',
    allergens: ['Crustaceans', 'Egg']
  },
  'risotto-porcini': {
    name: 'Porcini & Truffle Mushroom Risotto',
    description:
      'Creamy arborio rice finished with black truffle butter, a mix of wild mushrooms, caramelised porcini and 24-month parmigiano shavings.',
    tag: 'BLACK TRUFFLE',
    badge: 'VEGETARIAN',
    dietary: 'Vegetarian',
    pairing: 'Pinot Noir',
    prepTime: 'Sauté: 11 min',
    allergens: ['Dairy']
  },
  'esfera-chocolate': {
    name: 'Valrhona Chocolate Sphere & Caramel',
    description:
      '70% dark chocolate dome filled with velvet mousse, bathed in warm Maras salt caramel, cocoa crumble and passion fruit coulis.',
    tag: 'VALRHONA 70%',
    badge: 'SIGNATURE DESSERT',
    dietary: 'Signature Dessert',
    pairing: 'Oporto Tawny',
    prepTime: 'Desserts: 5 min',
    allergens: ['Dairy', 'Gluten']
  },
  'smoked-old-fashioned': {
    name: 'Smoked Old Fashioned',
    description:
      'Signature cocktail with premium Bourbon, Angostura bitters, flambéed orange peel and a hand-carved ice cube bathed in aromatic oak smoke.',
    tag: 'SMOKED OAK',
    badge: 'SIGNATURE COCKTAIL',
    dietary: 'Signature Bar',
    pairing: 'Pisco & Bourbon Infused',
    prepTime: 'Bar: 3 min',
    allergens: ['Alcohol']
  }
};

/**
 * Traducciones simuladas (EN) indexadas por el NOMBRE en español del plato.
 * Cubre los platos creados DESPUÉS del despliegue (p. ej. por el escáner 3D): su `id`
 * se autogenera, así que no puede preverse aquí; su nombre sí es estable.
 * La clave es el nombre BASE: `localizeMenuItem` casa por nombre exacto o por prefijo,
 * de modo que "Ají de Gallina Clásico de la Casa" hereda la ficha de "Ají de Gallina".
 */
export const DISH_CONTENT_EN_BY_NAME: Record<string, DishContentOverride> = {
  'Ají de Gallina': {
    name: 'House-Classic Ají de Gallina',
    description:
      'Shredded chicken breast in a silky ají amarillo cream with toasted pecans, parmigiano cheese and yellow potatoes.',
    tag: 'HOUSE CLASSIC',
    badge: 'SCANNED IN 3D',
    dietary: 'Contains dairy & tree nuts',
    pairing: 'Chardonnay or craft beer'
  }
};

/**
 * Traducciones simuladas (EN) de las Ofertas Flash publicadas por el panel admin.
 * Se indexan por el `id` de la oferta (`gastropulse_active_promo_offers`).
 */
export const PROMO_OFFER_CONTENT_EN: Record<string, PromoOfferContentOverride> = {
  'promo-wagyu-15': {
    title: 'Truffled Wagyu Ribeye A5',
    subtitle: '280g Japanese cut with sea salt flakes',
    kicker: "CHEF'S DISH",
    badge: '-15% OFF',
    timingLabel: 'Ends in 12:35 (Today)',
    note: 'You save S/ 17.25'
  },
  'promo-tartar-2da': {
    title: 'Nikkei Tartare & Ceviche',
    subtitle: 'Red tuna, ají amarillo leche de tigre and avocado',
    kicker: 'SECOND UNIT',
    badge: '2nd -50%',
    timingLabel: 'Ends in 08:45 (Today)',
    note: '2nd at 50% off'
  },
  'promo-pisco-2x1': {
    title: '2-for-1 Pisco Sour & Cocktails',
    subtitle: 'Premium signature spirits at the main bar',
    kicker: 'BAR HAPPY HOUR',
    badge: '2x1 FLASH',
    timingLabel: 'Until 21:00',
    note: 'Get 2 for 1'
  },
  'promo-volcan-pack': {
    title: 'Belgian Volcano + Pairing',
    subtitle: '70% cocoa volcano + a glass of Port or Amaro',
    kicker: 'DESSERT + DIGESTIF',
    badge: 'PAIRING',
    timingLabel: 'Dinner shift',
    note: 'Dessert + digestif combo'
  }
};

/* Fin del diccionario de contenido localizado (ES → EN). */


