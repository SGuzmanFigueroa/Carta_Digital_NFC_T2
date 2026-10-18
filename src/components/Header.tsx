import React, { useState } from 'react';
import Link from 'next/link';
import { ScreenTab } from '../types';
import { useRestaurant } from '../context/RestaurantContext';
import { getTranslations } from '../i18n/adminTranslations';
import { fetchSystemConfigFromDb } from '@/services/configService';
import { isAdminRole, normalizeRole } from '../utils/security';
import { DishImage } from './menu/DishImage';
import { useStaffSession } from '@/context/StaffSessionContext';

interface HeaderProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  activeOrdersCount: number;
  urgentCount: number;
  language?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  activeOrdersCount,
  urgentCount,
  language
}) => {
  const t = getTranslations(language);
  const { tickets = [], orders = [] } = useRestaurant();
  const { currentUser, lockTerminal, logoutUser } = useStaffSession();
  const [bistroOpen, setBistroOpen] = useState(false);
  const [selectedBistro, setSelectedBistro] = useState('AUREA Bistro (Principal)');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<boolean>(false);

  // Load configured branch name dynamically from Supabase
  React.useEffect(() => {
    fetchSystemConfigFromDb().then((cfg) => {
      if (cfg?.branchName) {
        setSelectedBistro(cfg.branchName);
      }
    }).catch(console.warn);
  }, []);

  // Compute live operational notifications from active tickets and orders
  const liveNotifications = React.useMemo(() => {
    const list: Array<{ id: string; title: string; desc: string; time: string; type: 'urgent' | 'info' | 'success' }> = [];

    // 1. Critical delay alerts
    tickets
      .filter((t) => t.status !== 'lista_despachada' && t.status !== 'archivada' && (t.isUrgent || (t.elapsedSeconds || 0) > (t.targetSeconds || 600)))
      .slice(0, 2)
      .forEach((t) => {
        list.push({
          id: `delay-${t.id}`,
          title: `Demora Crítica: ${t.table}`,
          desc: `Comanda #${t.orderNumber} supera tiempo estándar en ${Math.floor(((t.elapsedSeconds || 0) - (t.targetSeconds || 600)) / 60)}m`,
          time: 'En vivo',
          type: 'urgent'
        });
      });

    // 2. Allergen warnings
    tickets
      .filter((t) => t.allergyAlert || t.items.some((it) => it.allergens?.length || it.cookingNotes?.some((n) => n.toLowerCase().includes('alerg'))))
      .slice(0, 2)
      .forEach((t) => {
        list.push({
          id: `allergen-${t.id}`,
          title: `Alérgenos: ${t.table}`,
          desc: t.allergyAlert || 'Protocolo de alérgenos activo en pase',
          time: 'Activo',
          type: 'urgent'
        });
      });

    // 3. Bill requested
    orders
      .filter((o) => o.accountRequested)
      .slice(0, 2)
      .forEach((o) => {
        list.push({
          id: `bill-${o.id}`,
          title: `Cuenta Solicitada: ${o.table}`,
          desc: `Importe S/ ${o.total.toFixed(2)} (${o.paymentMethod || 'POS Móvil / Efectivo'})`,
          time: o.createdTime || 'Ahora',
          type: 'info'
        });
      });

    // 4. Dispatched runners
    tickets
      .filter((t) => t.status === 'lista_despachada')
      .slice(0, 2)
      .forEach((t) => {
        list.push({
          id: `dispatch-${t.id}`,
          title: `Pase Listo: ${t.table}`,
          desc: `Comanda #${t.orderNumber} despachada por ${t.serverOrRunner}`,
          time: t.timestamp || 'Reciente',
          type: 'success'
        });
      });

    // Fallbacks if quiet service
    if (list.length === 0) {
      list.push(
        { id: 'ok-1', title: 'Servicio en Ritmo Óptimo', desc: 'Todas las partidas operando dentro del tiempo estándar', time: 'En vivo', type: 'success' },
        { id: 'ok-2', title: 'Sincronización en la Nube', desc: 'Supabase PostgreSQL y KDS sincronizados al 100%', time: 'Activo', type: 'info' }
      );
    }

    return list;
  }, [tickets, orders]);

  const bistros = ['AUREA Bistro (Principal)', 'AUREA Rooftop Lounge', 'AUREA Privé Salón'];

  const roleNameMap: Record<string, string> = {
    admin: 'Gerente General',
    kitchen: 'Jefe de Partida / Cocina',
    floor: 'Capitán de Sala',
    bar: 'Jefe de Barra',
    runner: 'Personal Runner'
  };

  // Rol y permisos de la sesión activa. `currentUser` proviene del contexto global, que
  // mantiene la sesión sincronizada con localStorage y con la cookie validada por el
  // proxy, así que este bloque se recalcula en vivo en cada login / logout.
  const sessionRole = normalizeRole(currentUser?.role);
  const sessionRoleLabel =
    roleNameMap[sessionRole] ||
    (currentUser?.roleTitle?.trim() ? currentUser.roleTitle : 'Personal de Turno');

  // Matriz de permisos centralizada en utils/security: coincidencia exacta de rol,
  // sin heurísticas de texto que escalen privilegios indebidamente.
  const isAdmin = isAdminRole(currentUser?.role, currentUser?.roleTitle);

  // Screens available in the navigation filtered by role matrix (CD-5)
  const navTabs: Array<{ id: ScreenTab; label: string; href: string; adminOnly?: boolean }> = [
    { id: 'central_pedidos', label: t.orders_central, href: '/pedidos' },
    { id: 'cocina_kds', label: t.kitchen_kds, href: '/kds' },
    { id: 'panel_admin', label: t.admin_panel, href: '/dashboard', adminOnly: true },
    { id: 'gestion_usuarios', label: t.user_management, href: '/personal', adminOnly: true },
    { id: 'configuracion', label: t.configuration, href: '/configuracion', adminOnly: true }
  ];

  const visibleNavTabs = navTabs.filter((tab) => !tab.adminOnly || isAdmin);
  const currentTabLabel = visibleNavTabs.find((tab) => tab.id === currentTab)?.label ?? '';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0e0e10]/95 backdrop-blur-xl border-b border-[#353437]/50 h-16 w-full">
      <div className="h-full w-full px-3 sm:px-4 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 max-w-[1920px] mx-auto">
        {/* Left Brand and Status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Screen menu toggle (mobile / tablet only) */}
          <button
            onClick={() => {
              setNavOpen(!navOpen);
              setBistroOpen(false);
              setNotificationsOpen(false);
              setUserMenuOpen(false);
            }}
            className="xl:hidden flex items-center justify-center gap-1.5 h-9 min-w-9 px-2 sm:px-3 rounded-lg bg-[#1c1b1d] hover:bg-[#2a2a2c] border border-[#353437] text-[#e5e1e4] transition-colors shrink-0 cursor-pointer"
            aria-label="Menú de pantallas"
            aria-expanded={navOpen}
          >
            <span className="material-symbols-outlined text-[20px]">{navOpen ? 'close' : 'menu'}</span>
            <span className="hidden lg:inline text-[12px] font-semibold whitespace-nowrap">{currentTabLabel}</span>
          </button>

          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none shrink-0"
            onClick={() => onSelectTab('cocina_kds')}
          >
            <div className="w-7 h-7 rounded bg-[#ff5708] flex items-center justify-center shadow-lg shadow-[#ff5708]/30 shrink-0">
              <span className="material-symbols-outlined text-[#0e0e10] text-[18px] font-bold">restaurant_menu</span>
            </div>
            <span className="text-[16px] sm:text-[18px] tracking-tight font-bold text-[#e5e1e4] uppercase font-sans whitespace-nowrap">
              GASTROPULSE<span className="text-[#ffb59c] font-normal text-[11px] sm:text-[12px] ml-1 tracking-normal font-mono-code">OS</span>
            </span>
          </div>

          <div className="h-4 w-px bg-[#353437] hidden sm:block shrink-0"></div>

          {/* Restaurant Selector Dropdown con ancho fijo blindado anti-layout-shift */}
          <div className="relative hidden sm:block w-[190px] xl:w-[215px] shrink-0">
            <button
              onClick={() => setBistroOpen(!bistroOpen)}
              className="w-full flex items-center justify-between gap-1.5 bg-[#1c1b1d] hover:bg-[#2a2a2c] px-2.5 py-1 rounded border border-[#353437]/50 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-[#ff5708] text-[15px] sm:text-[16px] shrink-0">storefront</span>
                <span className="text-[12px] sm:text-[13px] text-[#e5e1e4] font-semibold truncate">{selectedBistro}</span>
              </div>
              <span className="material-symbols-outlined text-[#c6c5cf] text-[15px] sm:text-[16px] shrink-0">expand_more</span>
            </button>

            {bistroOpen && (
              <div className="absolute top-full mt-1.5 left-0 w-64 bg-[#1c1b1d] border border-[#353437] rounded-lg shadow-2xl p-1 z-50">
                <div className="text-[11px] font-mono-code text-[#71717a] px-2 py-1 uppercase tracking-wider font-bold">Sedes & Ámbitos</div>
                {bistros.map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setSelectedBistro(b);
                      setBistroOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-[13px] flex items-center justify-between hover:bg-[#2a2a2c] transition-colors ${
                      selectedBistro === b ? 'text-[#ff5708] font-bold bg-[#ff5708]/10' : 'text-[#e5e1e4]'
                    }`}
                  >
                    <span>{b}</span>
                    {selectedBistro === b && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          
        </div>

        {/* Center Navigation Tabs (Pantallas del sistema filtradas por rol) */}
        <nav className="hidden xl:flex items-center gap-0.5 2xl:gap-1 h-full shrink-0">
          {visibleNavTabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={() => onSelectTab(tab.id)}
              className={`h-full flex items-center gap-1.5 px-2.5 2xl:px-3.5 font-sans text-[12px] 2xl:text-[13px] font-medium transition-all border-b-2 whitespace-nowrap cursor-pointer select-none active:scale-[0.98] ${
                currentTab === tab.id
                  ? 'bg-[#2a2a2c] text-[#e5e1e4] font-semibold border-[#ff5708]'
                  : 'border-transparent text-[#bcbbc5] hover:text-[#e5e1e4] hover:bg-[#1c1b1d]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === 'cocina_kds' && activeOrdersCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] 2xl:text-[11px] font-mono-code font-bold ${
                  urgentCount > 0 ? 'bg-[#93000a] text-white animate-pulse' : 'bg-[#ff5708]/30 text-[#ffb59c]'
                }`}>
                  {activeOrdersCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right Controls: Quick Lock, Notifications & Staff Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto">
          {/* Quick Lock Button */}
          <button
            onClick={lockTerminal}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1c1b1d] hover:bg-[#2a2a2c] text-[#bcbbc5] hover:text-[#ff5708] border border-[#353437] transition-all text-[11px] font-semibold"
            title="Bloquear Terminal Inmediatamente"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-500">lock</span>
            <span className="hidden md:inline">{t.lock}</span>
          </button>

          {/* Notifications button */}
          <div className="sm:relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setNavOpen(false);
                setUserMenuOpen(false);
              }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#c6c5cf] hover:text-[#e5e1e4] hover:bg-[#2a2a2c] border border-transparent hover:border-[#353437] transition-colors relative cursor-pointer"
              aria-label="Notificaciones"
            >
              <span className="material-symbols-outlined text-[19px] sm:text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 rounded-full bg-[#ff5708]"></span>
            </button>

            {notificationsOpen && (
              <div className="absolute top-full mt-2 left-3 right-3 sm:left-auto sm:right-0 sm:w-96 bg-[#1c1b1d] border border-[#353437] rounded-xl shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#353437]/60 mb-2">
                  <div className="font-bold text-[13px] text-[#e5e1e4]">Bitácora de Pase en Vivo</div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono-code text-[#ff5708]">
                      {readNotifications ? '0 NUEVAS' : `${liveNotifications.length} ALERTAS`}
                    </span>
                    {!readNotifications && (
                      <button
                        onClick={() => setReadNotifications(true)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2a2c] hover:bg-[#353437] text-[#c6c5cf] hover:text-white transition-colors"
                      >
                        Marcar leídas
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 max-h-[60dvh] sm:max-h-80 overflow-y-auto">
                  {liveNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-lg border text-left text-[12px] transition-colors ${
                        n.type === 'urgent'
                          ? 'bg-[#93000a]/20 border-[#ffb4ab]/30 text-white'
                          : n.type === 'success'
                          ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300'
                          : 'bg-[#201f22] border-[#353437] text-[#e5e1e4]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-bold text-[12px]">
                        <span>{n.title}</span>
                        <span className="text-[10px] font-mono-code text-[#71717a] shrink-0">{n.time}</span>
                      </div>
                      <div className="text-[11px] text-[#a1a1aa] mt-0.5">{n.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-[#353437] hidden sm:block"></div>

          {/* Staff Profile & Session Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setNavOpen(false);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 pl-0.5 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="text-right hidden 2xl:block">
                <div className="text-[12px] text-[#e5e1e4] leading-tight font-semibold">
                  {currentUser?.name || currentUser?.username || 'Personal de Turno'}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono-code flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{currentUser?.roleTitle || (isAdmin ? 'ADMIN GENERAL' : 'En Turno')}</span>
                </div>
              </div>
              <div className="relative w-8 h-8 rounded-full bg-[#ffb59c] flex items-center justify-center overflow-hidden border border-[#ff5708] shrink-0 shadow-sm">
                <DishImage
                  src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=100&auto=format&fit=crop&q=80"
                  alt="Staff"
                  sizes="32px"
                  className="object-cover"
                />
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute top-full mt-2 right-0 w-60 max-w-[calc(100vw-1.5rem)] bg-[#1c1b1d] border border-[#353437] rounded-xl shadow-2xl p-1.5 z-50 animate-fadeIn">
                <div className="px-2.5 py-2 border-b border-[#353437]/60 mb-1">
                  <div className="text-[12px] font-bold text-[#e5e1e4]">{currentUser?.name || 'Usuario Activo'}</div>
                  <div className="text-[10px] font-mono-code text-[#ffb59c]">
                    {(currentUser?.roleTitle || sessionRoleLabel)} • {currentUser?.terminal || 'TERM-01'}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono-code mt-0.5 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                    <span>Sesión Autenticada</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    lockTerminal();
                  }}
                  className="w-full text-left px-2.5 py-2 sm:py-1.5 rounded-lg text-[12px] flex items-center gap-2 text-[#e5e1e4] hover:bg-[#2a2a2c] hover:text-amber-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-500">lock</span>
                  <span>Bloquear Pantalla</span>
                </button>

                <a
                  href="/login"
                  className="w-full text-left px-2.5 py-2 sm:py-1.5 rounded-lg text-[12px] flex items-center gap-2 text-[#e5e1e4] hover:bg-[#2a2a2c] hover:text-[#ff5708] transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#ff5708]">badge</span>
                  <span>Cambiar Usuario / PIN</span>
                </a>

                <a
                  href="/menu"
                  target="_blank"
                  className="w-full text-left px-2.5 py-2 sm:py-1.5 rounded-lg text-[12px] flex items-center gap-2 text-[#c6c5cf] hover:bg-[#2a2a2c] hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#a1c9ff]">qr_code_scanner</span>
                  <span>Abrir Carta Digital NFC</span>
                </a>

                <div className="h-px bg-[#353437]/60 my-1"></div>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logoutUser();
                  }}
                  className="w-full text-left px-2.5 py-2 sm:py-1.5 rounded-lg text-[12px] flex items-center gap-2 text-[#ffb4ab] hover:bg-[#93000a]/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>Cerrar Sesión & Salir</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile / tablet screen menu panel */}
      {navOpen && (
        <>
          <div
            className="absolute left-0 right-0 top-full h-[100dvh] bg-black/60 xl:hidden"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 right-0 top-full xl:hidden bg-[#1c1b1d] border-b border-[#353437] shadow-2xl max-h-[calc(100dvh-4rem)] overflow-y-auto animate-fadeIn">
            <nav className="py-1" aria-label="Pantallas del sistema">
              {visibleNavTabs.map((tab) => (
                <Link
                  key={tab.id}
                  href={tab.href}
                  onClick={() => {
                    setNavOpen(false);
                    onSelectTab(tab.id);
                  }}
                  className={`w-full min-h-12 flex items-center justify-between gap-2 px-4 text-left font-sans text-[14px] font-medium transition-colors border-l-2 cursor-pointer active:bg-[#353437] ${
                    currentTab === tab.id
                      ? 'bg-[#2a2a2c] text-[#e5e1e4] font-semibold border-[#ff5708]'
                      : 'border-transparent text-[#bcbbc5] hover:text-[#e5e1e4] hover:bg-[#2a2a2c]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.id === 'cocina_kds' && activeOrdersCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono-code font-bold ${
                        urgentCount > 0 ? 'bg-[#93000a] text-white animate-pulse' : 'bg-[#ff5708]/30 text-[#ffb59c]'
                      }`}
                    >
                      {activeOrdersCount}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            {/* Branch selector */}
            <div className="sm:hidden border-t border-[#353437]/60 p-3">
              <div className="text-[11px] font-mono-code text-[#a1a1aa] px-1 pb-2 uppercase tracking-wider font-bold">
                Sedes & Ámbitos
              </div>
              <div className="flex flex-col gap-1">
                {bistros.map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setSelectedBistro(b);
                      setNavOpen(false);
                    }}
                    className={`w-full min-h-11 text-left px-3 rounded-lg text-[14px] flex items-center justify-between gap-2 hover:bg-[#2a2a2c] transition-colors ${
                      selectedBistro === b ? 'text-[#ff5708] font-bold bg-[#ff5708]/10' : 'text-[#e5e1e4]'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[18px] text-[#ff5708] shrink-0">storefront</span>
                      <span className="truncate">{b}</span>
                    </span>
                    {selectedBistro === b && (
                      <span className="material-symbols-outlined text-[18px] shrink-0">check</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
};