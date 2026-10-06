// ==========================================
// GastroPulse OS - Unified Types Definition
// ==========================================

export type StationId = 'all' | 'fuego_grill' | 'frio_nikkei' | 'wok_saute' | 'pasteleria' | 'barra_mixologia';

export type OrderStatus = 'ingresada' | 'en_preparacion' | 'en_fuego' | 'lista_despachada' | 'archivada';

export type ItemStatus = 'pendiente' | 'en_montaje' | 'listo_plancha' | 'listo';

export type ScreenTab = 'cocina_kds' | 'central_pedidos' | 'panel_admin' | 'gestion_usuarios' | 'configuracion' | 'menu_qr';

export type ActiveScreen = 
  | 'central-pedidos' 
  | 'cocina-kds' 
  | 'panel-admin' 
  | 'menu-qr' 
  | 'gestion-usuarios' 
  | 'configuracion';

export interface TicketItem {
  id: string;
  name: string;
  quantity: number;
  station: StationId;
  stationBadge: string;
  stationBadgeColor?: string;
  status: ItemStatus;
  cookingNotes: string[];
  price: number;
  photoUrl: string;
  checked: boolean;
  allergens?: string[];
  prepTimeMinutes?: number;
}

export interface Ticket {
  id: string;
  orderNumber: number;
  table: string;
  zone: string;
  serviceType: string;
  elapsedSeconds: number;
  targetSeconds: number;
  isUrgent?: boolean;
  allergyAlert?: string;
  synchronousDepartureNote?: string;
  passTemp?: string;
  specialPrepNote?: string;
  serverOrRunner: string;
  serverRole?: 'CAMARERO' | 'RUNNER ASIGNADO' | 'BARTENDER' | 'PASE DIRECTO';
  totalAmount: number;
  status: OrderStatus;
  items: TicketItem[];
  timestamp: string;
  stationFilterTags: StationId[];
}

export interface Runner {
  id: string;
  name: string;
  runnerNumber: number;
  status: 'Libre en Pase' | 'En Mesa' | 'En Reparto' | 'En Descanso';
  currentTable?: string;
  location: string;
  avatarUrl: string;
  ordersHandledToday: number;
  avgDeliveryMinutes: number;
}

export interface StationLoad {
  id: StationId;
  name: string;
  code: string;
  loadPercentage: number;
  activeOrders: number;
  avgPrepMinutes: number;
  color: string;
}

// ==========================================
// Order / Menu / Floor Types (from pantallas2Carta)
// ==========================================

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  station?: string;
  allergen?: string;
}

export interface OrderTicket {
  id: string;
  table: string;
  pax: number;
  timeAgo: string;
  createdTime: string;
  origin: 'QR COMENSAL' | 'GARZÓN' | 'DELIVERY APP';
  waiter?: string;
  status: 'por-validar' | 'en-cocina' | 'pase-listo' | 'entregado';
  isCritical?: boolean;
  preparationPercent?: number;
  items: OrderItem[];
  subtotal: number;
  total: number;
  stationTarget?: string;
  paymentMethod?: string;
  accountRequested?: boolean;
  runnerAssigned?: string;
}

export interface TableStatus {
  id: string;
  number: string;
  pax: number;
  capacity: number;
  zone: 'salon' | 'terraza' | 'barra';
  status: 'comiendo' | 'demora' | 'cuenta' | 'qr' | 'disponible' | 'reserva';
  waiter?: string;
  amount?: number;
  timeActive?: string;
  dishesCount?: string;
  kdsDelayInfo?: string;
  reservationTime?: string;
  reservationName?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'fondos' | 'entradas' | 'postres' | 'bebidas';
  image: string;
  rating: number;
  reviewsCount: number;
  badge?: string;
  tag?: string;
  dietary?: string;
  pairing?: string;
  has3D?: boolean;
  prepTime?: string;
  popularityShare?: number;
  ordersCount?: number;
}

export interface StaffMember {
  id: string;
  name: string;
  initials?: string;
  role: 'admin' | 'kitchen' | 'floor' | 'bar' | 'runner' | string;
  roleTitle?: string;
  status: 'En Turno Activo' | 'Conectado (Móvil)' | 'En Cocina KDS' | 'Activo' | 'Pausado' | 'En servicio' | 'Descanso' | 'Turno tarde' | 'Fuera de turno' | string;
  station?: string;
  assignment?: string;
  permissions?: string;
  lastAccess?: string;
  ordersToday?: number;
  pin?: string;
  isPinRevealed?: boolean;
  username?: string;
  email?: string;
  password?: string;
  avatarUrl?: string;
  phone?: string;
  shiftHours?: string;
  specialty?: string;
  customPermissions?: Partial<Record<'panelAdmin' | 'kdsCocina' | 'edicionMenu' | 'cobroPos' | 'anulacionComandas', PermissionState>>;
}

export type PermissionState = 'allow' | 'read' | 'deny';

export interface RolePermissionItem {
  id: string;
  roleId: string;
  roleTitle: string;
  roleDescription: string;
  panelAdmin: PermissionState;
  kdsCocina: PermissionState;
  edicionMenu: PermissionState;
  cobroPos: PermissionState;
  anulacionComandas: PermissionState;
}

export interface StaffAuditLogItem {
  id: string;
  action: string;
  performedBy: string;
  target?: string;
  details?: string;
  level: 'info' | 'warning' | 'critical';
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'kitchen' | 'floor' | 'bar' | 'runner';
  roleTitle: string;
  pin: string;
  assignment: string;
  terminal: string;
  loginTime: string;
}

export interface SystemConfigState {
  branchName: string;
  branchRuc: string;
  logoUrl?: string;
  managerName: string;
  email: string;
  phone: string;
  soundAlerts: boolean;
  delayAlerts: boolean;
  paymentAlerts: boolean;
  lowStockAlerts: boolean;
  themeMode: 'obsidian' | 'midnight' | 'titanium' | 'light' | 'kds-high-contrast';
  colorAccent: 'amber' | 'emerald' | 'cyan';
  density: 'compact' | 'touch';
  language: string;
  currency: string;
  timezone: string;
  timeFormat: '24h' | '12h';
  printerIp: string;
  printerPort: string;
  paperWidth: '80mm' | '58mm';
  autoCut: boolean;
  acousticBuzzer: boolean;
}

// ==========================================
// CD-17 · Ofertas Flash (Panel de Administración)
// ==========================================

/** Mecánica promocional elegible desde las 4 pestañas del formulario. */
export type PromoMechanic = 'discount' | 'two_for_one' | 'second_unit' | 'combo';

/** Tipo de valor del descuento para la mecánica de descuento directo. */
export type PromoDiscountType = 'percent' | 'fixed';

/**
 * Borrador centralizado del formulario "Gestión de Ofertas Flash".
 * Agrupa TODOS los valores de los inputs en un único objeto de estado,
 * listo para persistirse en Supabase en la siguiente fase.
 */
export interface PromoOfferDraft {
  /** Pestaña mecánica activa: Descuento %/$ · 2x1 · 2da Unidad · Combo. */
  mechanic: PromoMechanic;
  /** Plato principal de la oferta (id real de la carta). */
  mainDishId: string;
  /** Plato / bebida complementaria: solo en 2da Unidad y Combo / Maridaje
   *  (el 2x1 asume que la segunda unidad es idéntica a la primera). */
  complementaryDishId: string;
  discountType: PromoDiscountType;
  /** Valor del descuento como texto para permitir edición libre en el input. */
  discountValue: string;
  /** Límite de porciones o unidades promocionadas ('' = sin límite). */
  portionLimit: string;
  /** Prioridad en la Carta QR: '1' (máxima) a '5' (mínima). */
  priority: string;
  /** false = Oferta Flash (fecha puntual) · true = Oferta Recurrente (días fijos). */
  isRecurring: boolean;
  /** Vigencia exacta (solo modo Flash) en formato `YYYY-MM-DDTHH:mm`. */
  startAt: string;
  endAt: string;
  /** Días aplicables (solo modo Recurrente). 0 = Domingo … 6 = Sábado (ISO). */
  weekdays: number[];
  /** Ventana horaria recurrente (solo modo Recurrente) en formato `HH:mm`. */
  scheduleFrom: string;
  scheduleTo: string;
  /** Publicación inmediata en la Carta QR + Pop-up de Mesa. */
  syncToPosImmediately: boolean;
}

/** Oferta activa tal como se muestra en las tarjetas del panel. */
export interface ActivePromoOffer {
  id: string;
  mechanic: PromoMechanic;
  /** Id real del plato principal en la carta (permite editar la oferta). */
  mainDishId: string;
  /** Id real del complemento (vacío en "Descuento %/$" y en el 2x1). */
  complementaryDishId: string;
  badge: string;
  kicker: string;
  timingLabel: string;
  title: string;
  subtitle: string;
  image: string;
  originalPrice: number;
  promoPrice: number;
  /** % pactado de la mecánica (se usa para editar la oferta y pintar badges). */
  discountPercent: number;
  note: string;
  isActive: boolean;
}
