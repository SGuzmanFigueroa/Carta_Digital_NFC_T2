import React, { useState, useEffect } from 'react';
import { CATALOG_DISHES } from '../data/initialData';
import { Ticket, TicketItem } from '../types';
import { fetchDishesFromDb } from '@/services/menuService';
import { fetchTablesFromDb } from '@/services/tableService';
import { getPersistedStaffList } from '@/services/authService';

interface NewOrderModalProps {
  onClose: () => void;
  /** Si resuelve false (no se registró), el modal sigue abierto. */
  onCreateTicket: (ticket: Ticket) => Promise<boolean> | void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  onClose,
  onCreateTicket
}) => {
  const [catalog, setCatalog] = useState(CATALOG_DISHES);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [availableTables, setAvailableTables] = useState<string[]>([
    'MESA 01', 'MESA 02', 'MESA 03', 'MESA 04', 'MESA 05', 'MESA 08', 'MESA 12', 'MESA 14', 'MESA 20', 'BARRA 02'
  ]);
  const [availableWaiters, setAvailableWaiters] = useState<string[]>([
    'Carlos M.', 'Valeria P.', 'Mateo C.', 'Sofía R.', 'Rodrigo S.'
  ]);
  const [table, setTable] = useState('MESA 05');
  const [zone, setZone] = useState('SALÓN PRINCIPAL');
  const [serviceType] = useState('Servicio Almuerzo');
  const [waiter, setWaiter] = useState('Carlos M.');
  const [allergyAlert, setAllergyAlert] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDishes, setSelectedDishes] = useState<{ [dishId: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync catalog, tables, and staff dynamically from Supabase
  useEffect(() => {
    fetchDishesFromDb().then((dbDishes) => {
      if (dbDishes && dbDishes.length > 0) {
        const mapped = dbDishes
          .filter((dish) => dish && typeof dish.id === 'string' && typeof dish.name === 'string' && dish.name.trim())
          .map((d) => ({
          id: d.id,
          name: d.name,
          category: d.category === 'fondos' ? 'Fuego & Wok' : d.category === 'entradas' ? 'Entradas Nikkei' : d.category === 'bebidas' ? 'Barra & Mixología' : 'Pastelería',
          station: (d.category === 'fondos' ? 'wok_saute' : d.category === 'entradas' ? 'frio_nikkei' : d.category === 'bebidas' ? 'barra_mixologia' : 'pasteleria') as any,
          stationBadge: d.category === 'fondos' ? 'WOK & SAUTÉ' : d.category === 'entradas' ? 'CUARTO FRÍO' : d.category === 'bebidas' ? 'BARRA' : 'PASTELERÍA',
          price: d.price,
          photoUrl: d.image,
          prepTime: d.prepTime || '12 min',
          allergens: d.dietary ? [d.dietary] : ['Ninguno reportado'],
          notes: d.description || ''
          }));
        setCatalog(mapped);
        setSelectedDishes((selected) => Object.fromEntries(
          Object.entries(selected).filter(([dishId]) => mapped.some((dish) => dish.id === dishId))
        ));
      }
    }).catch(console.warn).finally(() => setIsCatalogLoading(false));

    fetchTablesFromDb().then((dbTables) => {
      if (dbTables && dbTables.length > 0) {
        const names = dbTables.map((t) => `MESA ${t.number.replace(/\D/g, '').padStart(2, '0')}`);
        setAvailableTables(Array.from(new Set(names)));
      }
    }).catch(console.warn);

    getPersistedStaffList().then((dbStaff) => {
      if (dbStaff && dbStaff.length > 0) {
        const names = dbStaff.map((s) => s.name);
        setAvailableWaiters(Array.from(new Set(names)));
      }
    }).catch(console.warn);
  }, []);

  const handleQtyChange = (dishId: string, delta: number) => {
    setSelectedDishes((prev) => {
      const current = prev[dishId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[dishId];
        return copy;
      }
      return { ...prev, [dishId]: next };
    });
  };

  const calculateTotal = () => {
    return Object.entries(selectedDishes).reduce((sum, [dishId, qty]) => {
      const dish = catalog.find((entry) => entry?.id === dishId);
      return sum + (dish ? dish.price * qty : 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCatalogLoading || isSubmitting) return;

    const selectedCatalogDishes = Object.entries(selectedDishes).reduce<Array<{
      dish: (typeof catalog)[number];
      quantity: number;
    }>>((selected, [dishId, quantity]) => {
      const dish = catalog.find((entry) => entry?.id === dishId);
      if (!dish || typeof dish.name !== 'string' || quantity <= 0) return selected;
      selected.push({ dish, quantity });
      return selected;
    }, []);
    if (selectedCatalogDishes.length === 0) {
      setSelectedDishes({});
      return;
    }

    const newTicketId = `ticket-${Date.now().toString().slice(-4)}`;

    const items: TicketItem[] = selectedCatalogDishes.map(({ dish, quantity: qty }, idx) => {
      return {
        id: `item-${newTicketId}-${idx}`,
        dishId: dish.id,
        name: `${qty}x ${dish.name}`,
        quantity: qty,
        station: dish.station,
        stationBadge: dish.stationBadge,
        stationBadgeColor: dish.station === 'frio_nikkei'
          ? 'bg-[#0494fc]/20 text-[#a1c9ff]'
          : dish.station === 'wok_saute'
          ? 'bg-[#ff5708]/20 text-[#ff5708]'
          : dish.station === 'pasteleria'
          ? 'bg-[#c6c5cf]/20 text-[#e5e1e4]'
          : dish.station === 'barra_mixologia'
          ? 'bg-[#0494fc]/20 text-[#a1c9ff]'
          : 'bg-[#ff5708]/20 text-[#ffb59c]',
        status: 'pendiente',
        cookingNotes: [dish.notes],
        price: dish.price * qty,
        photoUrl: dish.photoUrl,
        checked: false,
        allergens: dish.allergens,
        prepTimeMinutes: parseInt(dish.prepTime) || 10
      };
    });

    const stationTags = Array.from(new Set(items.map((i) => i.station)));

    const newTicket: Ticket = {
      id: newTicketId,
      orderNumber: 0, // Lo asigna el servidor (place_order).
      table,
      zone,
      serviceType,
      elapsedSeconds: 0,
      targetSeconds: 600,
      allergyAlert: allergyAlert.trim() ? `ALERTA ALÉRGENOS: ${allergyAlert.toUpperCase()}` : undefined,
      specialPrepNote: notes.trim() ? notes : undefined,
      serverOrRunner: waiter,
      serverRole: 'CAMARERO',
      totalAmount: calculateTotal(),
      status: 'ingresada',
      timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      stationFilterTags: stationTags,
      items
    };

    setIsSubmitting(true);
    const created = await onCreateTicket(newTicket);
    setIsSubmitting(false);
    if (created !== false) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        className="bg-[#18181b] border border-[#3f3f46] rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden text-[#e5e1e4] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] bg-[#121215]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded bg-[#ff5708] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
            </span>
            <div>
              <h2 className="text-[17px] font-bold text-white leading-tight font-sans">
                Crear Nueva Comanda para Cocina KDS
              </h2>
              <p className="text-[12px] text-[#a1a1aa]">
                Ingresa los platos y especificaciones de comensales para despacho inmediato
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#3f3f46] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Table & Area Config */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono-code uppercase text-[#a1a1aa] mb-1 font-bold">
                Mesa / Ubicación
              </label>
              <select
                value={table}
                onChange={(e) => setTable(e.target.value)}
                className="w-full bg-[#121215] border border-[#27272a] rounded-lg px-3 py-2 text-[13px] text-white focus:border-[#ff5708] focus:outline-none"
              >
                {availableTables.map((tNum) => (
                  <option key={tNum} value={tNum}>{tNum}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono-code uppercase text-[#a1a1aa] mb-1 font-bold">
                Zona de Sala
              </label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full bg-[#121215] border border-[#27272a] rounded-lg px-3 py-2 text-[13px] text-white focus:border-[#ff5708] focus:outline-none"
              >
                <option value="SALÓN PRINCIPAL">Salón Principal</option>
                <option value="TERRAZA CENTRAL">Terraza Central</option>
                <option value="VIP SALA 1">VIP Sala 1</option>
                <option value="BARRA CENTRAL">Barra Central</option>
                <option value="DELIVERY / TAKEAWAY">Delivery / Takeaway</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono-code uppercase text-[#a1a1aa] mb-1 font-bold">
                Camarero / Responsable
              </label>
              <select
                value={waiter}
                onChange={(e) => setWaiter(e.target.value)}
                className="w-full bg-[#121215] border border-[#27272a] rounded-lg px-3 py-2 text-[13px] text-white focus:border-[#ff5708] focus:outline-none"
              >
                {availableWaiters.map((wName) => (
                  <option key={wName} value={wName}>{wName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dish Selection Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-mono-code uppercase text-[#a1a1aa] font-bold">
                Platos de la Carta (Haz clic para sumar o restar)
              </label>
              <span className="text-[11px] font-mono-code text-[#ffb59c]">
                {isCatalogLoading ? 'Cargando carta...' : `${Object.keys(selectedDishes).length} platos seleccionados`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {catalog.filter((dish) => dish && typeof dish.name === 'string').map((dish) => {
                const qty = selectedDishes[dish.id] || 0;
                return (
                  <div
                    key={dish.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                      qty > 0
                        ? 'bg-[#201f22] border-[#ff5708]/60 shadow-sm'
                        : 'bg-[#121215] border-[#27272a] hover:border-[#3f3f46]'
                    }`}
                  >
                    <img
                      src={dish.photoUrl}
                      alt={dish.name}
                      className="w-12 h-12 rounded object-cover shrink-0 border border-[#353437]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] text-white truncate">
                        {dish.name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono-code text-[#a1a1aa]">
                        <span>S/ {dish.price.toFixed(2)}</span>
                        <span>•</span>
                        <span className="text-[#ffb59c]">{dish.category}</span>
                      </div>
                    </div>
                    {/* Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {qty > 0 && (
                        <button
                          type="button"
                          disabled={isCatalogLoading}
                          onClick={() => handleQtyChange(dish.id, -1)}
                          className="w-6 h-6 rounded bg-[#27272a] hover:bg-[#3f3f46] text-white flex items-center justify-center font-bold text-[14px]"
                        >
                          -
                        </button>
                      )}
                      <span className={`w-5 text-center font-mono-code text-[13px] font-bold ${qty > 0 ? 'text-[#ff5708]' : 'text-[#71717a]'}`}>
                        {qty}
                      </span>
                      <button
                        type="button"
                        disabled={isCatalogLoading}
                        onClick={() => handleQtyChange(dish.id, 1)}
                        className="w-6 h-6 rounded bg-[#ff5708] hover:bg-orange-600 text-white flex items-center justify-center font-bold text-[14px]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Allergy Alert & Cooking Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono-code uppercase text-[#ffb4ab] mb-1 font-bold">
                Alerta de Alérgenos (Opcional)
              </label>
              <input
                type="text"
                value={allergyAlert}
                onChange={(e) => setAllergyAlert(e.target.value)}
                placeholder="Ej. Celíaco estricto, Alergia a crustáceos..."
                className="w-full bg-[#121215] border border-[#ffb4ab]/40 rounded-lg px-3 py-2 text-[13px] text-[#ffb4ab] placeholder-[#71717a] focus:border-[#ff5708] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono-code uppercase text-[#a1a1aa] mb-1 font-bold">
                Instrucciones de Pase / Servicio
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Salida simultánea, salsa aparte..."
                className="w-full bg-[#121215] border border-[#27272a] rounded-lg px-3 py-2 text-[13px] text-white placeholder-[#71717a] focus:border-[#ff5708] focus:outline-none"
              />
            </div>
          </div>
        </form>

        {/* Footer with Price Summary and Submit */}
        <div className="p-4 bg-[#121215] border-t border-[#27272a] flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono-code text-[#71717a] block">TOTAL COMANDA</span>
            <span className="text-[20px] font-mono-code font-bold text-[#ffb59c]">
              S/ {calculateTotal().toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#e5e1e4] text-[13px] font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isCatalogLoading || Object.keys(selectedDishes).length === 0}
              className="px-6 py-2.5 rounded-lg bg-[#ff5708] hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-[13px] flex items-center gap-2 shadow-lg shadow-[#ff5708]/30 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>{isSubmitting ? 'Enviando…' : 'Enviar a Cocina KDS'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
