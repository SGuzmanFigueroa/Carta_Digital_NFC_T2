'use client';

import React, { useState } from 'react';
import { MenuItem } from '../types';
import { updateDishPrice, deleteDishFromDb } from '@/services/menuService';
import { DishImage } from './menu/DishImage';

interface DishCatalogAdminProps {
  dishes: MenuItem[];
  onClose: () => void;
  onOpenScanner?: () => void;
  onRefreshDishes: () => void;
  onShowToast: (msg: string, icon?: string) => void;
}

export const DishCatalogAdmin: React.FC<DishCatalogAdminProps> = ({
  dishes,
  onClose,
  onRefreshDishes,
  onShowToast
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('todos');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');

  const filtered = dishes.filter((d) => {
    const matchesCat = selectedCat === 'todos' || d.category === selectedCat;
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleStartEditPrice = (d: MenuItem) => {
    setEditingPriceId(d.id);
    setTempPrice(d.price.toString());
  };

  const handleSavePrice = async (dishId: string) => {
    const parsed = parseFloat(tempPrice);
    if (!isNaN(parsed) && parsed > 0) {
      const ok = await updateDishPrice(dishId, parsed);
      if (ok) {
        onShowToast('Precio actualizado en la carta y Supabase', 'check_circle');
        onRefreshDishes();
      }
    }
    setEditingPriceId(null);
  };

  const handleDeleteDish = async (dishId: string, name: string) => {
    if (confirm(`¿Desactivar "${name}" de la carta digital?`)) {
      const ok = await deleteDishFromDb(dishId);
      if (ok) {
        onShowToast(`"${name}" retirado de la carta`, 'delete');
        onRefreshDishes();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn text-[#e5e1e4]">
      <div 
        className="bg-[#15161c] border border-[#2d2e38] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#24252e] bg-[#111216] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="material-symbols-outlined text-[26px] text-[#ff5708] shrink-0">restaurant_menu</span>
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold text-white font-sans truncate">
                Gestión de Carta & Platos 3D
              </h2>
              <p className="text-[11px] text-[#a1a1aa] font-mono-code">
                Personaliza los platos exclusivos de tu restaurante ({dishes.length} activos)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e202a] border border-[#333544] text-[#a1a1aa] text-[11px] font-mono-code">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Modelado 3D por Plan</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[#22232d] flex items-center justify-center text-[#a1a1aa] hover:text-white"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 border-b border-[#24252e] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#13141a]">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#71717a] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por plato, insumo o estilo..."
              className="w-full bg-[#1b1c24] text-[13px] pl-9 pr-3 py-2 rounded-xl border border-[#2d2e38] text-white focus:outline-none focus:border-[#ff5708]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'fondos', label: 'Fondos' },
              { id: 'entradas', label: 'Entradas' },
              { id: 'postres', label: 'Postres' },
              { id: 'bebidas', label: 'Bebidas' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono-code font-bold transition-all cursor-pointer ${
                  selectedCat === cat.id
                    ? 'bg-[#ff5708] text-[#2b0b00]'
                    : 'bg-[#1e1f28] text-[#a1a1aa] hover:text-white border border-[#2d2e38]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dishes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[#71717a] text-[13px] space-y-2">
              <span className="material-symbols-outlined text-[36px] text-[#ff5708]/60">restaurant</span>
              <p>No se encontraron platos en esta categoría.</p>
              <div className="mt-2 text-[11px] font-mono-code text-gray-400 max-w-sm mx-auto">
                Los platos y modelos 3D son digitalizados y cargados por tu proveedor según tu plan contratado. Para solicitar nuevos platos, contacta a tu ejecutivo de cuenta.
              </div>
            </div>
          ) : (
            filtered.map((dish) => (
              <div
                key={dish.id}
                className="bg-[#1a1b22] border border-[#2b2c37] hover:border-[#ff5708]/40 p-3 rounded-xl flex items-center justify-between gap-3 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#24252e] shrink-0 border border-[#353642]">
                    <DishImage src={dish.image} alt={dish.name} sizes="56px" className="object-cover group-hover:scale-105 transition-transform" />
                    {dish.has3D && (
                      <span className="absolute bottom-0 inset-x-0 bg-[#ff5708]/90 text-[8px] font-mono-code font-bold text-center text-[#2b0b00]">
                        3D ACTIVO
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[13px] sm:text-[14px] font-bold text-white truncate font-sans">
                        {dish.name}
                      </h4>
                      {dish.tag && (
                        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[#24252f] text-[#ffb59c] text-[9px] font-mono-code border border-[#363745]">
                          {dish.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#a1a1aa] truncate max-w-md mt-0.5">
                      {dish.description}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-[#71717a] font-mono-code mt-1">
                      <span className="capitalize">{dish.category}</span>
                      <span>•</span>
                      <span>{dish.prepTime || '10 min'}</span>
                    </div>
                  </div>
                </div>

                {/* Price and Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  {editingPriceId === dish.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-mono-code text-[#ff5708]">S/</span>
                      <input
                        type="number"
                        step="0.5"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        className="w-16 bg-[#111216] border border-[#ff5708] rounded px-1.5 py-1 text-[12px] text-white font-mono-code"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSavePrice(dish.id)}
                        className="p-1 rounded bg-[#ff5708] text-[#2b0b00] hover:brightness-110"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartEditPrice(dish)}
                      className="px-2.5 py-1 rounded-lg bg-[#22232c] hover:bg-[#2c2d3a] border border-[#353644] text-[13px] font-mono-code font-bold text-[#ff5708] flex items-center gap-1 cursor-pointer"
                      title="Editar precio"
                    >
                      <span>S/ {dish.price.toFixed(2)}</span>
                      <span className="material-symbols-outlined text-[13px] text-[#a1a1aa]">edit</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteDish(dish.id, dish.name)}
                    className="w-8 h-8 rounded-lg bg-[#22232c] hover:bg-rose-950/60 text-[#a1a1aa] hover:text-rose-400 flex items-center justify-center transition-colors"
                    title="Desactivar de la carta"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#24252e] bg-[#111216] flex items-center justify-between text-[11px] text-[#a1a1aa]">
          <span>Los cambios se sincronizan en tiempo real con Supabase</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#22232d] hover:bg-[#2c2d3a] text-white font-bold text-[12px]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
