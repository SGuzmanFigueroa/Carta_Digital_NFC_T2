'use client';

import type { DietaryPreference, MenuItem } from '@/types';

export const DIETARY_FILTERS: {
  value: DietaryPreference;
  label: string;
  icon: string;
  keywords: string[];
}[] = [
  { value: 'vegetarian', label: 'Vegetariano', icon: '🌱', keywords: ['vegetariano', 'vegetariana', 'vegetarian'] },
  { value: 'gluten-free', label: 'Sin Gluten', icon: '🌾', keywords: ['sin gluten', 'gluten free', 'libre de gluten'] },
  { value: 'dairy-free', label: 'Sin Lactosa', icon: '🥛', keywords: ['sin lactosa', 'lactose free', 'sin lacteos', 'dairy free'] },
  { value: 'spicy', label: 'Picante', icon: '🔥', keywords: ['picante', 'spicy'] }
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
  return (
    <div
      role="group"
      aria-label="Filtros de preferencias dietéticas"
      className="flex gap-2 overflow-x-auto -mx-3.5 px-3.5 pb-1 no-scrollbar sm:mx-0 sm:px-0"
    >
      {DIETARY_FILTERS.map((filter) => {
        const isSelected = selectedFilters.includes(filter.value);

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
            <span aria-hidden="true">{filter.icon}</span>
            <span>{filter.label}</span>
          </button>
        );
      })}
    </div>
  );
}
