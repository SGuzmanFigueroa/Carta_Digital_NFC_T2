export interface ArDishSizeProfile {
  /** Mayor dimensión física del objeto en centímetros. */
  maxDimensionCm: number;
}

const DEFAULT_AR_DISH_PROFILE: ArDishSizeProfile = {
  maxDimensionCm: 24,
};

/**
 * Dimensiones físicas aproximadas para conservar una escala creíble en AR.
 * El valor representa el lado más largo del modelo, no siempre el diámetro.
 */
export const AR_DISH_SIZE_PROFILES: Record<string, ArDishSizeProfile> = {
  'smoked-old-fashioned': { maxDimensionCm: 12 },
  'aji-de-gallina': { maxDimensionCm: 25 },
  'causa-limena': { maxDimensionCm: 20 },
  'esfera-chocolate': { maxDimensionCm: 18 },
  'tartar-nikkei': { maxDimensionCm: 20 },
  'chaufa-wok': { maxDimensionCm: 26 },
  'risotto-porcini': { maxDimensionCm: 25 },
  'lomo-saltado': { maxDimensionCm: 27 },
  'pulpo-brasa': { maxDimensionCm: 26 },
  'wagyu-a5': { maxDimensionCm: 28 },
};

export function getArDishSizeProfile(dishId: string): ArDishSizeProfile {
  return AR_DISH_SIZE_PROFILES[dishId] ?? DEFAULT_AR_DISH_PROFILE;
}

export function getArDishDimensionCm(dishId: string): number {
  return getArDishSizeProfile(dishId).maxDimensionCm;
}
