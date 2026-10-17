'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import dynamic from 'next/dynamic';
import type { MenuItem } from '@/types';
import { fetchDishesFromDb, updateDishPrice, deleteDishFromDb } from '@/services/menuService';
import { DishCatalogAdmin } from '../DishCatalogAdmin';
import { DishImage } from '../menu/DishImage';
// Escáner 3D (Three.js): solo se descarga al abrirlo.
const Dish3DScannerModal = dynamic(() => import('../Dish3DScannerModal').then((m) => m.Dish3DScannerModal), { ssr: false });
import type { ConfigStyles } from './configStyles';

interface DishMenuSectionProps {
  styles: ConfigStyles;
  onShowToast: (msg: string, icon?: string) => void;
  dishes: MenuItem[];
  loadingDishes: boolean;
  setDishes: Dispatch<SetStateAction<MenuItem[]>>;
}

/** Sección 07 de Configuración: platos de la carta (precios, borrado) y alta con escáner 3D. */
export function DishMenuSection({ styles, onShowToast, dishes, loadingDishes, setDishes }: DishMenuSectionProps) {
  const { isLight, sectionBg, sectionHeaderBorder, titleColor, descColor, cardBg } = styles;

  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [dishSearchFilter, setDishSearchFilter] = useState('');
  const [editingDishPriceId, setEditingDishPriceId] = useState<string | null>(null);
  const [tempDishPrice, setTempDishPrice] = useState<string>('');
  const handleSaveDishPrice = async (dishId: string) => {
    const num = parseFloat(tempDishPrice);
    if (isNaN(num) || num <= 0) {
      onShowToast('Ingresa un precio numérico válido', 'warning');
      return;
    }
    const ok = await updateDishPrice(dishId, num);
    if (ok) {
      setDishes((prev) => prev.map((d) => (d.id === dishId ? { ...d, price: num } : d)));
      setEditingDishPriceId(null);
      onShowToast('Precio actualizado en la carta', 'check_circle');
    } else {
      onShowToast('Error al actualizar precio en base de datos', 'error');
    }
  };

  const handleDeleteDishItem = async (dishId: string, dishName: string) => {
    if (!window.confirm(`¿Eliminar el plato "${dishName}" de la carta del restaurante?`)) {
      return;
    }
    const ok = await deleteDishFromDb(dishId);
    if (ok) {
      setDishes((prev) => prev.filter((d) => d.id !== dishId));
      onShowToast(`Plato "${dishName}" eliminado con éxito`, 'delete');
    } else {
      onShowToast('Error al eliminar plato', 'error');
    }
  };

  return (
    <>
      {/* SEC_07: CARTA DIGITAL & ESCANEO 3D DE PLATOS (SETUP ONBOARDING) */}
      <section id="carta-platos" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6 border-b ${sectionHeaderBorder}`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px] text-[#ff5708] shrink-0">view_in_ar</span>
            <div>
              <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>Carta Digital & Escaneo 3D</h2>
              <p className={`text-[13px] ${descColor}`}>
                Digitalización 360° para visualización 3D y Realidad Aumentada (AR) en mesa
              </p>
            </div>
          </div>

          {/* Action Buttons Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCatalogModal(true)}
              className={`px-3 py-2 rounded-xl text-[12px] font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isLight ? 'bg-white border-[#cbd5e1] text-[#334155] hover:bg-[#f1f5f9]' : 'bg-[#1e1f26] border-[#383a48] text-white hover:border-[#ff5708]/50'
              }`}
            >
              <span className="material-symbols-outlined text-[17px] text-[#ff5708]">format_list_bulleted</span>
              <span>Gestionar Catálogo</span>
            </button>

            <div className={`px-3 py-2 rounded-xl border text-[11.5px] font-mono-code flex items-center gap-2 ${
              isLight ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569]' : 'bg-[#1a1b24] border-[#313342] text-[#ffb59c]'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Plan: Platos 3D Gestionados</span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Card Explicativa de Plan SaaS: Platos 3D Gestionados por la Empresa Proveedora */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            isLight ? 'bg-[#f0fdf4] border-[#bbf7d0]' : 'bg-[#0f1f17] border-[#166534]/40'
          }`}>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[22px] text-emerald-400 shrink-0 mt-0.5">verified</span>
              <div>
                <h4 className="text-[13px] font-bold text-emerald-400">
                  Platos 3D y Realidad Aumentada Gestionados por Plan
                </h4>
                <p className={`text-[12px] leading-relaxed mt-0.5 ${isLight ? 'text-[#166534]' : 'text-[#bbf7d0]/80'}`}>
                  La digitalización fotogramétrica 360° y los modelos 3D son preparados y cargados directamente por nuestro equipo técnico según el plan contratado por tu restaurante (ej. paquete de 20 platos). Desde este panel puedes visualizar tus platos activos, ajustar precios en vivo y consultar el maridaje. Para solicitar la inclusión de nuevos platos 3D a tu carta, contacta a tu ejecutivo comercial.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Servicio Gestionado
              </span>
            </div>
          </div>

          {/* Estadísticas de la Carta y Platos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${cardBg}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${descColor}`}>Total Platos en Carta</span>
                <span className="material-symbols-outlined text-[#ff5708] text-[20px]">restaurant</span>
              </div>
              <div className={`text-2xl font-bold font-mono-code mt-2 ${titleColor}`}>{dishes.length}</div>
              <span className="text-[11px] text-emerald-400 font-medium">Sincronizados en Supabase</span>
            </div>

            <div className={`p-4 rounded-xl border ${cardBg}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${descColor}`}>Modelos 3D Escaneados</span>
                <span className="material-symbols-outlined text-purple-400 text-[20px]">view_in_ar</span>
              </div>
              <div className={`text-2xl font-bold font-mono-code mt-2 ${titleColor}`}>
                {dishes.filter((d) => d.has3D).length}
              </div>
              <span className="text-[11px] text-purple-400 font-medium">Listos para Realidad Aumentada</span>
            </div>

            <div className={`p-4 rounded-xl border ${cardBg}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${descColor}`}>Categorías Activas</span>
                <span className="material-symbols-outlined text-blue-400 text-[20px]">category</span>
              </div>
              <div className={`text-2xl font-bold font-mono-code mt-2 ${titleColor}`}>
                {Array.from(new Set(dishes.map((d) => d.category))).length || 4}
              </div>
              <span className={`text-[11px] font-medium ${descColor}`}>Estructura gastronómica</span>
            </div>
          </div>

          {/* Buscador y Filtro Rápido */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-gray-400">search</span>
              <input
                type="text"
                placeholder="Buscar plato por nombre, descripción o categoría..."
                value={dishSearchFilter}
                onChange={(e) => setDishSearchFilter(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-[12.5px] border focus:border-[#ff5708] focus:outline-none transition-colors ${
                  isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#16171d] border-[#2f313d] text-white'
                }`}
              />
            </div>
            <span className={`text-[12px] font-mono ${descColor}`}>
              Mostrando {dishes.filter(d => !dishSearchFilter || d.name.toLowerCase().includes(dishSearchFilter.toLowerCase())).length} platos
            </span>
          </div>

          {/* Lista de Platos Configurados */}
          {loadingDishes ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#ff5708] border-t-transparent animate-spin"></div>
              <span className={`text-[12px] font-mono ${descColor}`}>Cargando platos desde Supabase...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {dishes
                .filter((d) => !dishSearchFilter || d.name.toLowerCase().includes(dishSearchFilter.toLowerCase()) || d.description.toLowerCase().includes(dishSearchFilter.toLowerCase()))
                .map((dish) => (
                  <div
                    key={dish.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all hover:border-[#ff5708]/40 shadow-sm ${
                      isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#181921] border-[#292a35]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-14 h-14 rounded-lg bg-[#252632] overflow-hidden shrink-0 relative flex items-center justify-center border border-[#373948]">
                        {dish.image ? (
                          <DishImage src={dish.image} alt={dish.name} sizes="56px" className="object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-[24px] text-gray-500">restaurant</span>
                        )}
                        {dish.has3D && (
                          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black" title="3D & AR Activo"></span>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[13px] font-bold truncate ${titleColor}`}>{dish.name}</span>
                          {dish.has3D && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#ff5708]/15 text-[#ff5708] border border-[#ff5708]/30">
                              3D / AR
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] truncate mt-0.5 ${descColor}`}>
                          {dish.description}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 capitalize mt-1">
                          Cat: {dish.category}
                        </span>
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {editingDishPriceId === dish.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-mono text-[#ff5708] font-bold">S/</span>
                          <input
                            type="number"
                            step="0.5"
                            value={tempDishPrice}
                            onChange={(e) => setTempDishPrice(e.target.value)}
                            className={`w-16 px-1.5 py-0.5 rounded text-[12px] font-mono font-bold border focus:border-[#ff5708] focus:outline-none ${
                              isLight ? 'bg-white border-[#cbd5e1] text-black' : 'bg-[#101116] border-[#383a48] text-white'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveDishPrice(dish.id)}
                            className="p-1 rounded bg-[#ff5708] text-black hover:bg-[#ff7a3d] cursor-pointer"
                            title="Guardar Precio"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDishPriceId(null)}
                            className="p-1 rounded bg-gray-600/30 text-gray-400 hover:text-white cursor-pointer"
                            title="Cancelar"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-mono-code font-bold text-[#ff5708]">
                            S/ {dish.price.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDishPriceId(dish.id);
                              setTempDishPrice(dish.price.toString());
                            }}
                            className="p-1 text-gray-400 hover:text-[#ff5708] transition-colors cursor-pointer"
                            title="Editar precio"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteDishItem(dish.id, dish.name)}
                        className="p-1 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Eliminar plato de la carta"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>
  {/* Modal Escáner 3D de Platos (Cámara / 360 Photogrammetry) */}
  {showScannerModal && (
    <Dish3DScannerModal
      onClose={() => setShowScannerModal(false)}
      onDishCreated={(newDish) => {
        setDishes((prev) => [newDish, ...prev.filter((d) => d.id !== newDish.id)]);
        setShowScannerModal(false);
        onShowToast(`Plato "${newDish.name}" escaneado y publicado con éxito`, '3d_rotation');
      }}
      onShowToast={onShowToast}
    />
  )}

  {/* Modal Gestor Completo de Catálogo de Platos */}
  {showCatalogModal && (
    <DishCatalogAdmin
      dishes={dishes}
      onClose={() => setShowCatalogModal(false)}

      onRefreshDishes={async () => {
        const list = await fetchDishesFromDb();
        if (list) setDishes(list);
      }}
      onShowToast={onShowToast}
    />
  )}
    </>
  );
}
