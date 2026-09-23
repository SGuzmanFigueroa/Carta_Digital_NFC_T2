import React, { useState, useEffect, useRef } from 'react';
import { MenuItem, OrderTicket, TableStatus } from '../types';
import { ThreeDView } from './ThreeDView';
import { ARTableViewer } from './ARTableViewer';

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
  onRequestTableAccount?: (paymentMethod: string) => Promise<boolean> | void;
  onCallWaiter?: (reason?: string) => Promise<boolean> | void;
  onDishCreated?: (dish: MenuItem) => void;
  onRefreshDishes?: () => void;
}

export const QRMenuViewer: React.FC<QRMenuViewerProps> = ({
  menuItems,
  onAddNewOrder,
  onShowToast,
  activeTicket,
  tables,
  onSendOrderFromMenu,
  onRequestTableAccount,
  onCallWaiter,
  onDishCreated,
  onRefreshDishes
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [heroViewMode, setHeroViewMode] = useState<'photo' | '3d'>('photo');
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState('MESA 04');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Efectivo' | 'Tarjeta POS (Visa/MC)' | 'Yape / Plin'>('Tarjeta POS (Visa/MC)');
  const [waiterCalled, setWaiterCalled] = useState(false);
    
  // 3D Inspector Modal
  const [selectedDishForModal, setSelectedDishForModal] = useState<MenuItem | null>(null);

  // Real Camera AR Modal
  const [isArModalOpen, setIsArModalOpen] = useState(false);
  const [arCameraActive, setArCameraActive] = useState(false);
  const [arScale, setArScale] = useState(1.0);
  const [arDish, setArDish] = useState<MenuItem>(menuItems[0]); // default to Chaufa or current
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [cart, setCart] = useState<{ item: MenuItem; quantity: number; notes?: string }[]>([
    {
      item: menuItems[0], // Chaufa Wok
      quantity: 1,
      notes: 'Poco picante'
    },
    {
      item: menuItems[1] || menuItems[0], // Wagyu
      quantity: 1
    }
  ]);

  // Sincronizar automáticamente la mesa desde el QR escaneado (?mesa=Mesa 02&zona=Salón)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mesaParam = params.get('mesa');
      if (mesaParam && mesaParam.trim()) {
        const decoded = decodeURIComponent(mesaParam.trim());
        setSelectedTable(decoded);
        try {
          sessionStorage.setItem('gastropulse_active_table', decoded);
        } catch {}
        onShowToast(`Mesa vinculada por QR: ${decoded}`, 'qr_code_scanner');
      } else {
        try {
          const saved = sessionStorage.getItem('gastropulse_active_table');
          if (saved) setSelectedTable(saved);
        } catch {}
      }
    }
  }, []);

    // Handle Real Camera stream for AR Visor
  useEffect(() => {
    if (!isArModalOpen) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setArCameraActive(false);
      return;
    }

    let isMounted = true;
    const startCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });

          if (isMounted) {
            mediaStreamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
            }
            setArCameraActive(true);
            onShowToast('Cámara AR activada: Apunta a tu mesa', 'view_in_ar');
          }
        } else {
          setArCameraActive(false);
        }
      } catch (err) {
        console.warn('Camera access error or denied:', err);
        setArCameraActive(false);
        onShowToast('Modo AR Simulado activo (permiso de cámara no concedido)', 'info');
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [isArModalOpen]);

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
    onShowToast(`Agregado: ${item.name}`, 'add_shopping_cart');
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((c) => (c.item.id === itemId ? { ...c, notes } : c))
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

  const handleConfirmAccountRequest = async () => {
    if (onRequestTableAccount) {
      await onRequestTableAccount(selectedPaymentMethod);
    }
    setIsPaymentModalOpen(false);
    onShowToast(`Cuenta solicitada (${selectedPaymentMethod}). Garzón en camino con el comprobante.`, 'receipt_long');
  };

  const handleTriggerCallWaiter = async () => {
    setWaiterCalled(true);
    if (onCallWaiter) {
      await onCallWaiter('Solicitud de atención general');
    }
    onShowToast('¡Garzón alertado! Un miembro del salón se acerca a tu mesa.', 'notifications_active');
    setTimeout(() => setWaiterCalled(false), 8000);
  };

  const heroItem = menuItems[0]; // Arroz Chaufa Wok de Autor

  return (
    <div className="w-full min-h-screen bg-[#0b0c0e] text-[#e5e1e4] pb-36 selection:bg-[#ff5708] selection:text-white">
      {/* ========================================================================= */}
      {/* 📱 ULTRA-CLEAN MOBILE-FIRST TOP APP BAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#0e0e10]/95 backdrop-blur-xl border-b border-[#24252c] px-3.5 sm:px-6 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Brand & Table Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff5708] to-[#ff7b39] flex items-center justify-center shadow-lg shadow-[#ff5708]/25 shrink-0">
              <span className="material-symbols-outlined text-[#0e0e10] text-[18px] font-bold">restaurant_menu</span>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] sm:text-[14px] font-bold text-white tracking-tight truncate font-sans">
                  AUREA <span className="text-[#ff5708] font-normal text-[11px]">BISTRO</span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(true)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1c1d23] hover:bg-[#282932] border border-[#353642] text-[#ffb59c] text-[10px] sm:text-[11px] font-mono-code font-semibold cursor-pointer transition-colors"
                  title="Cambiar Mesa"
                >
                  <span>{selectedTable}</span>
                  <span className="material-symbols-outlined text-[12px] text-[#ff5708]">expand_more</span>
                </button>
                <span className="text-[10px] text-emerald-400 font-medium hidden xs:inline flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>Auto-pedido QR activo</span>
              </div>
            </div>
          </div>

          {/* Right Header Controls: Cart Pill Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative px-3 py-1.5 rounded-xl bg-[#ff5708] hover:bg-[#ff6924] text-[#2b0b00] font-bold text-[12px] flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,87,8,0.35)] active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">shopping_bag</span>
              <span>{cartItemsCount}</span>
              {cartTotal > 0 && (
                <span className="hidden sm:inline-block font-mono-code text-[11px] border-l border-[#511500]/30 pl-1.5">
                  S/ {cartTotal.toFixed(2)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* ⏳ LIVE OPERATIONAL ORDER STATUS TRACKER */}
      {/* ========================================================================= */}
      {activeTicket && (
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 pt-3.5">
          <div className="bg-gradient-to-r from-[#181920] via-[#20212b] to-[#181920] border border-[#ff5708]/50 rounded-2xl p-3.5 shadow-[0_0_25px_-5px_rgba(255,87,8,0.25)] flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5708] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff5708]"></span>
                </span>
                <span className="font-mono-code text-[11px] sm:text-[12px] text-[#ffb59c] font-bold uppercase truncate">
                  Comanda #{activeTicket.id.replace('ticket-', '').replace('cmd-', '')} • {activeTicket.table}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono-code font-bold uppercase bg-[#ff5708]/20 text-[#ffb59c] border border-[#ff5708]/40 shrink-0">
                {activeTicket.status === 'por-validar' && '⏳ Recibido'}
                {activeTicket.status === 'en-cocina' && '🔥 En Cocina'}
                {activeTicket.status === 'pase-listo' && '✨ Listo en Pase'}
                {activeTicket.status === 'entregado' && '🍽️ Servido en Mesa'}
              </span>
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              <div className="h-1.5 rounded-full bg-[#ff5708] shadow-[0_0_8px_#ff5708]" />
              <div
                className={`h-1.5 rounded-full transition-all ${
                  ['en-cocina', 'pase-listo', 'entregado'].includes(activeTicket.status)
                    ? 'bg-[#ff5708] shadow-[0_0_8px_#ff5708]'
                    : 'bg-[#2e2f38]'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all ${
                  ['pase-listo', 'entregado'].includes(activeTicket.status)
                    ? 'bg-[#ff5708] shadow-[0_0_8px_#ff5708]'
                    : 'bg-[#2e2f38]'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all ${
                  activeTicket.status === 'entregado'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'bg-[#2e2f38]'
                }`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#a1a1aa] font-mono-code">
              <span>{activeTicket.items.length} platos en marcha</span>
              <span className="text-white font-bold">Total: S/ {activeTicket.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 space-y-5">
        {/* ========================================================================= */}
        {/* 🔍 SEARCH & CATEGORIES */}
        {/* ========================================================================= */}
        <div className="space-y-2.5">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[#71717a] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar plato de autor, insumo o maridaje..."
              className="w-full bg-[#15161c] text-[#e5e1e4] pl-10 pr-9 py-2 rounded-xl text-[13px] placeholder:text-[#71717a] border border-[#2d2e38] focus:outline-none focus:border-[#ff5708] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-[#71717a] hover:text-white"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
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
                    ? 'bg-[#ff5708] text-[#2b0b00] font-bold shadow-[0_0_12px_rgba(255,87,8,0.35)]'
                    : 'bg-[#181920] text-[#a1a1aa] hover:text-white border border-[#2a2b35]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ⭐ HERO FEATURED DISH (DUAL VIEW: 📸 FOTO HD / 🧊 3D 360°) */}
        {/* ========================================================================= */}
        <section className="bg-[#15161c] rounded-2xl overflow-hidden border border-[#ff5708]/35 shadow-[0_4px_30px_rgba(255,87,8,0.15)]">
          <div className="px-3.5 py-2.5 bg-[#121318] border-b border-[#24252e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff5708]"></span>
              <span className="text-[11px] font-mono-code font-bold text-[#ffb59c] uppercase tracking-wider">
                PLATO INSIGNIA DE AUTOR
              </span>
            </div>

            <div className="flex items-center bg-[#1e1f28] p-0.5 rounded-lg border border-[#353642]">
              <button
                type="button"
                onClick={() => setHeroViewMode('photo')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  heroViewMode === 'photo'
                    ? 'bg-[#ff5708] text-[#2b0b00] font-bold shadow'
                    : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">image</span>
                <span>Foto HD</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setHeroViewMode('3d');
                  onShowToast('Cargando plato en visor 3D interactivo', 'view_in_ar');
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  heroViewMode === '3d'
                    ? 'bg-[#ff5708] text-[#2b0b00] font-bold shadow'
                    : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">view_in_ar</span>
                <span>3D 360°</span>
              </button>
            </div>
          </div>

          <div className="relative">
            {heroViewMode === 'photo' ? (
              <div className="relative w-full h-64 sm:h-80 overflow-hidden bg-[#0e0e10] group">
                <img
                  src={heroItem.image}
                  alt={heroItem.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#15161c] via-transparent to-black/40" />

                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#ff5708] text-[#2b0b00] font-mono-code text-[10px] font-bold shadow-lg">
                    {heroItem.badge}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[#a1c9ff] font-mono-code text-[10px] border border-[#a1c9ff]/30">
                    {heroItem.tag}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setHeroViewMode('3d')}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-[#ff5708]/50 text-[#ffb59c] hover:text-white text-[11px] font-mono-code font-semibold flex items-center gap-1.5 shadow-xl hover:scale-105 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px] text-[#ff5708]">view_in_ar</span>
                  <span>Interactuar en 3D</span>
                </button>
              </div>
            ) : (
              <ThreeDView
                dishId={heroItem.id}
                heightClass="h-64 sm:h-80"
                onInteract={() => onShowToast('Rotando Arroz Chaufa Wok 3D', '3d_rotation')}
              />
            )}
          </div>

          <div className="p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono-code text-[11px] text-[#ff5708] font-bold">
                    {heroItem.tag}
                  </span>
                  <span className="text-[#353642]">•</span>
                  <span className="font-mono-code text-[11px] text-[#a1a1aa]">{heroItem.prepTime}</span>
                </div>
                <h2 className="text-[19px] sm:text-[23px] font-bold text-white leading-snug">
                  {heroItem.name}
                </h2>
              </div>

              <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-1">
                <span className="font-mono-code text-[22px] sm:text-[24px] font-bold text-[#ff5708]">
                  S/ {heroItem.price.toFixed(2)}
                </span>
                <span className="font-mono-code text-[10px] text-[#71717a]">Incluye IGV 18%</span>
              </div>
            </div>

            <p className="text-[13px] text-[#a1a1aa] leading-relaxed">
              {heroItem.description}
            </p>

            {/* Flavor & Pairing Ribbon */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#24252e] text-[11px] font-mono-code">
              <span className="inline-flex items-center gap-1 text-[#ffb59c] bg-[#1a1b22] px-2.5 py-1 rounded-lg border border-[#ff5708]/20">
                <span className="material-symbols-outlined text-[14px] text-[#ff5708]">star</span>
                {heroItem.rating} ({heroItem.reviewsCount} reseñas)
              </span>

              <span className="inline-flex items-center gap-1 text-[#a1c9ff] bg-[#1a1b22] px-2.5 py-1 rounded-lg border border-[#a1c9ff]/20">
                <span className="material-symbols-outlined text-[14px]">wine_bar</span>
                {heroItem.pairing}
              </span>

              <span className="inline-flex items-center gap-1 text-emerald-400 bg-[#1a1b22] px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <span className="material-symbols-outlined text-[14px]">eco</span>
                {heroItem.dietary}
              </span>
            </div>

            {/* Main Action Buttons */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setArDish(heroItem);
                  setIsArModalOpen(true);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[#1e1f28] hover:bg-[#282935] text-[#e5e1e4] text-[13px] font-medium flex items-center gap-1.5 border border-[#353642] transition-colors cursor-pointer"
                title="Proyectar plato con cámara en tu mesa"
              >
                <span className="material-symbols-outlined text-[17px] text-[#ff5708]">view_in_ar</span>
                <span>Visor AR en Mesa</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddToCart(heroItem)}
                className="flex-1 py-2.5 rounded-xl bg-[#ff5708] hover:bg-[#ff6924] text-[#2b0b00] font-bold text-[13px] sm:text-[14px] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,87,8,0.4)] active:scale-98 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                <span>Agregar al Pedido • S/ {heroItem.price.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 📖 SPECIALTY DISHES GRID */}
        {/* ========================================================================= */}
        <section className="space-y-3.5 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] sm:text-[18px] font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff5708] text-[20px]">menu_book</span>
              <span>Nuestra Carta de Especialidades</span>
            </h3>
            <span className="font-mono-code text-[11px] text-[#71717a]">
              {filteredItems.length} opciones
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredItems.map((dish) => (
              <article
                key={dish.id}
                className="bg-[#15161c] rounded-2xl overflow-hidden border border-[#24252e] hover:border-[#ff5708]/50 transition-all flex flex-col justify-between group shadow-sm"
              >
                {/* Image & Badges */}
                <div className="relative h-44 sm:h-48 overflow-hidden bg-[#0e0e10]">
                  <img
                    src={dish.image}
                    alt={dish.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#15161c] via-transparent to-black/30" />

                  {dish.badge && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-[#ff5708] text-[#2b0b00] font-mono-code text-[9px] font-bold shadow">
                      {dish.badge}
                    </span>
                  )}

                  {dish.has3D && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDishForModal(dish);
                        onShowToast(`Abriendo modelo 3D: ${dish.name}`, 'view_in_ar');
                      }}
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-[#ffb59c] border border-[#ff5708]/50 font-mono-code text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#ff5708] hover:text-[#2b0b00] transition-colors shadow-lg"
                      title="Ver plato en 3D interactivo"
                    >
                      <span className="material-symbols-outlined text-[14px]">view_in_ar</span>
                      <span>Ver en 3D</span>
                    </button>
                  )}

                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono-code">
                    <span className="text-[#ffb59c] bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded">
                      ★ {dish.rating} ({dish.reviewsCount})
                    </span>
                    <span className="text-[#a1a1aa] bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded">
                      {dish.prepTime}
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="text-[15px] font-semibold text-white leading-snug group-hover:text-[#ff5708] transition-colors">
                      {dish.name}
                    </h4>
                    <p className="text-[12px] text-[#a1a1aa] line-clamp-2 leading-relaxed">
                      {dish.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#24252e]">
                    <div className="flex flex-col">
                      <span className="font-mono-code text-[16px] sm:text-[17px] font-bold text-[#ff5708]">
                        S/ {dish.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {dish.has3D && (
                        <button
                          type="button"
                          onClick={() => {
                            setArDish(dish);
                            setIsArModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-[#1e1f28] hover:bg-[#282935] text-[#a1c9ff] border border-[#353642] transition-colors cursor-pointer"
                          title="Proyectar con cámara AR"
                        >
                          <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddToCart(dish)}
                        className="px-3 py-1.5 rounded-xl bg-[#24252e] hover:bg-[#ff5708] text-white hover:text-[#2b0b00] font-semibold text-[12px] flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 🛒 PERSISTENT FLOATING BOTTOM ORDER BAR */}
      {/* ========================================================================= */}
      {cart.length > 0 && (
        <div className="fixed bottom-3 left-3 right-3 max-w-md mx-auto z-40">
          <div className="bg-[#15161c]/95 backdrop-blur-xl border border-[#ff5708]/50 p-2.5 sm:p-3 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.8)] flex items-center justify-between gap-2.5">
            <div
              className="flex items-center gap-2.5 cursor-pointer min-w-0"
              onClick={() => setIsCartOpen(true)}
            >
              <div className="w-9 h-9 rounded-xl bg-[#ff5708] text-[#2b0b00] flex items-center justify-center font-bold font-mono-code text-[15px] shrink-0 shadow-md">
                {cartItemsCount}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-[#a1a1aa] truncate">Total ({cartItemsCount} platos):</span>
                <span className="font-mono-code text-[15px] sm:text-[16px] font-bold text-[#ff5708]">
                  S/ {cartTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="px-2.5 sm:px-3 py-2 rounded-xl bg-[#24252e] hover:bg-[#2d2e3a] text-white text-[11px] sm:text-[12px] font-medium transition-colors cursor-pointer"
              >
                Ver Pedido
              </button>
              <button
                type="button"
                onClick={handleSendOrder}
                className="px-3 sm:px-4 py-2 rounded-xl bg-[#ff5708] text-[#2b0b00] font-bold text-[12px] sm:text-[13px] flex items-center gap-1 hover:bg-[#ff6924] active:scale-95 transition-all shadow-[0_0_15px_rgba(255,87,8,0.35)] cursor-pointer"
              >
                <span>Enviar</span>
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🪑 TABLE SELECTOR MODAL */}
      {/* ========================================================================= */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#15161c] w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-[#2d2e38] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#24252e]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff5708] text-[20px]">table_restaurant</span>
                <h3 className="text-[16px] font-bold text-white">Selecciona tu Mesa</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="p-1 rounded-lg text-[#a1a1aa] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-[12px] text-[#a1a1aa]">
              Indica la mesa donde te encuentras para despachar tu comanda a la estación de cocina correspondiente:
            </p>

            <div className="grid grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {(tables && tables.length > 0
                ? tables.map((t) => `MESA ${t.number.toString().padStart(2, '0')}`)
                : [
                    'MESA 01', 'MESA 02', 'MESA 03', 'MESA 04',
                    'MESA 05', 'MESA 06', 'MESA 07', 'MESA 08',
                    'MESA 09', 'MESA 10', 'MESA 11', 'MESA 12'
                  ]
              ).map((tableNum) => (
                <button
                  key={tableNum}
                  type="button"
                  onClick={() => {
                    setSelectedTable(tableNum);
                    setIsTableModalOpen(false);
                    onShowToast(`Mesa configurada: ${tableNum}`, 'check_circle');
                  }}
                  className={`py-2.5 px-2 rounded-xl text-[12px] font-mono-code font-bold transition-all border text-center cursor-pointer ${
                    selectedTable === tableNum
                      ? 'bg-[#ff5708] text-[#2b0b00] border-[#ff5708] shadow-lg shadow-[#ff5708]/30'
                      : 'bg-[#1e1f28] text-white border-[#2e2f3a] hover:border-[#ff5708]/40'
                  }`}
                >
                  {tableNum}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#24252e] hover:bg-[#2e2f3a] text-white text-[13px] font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🛍️ CART DRAWER / REVIEW MODAL */}
      {/* ========================================================================= */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#15161c] w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-[#2d2e38] shadow-2xl p-5 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#24252e]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff5708] text-[20px]">receipt_long</span>
                <h3 className="text-[16px] font-bold text-white">Tu Pedido • {selectedTable}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#24252e]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {cart.map((c) => (
                <div
                  key={c.item.id}
                  className="bg-[#1e1f28] p-3 rounded-xl border border-[#2a2b36] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] sm:text-[14px] font-semibold text-white truncate">
                        {c.item.name}
                      </h4>
                      <span className="font-mono-code text-[12px] text-[#ff5708] font-bold">
                        S/ {(c.item.price * c.quantity).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-[#15161c] px-2 py-1 rounded-lg border border-[#2d2e38]">
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(c.item.id)}
                        className="w-6 h-6 rounded bg-[#24252e] flex items-center justify-center text-white hover:bg-[#ff5708] hover:text-[#2b0b00] font-bold text-[14px] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono-code text-[12px] px-1 font-bold">{c.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(c.item)}
                        className="w-6 h-6 rounded bg-[#24252e] flex items-center justify-center text-white hover:bg-[#ff5708] hover:text-[#2b0b00] font-bold text-[14px] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Nota de cocina (ej. Sin cebolla, término medio...)"
                    value={c.notes || ''}
                    onChange={(e) => handleUpdateNotes(c.item.id, e.target.value)}
                    className="w-full bg-[#15161c] text-[#e5e1e4] px-2.5 py-1 rounded-lg text-[11px] placeholder:text-[#71717a] border border-[#2d2e38] focus:outline-none focus:border-[#ff5708]"
                  />
                </div>
              ))}
            </div>

            <div className="p-3 bg-[#0e0e10] rounded-xl space-y-1.5 text-[11px] sm:text-[12px] font-mono-code">
              <div className="flex justify-between text-[#a1a1aa]">
                <span>SUBTOTAL (SIN IGV)</span>
                <span>S/ {(cartTotal / 1.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#a1a1aa]">
                <span>IGV (18%)</span>
                <span>S/ {(cartTotal - cartTotal / 1.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-[14px] sm:text-[15px] pt-1.5 border-t border-[#24252e]">
                <span>TOTAL A PAGAR</span>
                <span className="text-[#ff5708]">S/ {cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#24252e] text-[#e5e1e4] font-medium text-[13px] hover:bg-[#2d2e3a]"
              >
                Seguir Pidiendo
              </button>
              <button
                type="button"
                onClick={handleSendOrder}
                className="flex-1 py-2.5 rounded-xl bg-[#ff5708] text-[#2b0b00] font-bold text-[13px] flex items-center justify-center gap-1.5 hover:bg-[#ff6924] shadow-lg cursor-pointer"
              >
                <span>Confirmar y Enviar</span>
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🧊 SPECIFIC DISH 3D INSPECTOR MODAL */}
      {/* ========================================================================= */}
      {selectedDishForModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#15161c] w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-[#ff5708]/40 shadow-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#24252e]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff5708] text-[20px]">view_in_ar</span>
                <h3 className="text-[15px] sm:text-[16px] font-bold text-white truncate">
                  {selectedDishForModal.name} (3D)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDishForModal(null)}
                className="p-1 rounded-lg text-[#a1a1aa] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Custom 3D canvas tailored to this specific dish! */}
            <ThreeDView
              dishId={selectedDishForModal.id}
              heightClass="h-64 sm:h-72"
              onInteract={() => onShowToast(`Inspeccionando ${selectedDishForModal.name}`, '3d_rotation')}
            />

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono-code text-[#ffb59c] font-bold">{selectedDishForModal.tag}</span>
                <span className="text-[18px] font-mono-code font-bold text-[#ff5708]">
                  S/ {selectedDishForModal.price.toFixed(2)}
                </span>
              </div>
              <p className="text-[12px] text-[#a1a1aa] leading-relaxed">
                {selectedDishForModal.description}
              </p>
            </div>

            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setArDish(selectedDishForModal);
                  setSelectedDishForModal(null);
                  setIsArModalOpen(true);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[#1e1f28] hover:bg-[#282935] text-[#a1c9ff] border border-[#353642] text-[12px] flex items-center gap-1.5"
                title="Proyectar con cámara en tu mesa"
              >
                <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
                <span>Visor AR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleAddToCart(selectedDishForModal);
                  setSelectedDishForModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#ff5708] text-[#2b0b00] font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-lg hover:bg-[#ff6924]"
              >
                <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                <span>Pedir Plato • S/ {selectedDishForModal.price.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 REAL CAMERA AUGMENTED REALITY (AR) VISOR OVERLAY */}
      {/* ========================================================================= */}
      {isArModalOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between animate-fadeIn overflow-hidden">
          {/* Live Phone Camera Video Stream */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover z-0"
          />

          {/* Fallback surface texture if camera access is denied */}
          {!arCameraActive && (
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#111216] via-[#1a1c24] to-[#0e0f13] flex flex-col items-center justify-center">
              <div className="w-80 h-80 rounded-full border border-dashed border-[#ff5708]/30 animate-pulse flex items-center justify-center">
                <span className="text-[12px] font-mono-code text-[#ffb59c]">Superficie de Mesa Calibrada</span>
              </div>
            </div>
          )}

          {/* Top Bar Overlay */}
          <div className="relative z-20 px-4 pt-safe pt-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px] text-[#ff5708]">view_in_ar</span>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-white leading-tight">Visor AR en Mesa</span>
                <span className="text-[10px] font-mono-code text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{arCameraActive ? 'Cámara Trasera Activa' : 'Sensor Simulado'}</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsArModalOpen(false)}
              className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Interactive 3D Dish Overlay directly in the camera view! */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center pointer-events-auto">
            {/* Reticle Table Target Indicator */}
            <div className="absolute w-64 h-64 border-2 border-dashed border-[#ff5708]/50 rounded-full pointer-events-none animate-pulse flex items-center justify-center">
              <span className="text-[10px] font-mono-code text-[#ffb59c] bg-black/60 px-2 py-0.5 rounded-full">
                {arDish.name} (Escala 1:1 • 28cm Ø)
              </span>
            </div>

            <div style={{ transform: `scale(${arScale})` }} className="w-full transition-transform duration-200">
              <ThreeDView
                dishId={arDish.id}
                enableCameraBg={true}
                heightClass="h-72 sm:h-96"
                onInteract={() => onShowToast('Moviendo plato en tu mesa', 'view_in_ar')}
              />
            </div>
          </div>

          {/* Bottom Floating AR Controls */}
          <div className="relative z-20 px-4 pb-safe pb-5 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-4 space-y-3">
            {/* Scale controls */}
            <div className="flex items-center justify-between bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-white/15 text-[11px] font-mono-code">
              <span className="text-[#a1a1aa]">Escala Real en Mesa:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setArScale((s) => Math.max(0.6, s - 0.1))}
                  className="w-6 h-6 rounded bg-[#2a2b36] text-white flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="text-[#ff5708] font-bold">{(arScale * 28).toFixed(0)} cm Ø</span>
                <button
                  type="button"
                  onClick={() => setArScale((s) => Math.min(1.4, s + 0.1))}
                  className="w-6 h-6 rounded bg-[#2a2b36] text-white flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Dish Info & Add to Cart button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-bold text-white truncate">{arDish.name}</span>
                <span className="text-[12px] font-mono-code text-[#ff5708] font-bold">S/ {arDish.price.toFixed(2)}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleAddToCart(arDish);
                  setIsArModalOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#ff5708] text-[#2b0b00] font-bold text-[13px] flex items-center gap-1.5 shadow-lg hover:bg-[#ff6924] active:scale-95"
              >
                <span className="material-symbols-outlined text-[17px]">add_shopping_cart</span>
                <span>Pedir este Plato</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
