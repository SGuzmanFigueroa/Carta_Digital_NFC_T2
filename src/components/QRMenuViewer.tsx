import React, { useState } from 'react';
import { MenuItem, OrderTicket, TableStatus } from '../types';
import { ThreeDView } from './ThreeDView';

interface QRMenuViewerProps {
  menuItems: MenuItem[];
  onAddNewOrder: (newTicket: OrderTicket) => void;
  onShowToast: (msg: string, icon?: string) => void;
  activeTicket?: OrderTicket | null;
  tables?: TableStatus[];
  onSendOrderFromMenu?: (
    table: string,
    items: Array<{ item: MenuItem; quantity: number; notes?: string }>,
    pax?: number
  ) => OrderTicket;
}

export const QRMenuViewer: React.FC<QRMenuViewerProps> = ({
  menuItems,
  onAddNewOrder,
  onShowToast,
  activeTicket,
  tables,
  onSendOrderFromMenu
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number; notes?: string }[]>([
    {
      item: menuItems[0], // Chaufa Wok
      quantity: 1,
      notes: 'Poco picante'
    },
    {
      item: menuItems[8], // Smoked Old Fashioned
      quantity: 1
    }
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState('MESA 04');
  const [isArModalOpen, setIsArModalOpen] = useState(false);
  const [selectedDishForModal, setSelectedDishForModal] = useState<MenuItem | null>(null);

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'todos' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tag && item.tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const cartTotal = cart.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  const cartItemsCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
    onShowToast(`Agregado al pedido: ${item.name}`, 'add_shopping_cart');
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const handleSendOrder = () => {
    if (cart.length === 0) return;

    if (onSendOrderFromMenu) {
      onSendOrderFromMenu(selectedTable, cart, 2);
    } else {
      const newTicket: OrderTicket = {
        id: `cmd-${Math.floor(1000 + Math.random() * 9000)}`,
        table: selectedTable,
        pax: 2,
        timeAgo: 'Justo ahora',
        createdTime: new Date().toLocaleTimeString('es-PE', { hour12: false }),
        origin: 'QR COMENSAL',
        status: 'por-validar',
        items: cart.map((c, idx) => ({
          id: `it-${Date.now()}-${idx}`,
          name: `${c.quantity}x ${c.item.name}`,
          quantity: c.quantity,
          price: c.item.price * c.quantity,
          notes: c.notes,
          station:
            c.item.category === 'bebidas'
              ? 'Barra'
              : c.item.category === 'entradas'
              ? 'Cuarto Frío'
              : 'Wok Station'
        })),
        subtotal: cartTotal,
        total: cartTotal
      };
      onAddNewOrder(newTicket);
    }

    setCart([]);
    setIsCartOpen(false);
    onShowToast(`¡Comanda enviada a Cocina KDS desde ${selectedTable}!`, 'soup_kitchen');
  };

  const heroItem = menuItems[0]; // Chaufa Wok

  return (
    <div className="w-full min-h-screen bg-[#0e0e10] text-[#e5e1e4] pb-28">
      {/* Mobile Top App Bar for Diner */}
      <div className="sticky top-16 z-40 bg-[#0e0e10]/95 backdrop-blur-xl border-b border-[#2a2a2c] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-[#e5e1e4] flex items-center gap-1.5">
              <span>{selectedTable}</span>
              <span className="text-[11px] text-[#ff5708] font-label-code font-normal">AUREA MIRAFLORES</span>
            </span>
            <span className="font-label-code text-[10px] text-[#c6c5cf]">Sesión activa • Auto-pedido</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="bg-[#1c1b1d] text-[#e5e1e4] text-[11px] font-label-code px-2 py-1 rounded border border-[#353437] focus:outline-none focus:border-[#ff5708]"
          >
            {tables && tables.length > 0 ? (
              tables.map((t) => (
                <option key={t.id} value={`MESA ${t.number.toString().padStart(2, '0')}`}>
                  Mesa {t.number.toString().padStart(2, '0')} {t.zone ? `(${t.zone})` : ''}
                </option>
              ))
            ) : (
              <>
                <option value="MESA 04">Mesa 04</option>
                <option value="MESA 01">Mesa 01</option>
                <option value="MESA 02">Mesa 02</option>
                <option value="MESA 07">Mesa 07 (Barra)</option>
                <option value="MESA 06">Mesa 06 (Terraza)</option>
              </>
            )}
          </select>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative px-3 py-1.5 rounded-lg bg-[#ff5708] text-[#511500] font-bold text-[12px] flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,87,8,0.3)] hover:brightness-110 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">shopping_bag</span>
            <span>{cartItemsCount}</span>
          </button>
        </div>
      </div>

      {/* Live Operational Order Status Tracker for Diner */}
      {activeTicket && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-gradient-to-r from-[#1c1b1d] via-[#201f22] to-[#1c1b1d] border border-[#ff5708]/40 rounded-2xl p-4 shadow-[0_0_25px_-5px_rgba(255,87,8,0.25)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5708] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff5708]"></span>
                </span>
                <span className="font-label-code text-[12px] text-[#ffb59c] font-bold uppercase tracking-wider">
                  Comanda #{activeTicket.id.replace('ticket-', '').replace('cmd-', '')} • {activeTicket.table}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-label-code font-bold uppercase bg-[#ff5708]/20 text-[#ffb59c] border border-[#ff5708]/40">
                {activeTicket.status === 'por-validar' && '⏳ Recibido / Por Validar'}
                {activeTicket.status === 'en-cocina' && '🔥 Cocinando en Wok/Josper'}
                {activeTicket.status === 'pase-listo' && '✨ Listo en Mesa de Pase'}
                {activeTicket.status === 'entregado' && '🍽️ Servido en Mesa'}
              </span>
            </div>

            {/* Stepper Progress */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  ['por-validar', 'en-cocina', 'pase-listo', 'entregado'].includes(activeTicket.status)
                    ? 'bg-[#ff5708] shadow-[0_0_8px_#ff5708]'
                    : 'bg-[#353437]'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all ${
                  ['en-cocina', 'pase-listo', 'entregado'].includes(activeTicket.status)
                    ? 'bg-[#ff5708] shadow-[0_0_8px_#ff5708]'
                    : 'bg-[#353437]'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all ${
                  ['pase-listo', 'entregado'].includes(activeTicket.status)
                    ? 'bg-[#ff5708] shadow-[0_0_8px_#ff5708]'
                    : 'bg-[#353437]'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all ${
                  activeTicket.status === 'entregado'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'bg-[#353437]'
                }`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#c6c5cf] font-label-code">
              <span>{activeTicket.items.length} platos en marcha</span>
              <span className="text-[#e5e1e4] font-bold">Total: S/ {activeTicket.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
        {/* Search & Category Filter */}
        <div className="space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#c6c5cf] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar plato de autor, alérgeno o maridaje..."
              className="w-full bg-[#1c1b1d] text-[#e5e1e4] pl-10 pr-4 py-2 rounded-xl text-[13px] placeholder:text-[#c6c5cf]/60 border border-[#353437]/60 focus:outline-none focus:border-[#ff5708] transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'fondos', label: 'Fondos & Wok' },
              { id: 'entradas', label: 'Entradas Nikkei' },
              { id: 'postres', label: 'Postres de Autor' },
              { id: 'bebidas', label: 'Bebidas Signature' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#ff5708] text-[#511500] font-bold shadow-[0_0_12px_rgba(255,87,8,0.3)]'
                    : 'bg-[#1c1b1d] text-[#c6c5cf] hover:text-[#e5e1e4] border border-[#353437]/40'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Holographic 3D Featured Dish Hero Card (Screenshot 9) */}
        <div className="bg-[#201f22] rounded-2xl overflow-hidden border border-[#ff5708]/30 shadow-[0_0_30px_-5px_rgba(255,87,8,0.2)]">
          {/* Real 3D WebGL Canvas Component */}
          <ThreeDView onInteract={() => onShowToast('Interacción 3D: Rotando plato de autor', '3d_rotation')} />

          {/* Dish Details Content */}
          <div className="p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-label-code text-[11px] text-[#ff5708] font-bold">
                    {heroItem.tag}
                  </span>
                  <span className="text-[#353437]">•</span>
                  <span className="font-label-code text-[11px] text-[#c6c5cf]">{heroItem.prepTime}</span>
                </div>
                <h2 className="text-[20px] sm:text-[24px] font-bold text-[#e5e1e4] leading-tight">
                  {heroItem.name}
                </h2>
              </div>

              <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-1">
                <span className="font-label-code text-[22px] font-bold text-[#ff5708]">
                  S/ {heroItem.price.toFixed(2)}
                </span>
                <span className="font-label-code text-[10px] text-[#c6c5cf]">Incluye IGV 18%</span>
              </div>
            </div>

            <p className="text-[13px] text-[#c6c5cf] leading-relaxed">
              {heroItem.description}
            </p>

            {/* Flavor & Pairing Ribbon */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#353437]/30 text-[11px] font-label-code">
              <span className="flex items-center gap-1 text-[#ffb59c] bg-[#1c1b1d] px-2.5 py-1 rounded-lg border border-[#ff5708]/20">
                <span className="material-symbols-outlined text-[15px] text-[#ff5708]">star</span>
                {heroItem.rating} ({heroItem.reviewsCount} reseñas)
              </span>

              <span className="flex items-center gap-1 text-[#a1c9ff] bg-[#1c1b1d] px-2.5 py-1 rounded-lg border border-[#a1c9ff]/20">
                <span className="material-symbols-outlined text-[15px]">wine_bar</span>
                Maridaje: {heroItem.pairing}
              </span>

              <span className="flex items-center gap-1 text-[#e5beb2] bg-[#1c1b1d] px-2.5 py-1 rounded-lg border border-[#353437]/40">
                <span className="material-symbols-outlined text-[15px] text-emerald-400">eco</span>
                {heroItem.dietary}
              </span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsArModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-[#1c1b1d] hover:bg-[#2a2a2c] text-[#e5e1e4] text-[13px] font-medium flex items-center gap-1.5 border border-[#353437] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-[#ff5708]">view_in_ar</span>
                <span className="hidden sm:inline">Visor AR</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddToCart(heroItem)}
                className="flex-1 py-2.5 rounded-xl bg-[#ff5708] hover:brightness-110 text-[#511500] font-bold text-[14px] flex items-center justify-center gap-2 shadow-[0_0_20px_-2px_rgba(255,87,8,0.4)] transition-all cursor-pointer active:scale-98"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                <span>Agregar al Pedido • S/ {heroItem.price.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Full Interactive Menu Grid */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[17px] font-bold text-[#e5e1e4] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff5708] text-[20px]">menu_book</span>
              <span>Nuestra Carta de Especialidades</span>
            </h3>
            <span className="font-label-code text-[11px] text-[#c6c5cf]">
              {filteredItems.length} opciones disponibles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map((dish) => (
              <div
                key={dish.id}
                className="bg-[#1c1b1d] rounded-xl overflow-hidden border border-[#353437]/30 hover:border-[#ff5708]/50 transition-all flex flex-col justify-between group shadow-md"
              >
                <div className="relative h-44 overflow-hidden bg-[#0e0e10]">
                  <img
                    src={dish.image}
                    alt={dish.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1c1b1d] via-transparent to-transparent opacity-80" />

                  {dish.badge && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#ff5708] text-[#511500] font-label-code text-[9px] font-bold shadow">
                      {dish.badge}
                    </span>
                  )}

                  {dish.has3D && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDishForModal(dish);
                        onShowToast(`Abriendo modelo 3D para ${dish.name}`, 'view_in_ar');
                      }}
                      className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#0e0e10]/80 backdrop-blur-md text-[#a1c9ff] border border-[#a1c9ff]/40 font-label-code text-[10px] flex items-center gap-1 cursor-pointer hover:bg-[#a1c9ff] hover:text-[#00315c] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">view_in_ar</span>
                      <span>3D</span>
                    </button>
                  )}

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span className="font-label-code text-[11px] text-[#ffb59c] bg-[#0e0e10]/80 backdrop-blur-md px-1.5 py-0.5 rounded">
                      ★ {dish.rating} ({dish.reviewsCount})
                    </span>
                    <span className="font-label-code text-[11px] text-[#c6c5cf] bg-[#0e0e10]/80 backdrop-blur-md px-1.5 py-0.5 rounded">
                      {dish.prepTime}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="text-[15px] font-semibold text-[#e5e1e4] leading-snug group-hover:text-[#ff5708] transition-colors">
                      {dish.name}
                    </h4>
                    <p className="text-[12px] text-[#c6c5cf] line-clamp-2 leading-relaxed">
                      {dish.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#353437]/20">
                    <span className="font-label-code text-[17px] font-bold text-[#e5e1e4]">
                      S/ {dish.price.toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(dish)}
                      className="px-3 py-1.5 rounded-lg bg-[#2a2a2c] hover:bg-[#ff5708] hover:text-[#511500] text-[#e5e1e4] font-medium text-[12px] flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Persistent Floating Bottom Order Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-3 left-4 right-4 max-w-lg mx-auto z-40">
          <div className="bg-[#1c1b1d]/95 backdrop-blur-xl border border-[#ff5708]/40 p-3 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] flex items-center justify-between gap-3">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => setIsCartOpen(true)}
            >
              <div className="w-10 h-10 rounded-xl bg-[#ff5708] text-[#511500] flex items-center justify-center font-bold font-label-code text-[16px]">
                {cartItemsCount}
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] text-[#c6c5cf]">Total Comanda:</span>
                <span className="font-label-code text-[17px] font-bold text-[#ff5708]">
                  S/ {cartTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="px-3 py-2 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] text-[#e5e1e4] text-[12px] font-medium transition-colors cursor-pointer"
              >
                Ver Pedido
              </button>
              <button
                type="button"
                onClick={handleSendOrder}
                className="px-4 py-2 rounded-xl bg-[#ff5708] text-[#511500] font-bold text-[13px] flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_14px_rgba(255,87,8,0.3)] cursor-pointer"
              >
                <span>Enviar KDS</span>
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#1c1b1d] w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-[#353437] shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#353437]/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff5708] text-[22px]">restaurant</span>
                <h3 className="text-[17px] font-bold text-[#e5e1e4]">Comanda para {selectedTable}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-[#c6c5cf] hover:text-[#e5e1e4] hover:bg-[#2a2a2c]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Cart list */}
            <div className="space-y-3">
              {cart.map((c) => (
                <div
                  key={c.item.id}
                  className="flex items-center justify-between bg-[#201f22] p-3 rounded-xl border border-[#353437]/30"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="text-[14px] font-medium text-[#e5e1e4] truncate">{c.item.name}</h4>
                    <span className="font-label-code text-[12px] text-[#ff5708] font-bold">
                      S/ {(c.item.price * c.quantity).toFixed(2)}
                    </span>
                    {c.notes && (
                      <p className="text-[11px] text-[#c6c5cf] italic">Nota: {c.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 bg-[#1c1b1d] p-1 rounded-lg border border-[#353437]">
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(c.item.id)}
                      className="w-7 h-7 rounded bg-[#2a2a2c] flex items-center justify-center text-white hover:bg-[#353437] cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-label-code text-[13px] px-1 font-bold">{c.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(c.item)}
                      className="w-7 h-7 rounded bg-[#2a2a2c] flex items-center justify-center text-white hover:bg-[#353437] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculation summary */}
            <div className="p-3 bg-[#0e0e10] rounded-xl space-y-1.5 text-[12px] font-label-code">
              <div className="flex justify-between text-[#c6c5cf]">
                <span>SUBTOTAL (SIN IGV)</span>
                <span>S/ {(cartTotal / 1.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#c6c5cf]">
                <span>IGV (18%)</span>
                <span>S/ {(cartTotal - cartTotal / 1.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#e5e1e4] font-bold text-[15px] pt-1 border-t border-[#353437]/40">
                <span>TOTAL A PAGAR</span>
                <span className="text-[#ff5708]">S/ {cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#2a2a2c] text-[#e5e1e4] font-medium text-[13px] hover:bg-[#353437]"
              >
                Seguir Pidiendo
              </button>
              <button
                type="button"
                onClick={handleSendOrder}
                className="flex-1 py-2.5 rounded-xl bg-[#ff5708] text-[#511500] font-bold text-[14px] flex items-center justify-center gap-1.5 hover:brightness-110 shadow-lg cursor-pointer"
              >
                <span>Confirmar y Enviar</span>
                <span className="material-symbols-outlined text-[17px]">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AR Simulation Modal */}
      {isArModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1c1b1d] max-w-md w-full rounded-2xl border border-[#ff5708]/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff5708] text-[24px]">view_in_ar</span>
                <h3 className="text-[17px] font-bold text-[#e5e1e4]">Visor de Realidad Aumentada (AR)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsArModalOpen(false)}
                className="text-[#c6c5cf] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-[13px] text-[#c6c5cf]">
              El visor holográfico proyecta la porción exacta (escala 1:1) del plato directamente sobre la mesa utilizando WebXR y sensores de profundidad.
            </p>

            <div className="p-4 rounded-xl bg-[#0e0e10] border border-[#353437] flex flex-col items-center justify-center text-center space-y-2">
              <span className="material-symbols-outlined text-[48px] text-[#ff5708] animate-bounce">
                center_focus_strong
              </span>
              <span className="text-[12px] font-label-code text-[#ffb59c]">Apuntando sensor a la superficie...</span>
              <span className="text-[11px] text-[#c6c5cf]">Plato centrado y proyectado a escala real 28cm Ø</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsArModalOpen(false);
                onShowToast('Calibración AR completada con éxito', 'done');
              }}
              className="w-full py-2.5 rounded-xl bg-[#ff5708] text-[#511500] font-bold text-[13px] hover:brightness-110"
            >
              Cerrar Visor AR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
