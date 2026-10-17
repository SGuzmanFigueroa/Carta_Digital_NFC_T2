import React from 'react';
import { TicketItem } from '../types';
import { DishImage } from './menu/DishImage';

interface DishDetailModalProps {
  item: TicketItem | null;
  tableNumber: string;
  orderNumber: number;
  onClose: () => void;
  onToggleReady?: (itemId: string) => void;
}

export const DishDetailModal: React.FC<DishDetailModalProps> = ({
  item,
  tableNumber,
  orderNumber,
  onClose,
  onToggleReady
}) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-[#18181b] border border-[#3f3f46] rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden text-[#e5e1e4] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#27272a] bg-[#121215]">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#ff5708] text-white font-mono-code text-[11px] font-bold">
              {tableNumber}
            </span>
            <span className="text-[13px] font-mono-code text-[#a1a1aa]">
              COMANDA #{orderNumber}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#3f3f46] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Dish High Quality Photo Hero */}
        <div className="relative h-64 sm:h-72 w-full bg-[#0e0e10] overflow-hidden">
          <DishImage src={item.photoUrl} alt={item.name} sizes="(min-width: 640px) 640px, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-transparent to-black/30"></div>
          
          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
            <div>
              <span className={`px-2.5 py-1 rounded text-[11px] font-mono-code font-bold uppercase tracking-wider ${item.stationBadgeColor || 'bg-[#ff5708] text-white'}`}>
                {item.stationBadge}
              </span>
              <h2 className="text-[24px] font-bold text-white mt-1.5 tracking-tight font-sans drop-shadow-md">
                {item.name}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[20px] font-mono-code font-bold text-[#ffb59c]">
                S/ {item.price.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body & Plating Specs */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Allergens Warning */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="p-3 rounded-lg bg-[#93000a]/20 border border-[#ffb4ab]/30 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#ffb4ab] text-[20px] shrink-0 mt-0.5">warning</span>
              <div>
                <div className="text-[12px] font-bold uppercase tracking-wider text-[#ffb4ab]">
                  Información Alergológica Crítica
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {item.allergens.map((alg) => (
                    <span key={alg} className="px-2 py-0.5 rounded bg-[#93000a]/50 text-white text-[11px] font-mono-code font-semibold">
                      {alg}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Kitchen Cooking & Plating Instructions */}
          <div>
            <h3 className="text-[12px] font-mono-code font-bold uppercase text-[#a1a1aa] tracking-wider mb-2">
              Especificaciones de Montaje y Cocción
            </h3>
            <div className="p-3.5 rounded-lg bg-[#121215] border border-[#27272a] space-y-2">
              {item.cookingNotes.map((note, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[14px] text-[#e5e1e4]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff5708] mt-2 shrink-0"></span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Standard Prep Specs */}
          <div className="grid grid-cols-2 gap-3 font-mono-code text-[12px]">
            <div className="p-3 rounded-lg bg-[#121215] border border-[#27272a]">
              <span className="text-[#71717a] block text-[10px] uppercase">Tiempo Estándar de Pase</span>
              <span className="text-[#ffb59c] font-bold text-[14px]">{item.prepTimeMinutes || 10} min</span>
            </div>
            <div className="p-3 rounded-lg bg-[#121215] border border-[#27272a]">
              <span className="text-[#71717a] block text-[10px] uppercase">Estado de la Partida</span>
              <span className="text-emerald-400 font-bold text-[14px]">
                {item.checked ? 'LISTO / COMPLETADO' : 'EN PREPARACIÓN'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="p-4 bg-[#121215] border-t border-[#27272a] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#e5e1e4] font-medium text-[13px] transition-colors"
          >
            Cerrar Ficha
          </button>

          {onToggleReady && (
            <button
              onClick={() => {
                onToggleReady(item.id);
                onClose();
              }}
              className={`px-5 py-2.5 rounded-lg font-bold text-[13px] flex items-center gap-2 transition-all active:scale-95 shadow-lg ${
                item.checked
                  ? 'bg-[#27272a] hover:bg-[#3f3f46] text-[#ffb59c]'
                  : 'bg-[#ff5708] hover:bg-orange-600 text-white shadow-[#ff5708]/30'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {item.checked ? 'undo' : 'check_circle'}
              </span>
              <span>{item.checked ? 'Desmarcar Plato' : 'Marcar Plato como Listo'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
