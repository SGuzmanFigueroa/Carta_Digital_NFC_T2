'use client';

import type { DietaryPreference, MenuItem } from '@/types';
import type { TranslationKey } from '@/i18n/translations';
import { useLanguage } from '@/hooks/useLanguage';

/**
 * CD-31 · Definición de los filtros dietéticos de la carta.
 *
 * `labelKey` es la clave del diccionario ES/EN: el componente y sus consumidores
 * (chips de la grilla, estado vacío) resuelven el rótulo con `t()`.
 * `keywords` se mantiene en ambos idiomas porque clasifica el texto legacy de la
 * base de datos, no la interfaz.
 */
export const DIETARY_FILTERS: {
  value: DietaryPreference;
  labelKey: TranslationKey;
  materialIcon: string;
  keywords: string[];
}[] = [
  { value: 'vegetarian', labelKey: 'dietary.vegetarian', materialIcon: 'eco', keywords: ['vegetariano', 'vegetariana', 'vegetarian'] },
  { value: 'gluten-free', labelKey: 'dietary.glutenFree', materialIcon: 'grain', keywords: ['sin gluten', 'gluten free', 'libre de gluten'] },
  { value: 'dairy-free', labelKey: 'dietary.dairyFree', materialIcon: 'water_drop', keywords: ['sin lactosa', 'lactose free', 'sin lacteos', 'dairy free'] },
  { value: 'spicy', labelKey: 'dietary.spicy', materialIcon: 'local_fire_department', keywords: ['picante', 'spicy'] }
];

export function getDietaryPreferences(item: Pick<MenuItem, 'dietary' | 'dietaryPreferences'>): DietaryPreference[] {
  const legacyDietary = (item.dietary || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const preferences = new Set(item.dietaryPreferences || []);

  DIETARY_FILTERS.forEach((filter) => {
    if (filter.keywords.some((keyword) => legacyDietary.includes(keyword))) {
      preferences.add(filter.value);
    }
  });

  return [...preferences];
}

interface DietaryFiltersProps {
  selectedFilters: DietaryPreference[];
  onToggle: (filter: DietaryPreference) => void;
}

export function DietaryFilters({ selectedFilters, onToggle }: DietaryFiltersProps) {
  // CD-31 · Rótulos reactivos al idioma de la carta.
  const { t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t('dietary.groupAria')}
      className="flex gap-2 overflow-x-auto -mx-3.5 px-3.5 pb-1 no-scrollbar sm:mx-0 sm:px-0"
    >
      {DIETARY_FILTERS.map((filter) => {
        const isSelected = selectedFilters.includes(filter.value);
        const label = t(filter.labelKey);

        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(filter.value)}
            className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-semibold backdrop-blur-xl transition-all cursor-pointer ${
              isSelected
                ? 'border-[#ff5708]/60 bg-[#ff5708]/15 text-[#9a3412] shadow-[0_4px_18px_rgba(255,87,8,0.14)] dark:text-[#ffb59c]'
                : 'border-white/70 bg-white/65 text-[#475569] shadow-sm hover:border-[#ff5708]/40 hover:bg-white/85 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#c4c4ce] dark:hover:bg-white/10'
            }`}
          >
            <span aria-hidden="true"><span className="material-symbols-outlined text-[15px]">{filter.materialIcon}</span></span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
