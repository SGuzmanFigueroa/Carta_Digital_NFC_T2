/**
 * GastroPulse OS - Translation & Regionalization Engine (i18n)
 * Supports dynamic switching between Spanish (es) and English (en).
 */

export type LanguageCode = 'es' | 'en';

export interface TranslationDictionary {
  // Navigation & Header
  orders_central: string;
  kitchen_kds: string;
  admin_panel: string;
  user_management: string;
  configuration: string;
  lock: string;
  secure_sync: string;
  encrypted: string;

  // General Header & Buttons
  sys_code: string;
  sys_title: string;
  sys_subtitle: string;
  sys_subtitle_end: string;
  reset_values: string;
  save_changes: string;

  // Sidebar Menu & Status
  nav_profile: string;
  nav_notifications: string;
  nav_theme: string;
  nav_region: string;
  nav_hardware: string;
  nav_qr_tables: string;
  qr_section_title: string;
  qr_section_desc: string;
  select_table: string;
  table_zone: string;
  table_url: string;
  copy_link: string;
  open_menu: string;
  download_qr: string;
  print_standee: string;
  all_tables_grid: string;
  scan_to_order: string;
  nfc_active: string;
  terminal_status: string;
  kds_latency: string;
  local_sync: string;
  printer_network: string;
  connected: string;

  // SEC_01: Profile & Operational Account
  profile_title: string;
  profile_desc: string;
  branch_name: string;
  shift_manager: string;
  notification_email: string;
  room_phone: string;
  change_logo: string;
  enterprise_license: string;
  active_terminals: string;

  // SEC_02: Notifications & Alerts
  notif_title: string;
  notif_desc: string;
  sound_alerts_title: string;
  sound_alerts_desc: string;
  critical_delay_title: string;
  critical_delay_desc: string;
  payment_alerts_title: string;
  payment_alerts_desc: string;
  low_stock_title: string;
  low_stock_desc: string;

  // SEC_03: Theme & Visual Ergonomics
  theme_title: string;
  theme_desc: string;
  screen_mode: string;
  theme_obsidian_title: string;
  theme_obsidian_desc: string;
  theme_light_title: string;
  theme_light_desc: string;
  theme_kds_title: string;
  theme_kds_desc: string;
  chromatic_accent: string;
  density_title: string;
  density_compact: string;
  density_compact_desc: string;
  density_touch: string;
  density_touch_desc: string;

  // SEC_04: Language & Regionalization
  region_title: string;
  region_desc: string;
  system_language: string;
  base_currency: string;
  timezone: string;
  time_format: string;
  format_24h: string;
  format_12h: string;

  // SEC_05: Printing Hardware & ESC/POS
  hardware_title: string;
  hardware_desc: string;
  thermal_printer: string;
  ip_address: string;
  port_socket: string;
  paper_width: string;
  auto_cut: string;
  acoustic_buzzer: string;
  print_test: string;
  printing: string;
  escpos_monitor: string;
  simulator: string;
  waiter: string;
  order_ticket: string;
  total_order: string;
  escpos_ok: string;

  // Modals & Feedback
  modal_logo_title: string;
  upload_pc: string;
  upload_specs: string;
  or_url: string;
  assign: string;
  restore_default_logo: string;
  toast_saved: string;
  toast_reset: string;
  toast_lang_changed: string;
}

export const DICTIONARY: Record<LanguageCode, TranslationDictionary> = {
  es: {
    orders_central: 'Central de Pedidos',
    kitchen_kds: 'Cocina KDS',
    admin_panel: 'Panel Admin',
    user_management: 'Gestión de Usuarios',
    configuration: 'Configuración',
    lock: 'Bloquear',
    secure_sync: 'SECURE SYNC',
    encrypted: 'ENCRYPTED',

    sys_code: 'SYS // CONFIG-SUITE • NODE.LIM-01 • FIRMWARE v4.8.2',
    sys_title: 'Configuración del Sistema',
    sys_subtitle: 'Parámetros operacionales para la sucursal',
    sys_subtitle_end: 'Cambios reflejados en tiempo real en KDS, tabletas de mozos y comandera térmica.',
    reset_values: 'Restablecer Valores',
    save_changes: 'Guardar Cambios',

    nav_profile: 'Perfil & Cuenta',
    nav_notifications: 'Notificaciones',
    nav_theme: 'Tema & Visual',
    nav_region: 'Idioma & Región',
    nav_hardware: 'Hardware ESC/POS',
    nav_qr_tables: 'QR Mesas & NFC',
    qr_section_title: 'Códigos QR para Mesas & NFC',
    qr_section_desc: 'Generación, descarga e impresión de códigos QR y chips NFC para la carta digital de cada mesa.',
    select_table: 'Seleccionar Mesa',
    table_zone: 'Zona de Sala',
    table_url: 'Enlace Directo de la Carta',
    copy_link: 'Copiar Enlace',
    open_menu: 'Abrir Carta',
    download_qr: 'Descargar QR (PNG)',
    print_standee: 'Imprimir Caballete de Mesa',
    all_tables_grid: 'Ver Todas las Mesas',
    scan_to_order: 'Escanea para ver la carta y pedir',
    nfc_active: 'Chip NFC NTAG213 Vinculado',
    terminal_status: 'Estado de Terminal',
    kds_latency: 'Latencia KDS',
    local_sync: 'Sincro Local',
    printer_network: 'Impresora Red',
    connected: 'Conectada',

    profile_title: 'Perfil & Cuenta Operativa',
    profile_desc: 'Identidad de sala y contacto oficial para auditorías tributarias y comandas.',
    branch_name: 'Nombre de la Sucursal',
    shift_manager: 'Administrador de Turno',
    notification_email: 'Correo de Notificaciones',
    room_phone: 'Teléfono de Contacto Sala',
    change_logo: 'Cambiar Logo',
    enterprise_license: 'Licencia GastroPulse Enterprise',
    active_terminals: 'Terminales Activas',

    notif_title: 'Preferencias de Notificaciones & Alertas',
    notif_desc: 'Ajusta los disparadores de audio y avisos visuales para el personal de servicio.',
    sound_alerts_title: 'Alertas sonoras de comandas nuevas',
    sound_alerts_desc: 'Campana acústica en KDS y estación de expedición al entrar comanda.',
    critical_delay_title: 'Mesa con demora crítica (+15 min)',
    critical_delay_desc: 'Destello rojo pulsante si un plato supera su tiempo límite de preparación.',
    payment_alerts_title: 'Avisos de pago solicitado por comensal',
    payment_alerts_desc: 'Notificación prioritaria al mozo cuando el cliente pide la cuenta vía QR.',
    low_stock_title: 'Alertas por bajo stock en cocina',
    low_stock_desc: 'Aviso al Maitre cuando un ingrediente clave o botella descienda de 3 raciones.',

    theme_title: 'Tema & Ergonomía Visual',
    theme_desc: 'Optimización lumínica según ambiente de trabajo y turno del personal.',
    screen_mode: 'Modo de Pantalla',
    theme_obsidian_title: 'Oscuro Obsidian',
    theme_obsidian_desc: 'Ideal para turnos de noche y barras con iluminación tenue.',
    theme_light_title: 'Claro Minimal',
    theme_light_desc: 'Ideal para terrazas con alta iluminación natural directa.',
    theme_kds_title: 'Alto Contraste KDS',
    theme_kds_desc: 'Líneas hiper-visibles a 3 metros de distancia en línea de fuego.',
    chromatic_accent: 'Acento Cromático Operativo',
    density_title: 'Densidad de Interfaz',
    density_compact: 'Compacta (Desktop)',
    density_compact_desc: 'Compacta maximiza datos por pantalla en estación de caja y barra.',
    density_touch: 'Táctil Ampliada',
    density_touch_desc: 'Táctil ampliada agranda botones para terminales táctiles en cocina y pase.',

    region_title: 'Idioma & Regionalización',
    region_desc: 'Ajustes fiscales, moneda contable y sincronización horaria de comandas.',
    system_language: 'Idioma del Sistema',
    base_currency: 'Moneda Base',
    timezone: 'Zona Horaria (NTP)',
    time_format: 'Formato Horario',
    format_24h: '24 HORAS',
    format_12h: '12H (AM/PM)',

    hardware_title: 'Hardware de Impresión & ESC/POS',
    hardware_desc: 'Conexión directa vía socket TCP a impresoras térmicas de cocina y caja central.',
    thermal_printer: 'Comandera Térmica de Red',
    ip_address: 'Dirección IP',
    port_socket: 'Puerto / Socket',
    paper_width: 'Ancho Papel',
    auto_cut: 'Corte automático',
    acoustic_buzzer: 'Buzzer acústico',
    print_test: 'Imprimir Ticket de Prueba',
    printing: 'Enviando...',
    escpos_monitor: 'MONITOR ESC/POS',
    simulator: 'SIMULADOR',
    waiter: 'MOZO',
    order_ticket: 'COMANDA',
    total_order: 'TOTAL COMANDA',
    escpos_ok: '-- PROTOCOLO ESC/POS OK --',

    modal_logo_title: 'Actualizar Logo de la Sucursal',
    upload_pc: 'Subir imagen desde el equipo',
    upload_specs: 'PNG, JPG, SVG o WebP (Máx. 5MB)',
    or_url: 'O ingresar enlace directo (URL de imagen)',
    assign: 'Asignar',
    restore_default_logo: 'Restaurar Logo Predeterminado (/logo.png)',
    toast_saved: 'Configuración guardada con éxito',
    toast_reset: 'Valores restablecidos a predeterminados',
    toast_lang_changed: 'Idioma cambiado a Español (Perú)'
  },
  en: {
    orders_central: 'Orders Central',
    kitchen_kds: 'Kitchen KDS',
    admin_panel: 'Admin Panel',
    user_management: 'User Management',
    configuration: 'Configuration',
    lock: 'Lock Terminal',
    secure_sync: 'SECURE SYNC',
    encrypted: 'ENCRYPTED',

    sys_code: 'SYS // CONFIG-SUITE • NODE.LIM-01 • FIRMWARE v4.8.2',
    sys_title: 'System Configuration',
    sys_subtitle: 'Operational parameters for branch',
    sys_subtitle_end: 'Changes reflected in real-time across KDS, waiter tablets and thermal printer.',
    reset_values: 'Reset Values',
    save_changes: 'Save Changes',

    nav_profile: 'Profile & Account',
    nav_notifications: 'Notifications',
    nav_theme: 'Theme & Visual',
    nav_region: 'Language & Region',
    nav_hardware: 'Hardware ESC/POS',
    nav_qr_tables: 'Table QRs & NFC',
    qr_section_title: 'Table QR Codes & NFC',
    qr_section_desc: 'Generate, download, and print table QR codes and NFC chips linked to each table digital menu.',
    select_table: 'Select Table',
    table_zone: 'Dining Zone',
    table_url: 'Direct Digital Menu URL',
    copy_link: 'Copy Link',
    open_menu: 'Open Menu',
    download_qr: 'Download QR (PNG)',
    print_standee: 'Print Table Standee',
    all_tables_grid: 'View All Tables',
    scan_to_order: 'Scan to view menu and order',
    nfc_active: 'NTAG213 NFC Chip Linked',
    terminal_status: 'Terminal Status',
    kds_latency: 'KDS Latency',
    local_sync: 'Local Sync',
    printer_network: 'Network Printer',
    connected: 'Connected',

    profile_title: 'Profile & Operating Account',
    profile_desc: 'Dining room identity and official contact for tax audits and orders.',
    branch_name: 'Branch Name',
    shift_manager: 'Shift Manager',
    notification_email: 'Notification Email',
    room_phone: 'Room Contact Phone',
    change_logo: 'Change Logo',
    enterprise_license: 'GastroPulse Enterprise License',
    active_terminals: 'Active Terminals',

    notif_title: 'Notification & Alert Preferences',
    notif_desc: 'Adjust audio triggers and visual alerts for service staff.',
    sound_alerts_title: 'Sound alerts for new orders',
    sound_alerts_desc: 'Acoustic chime in KDS and expeditor station when order arrives.',
    critical_delay_title: 'Table with critical delay (+15 min)',
    critical_delay_desc: 'Pulsating red glow if a dish exceeds its target prep time.',
    payment_alerts_title: 'Guest payment request notices',
    payment_alerts_desc: 'Priority notification to waiter when guest requests check via QR.',
    low_stock_title: 'Kitchen low stock alerts',
    low_stock_desc: 'Alert to head waiter when a key ingredient or bottle drops below 3 servings.',

    theme_title: 'Theme & Visual Ergonomics',
    theme_desc: 'Light optimization according to work environment and staff shift.',
    screen_mode: 'Screen Mode',
    theme_obsidian_title: 'Obsidian Dark',
    theme_obsidian_desc: 'Ideal for night shifts and low ambient light bars.',
    theme_light_title: 'Minimal Light',
    theme_light_desc: 'Ideal for terraces with direct high natural lighting.',
    theme_kds_title: 'KDS High Contrast',
    theme_kds_desc: 'Hyper-visible outlines from 3 meters in the kitchen line of fire.',
    chromatic_accent: 'Operating Chromatic Accent',
    density_title: 'Interface Density',
    density_compact: 'Compact (Desktop)',
    density_compact_desc: 'Compact maximizes on-screen data for cashier and bar stations.',
    density_touch: 'Expanded Touch',
    density_touch_desc: 'Expanded touch enlarges tap targets for kitchen and pass touchscreens.',

    region_title: 'Language & Regionalization',
    region_desc: 'Fiscal settings, accounting currency and order clock synchronization.',
    system_language: 'System Language',
    base_currency: 'Base Currency',
    timezone: 'Timezone (NTP)',
    time_format: 'Time Format',
    format_24h: '24 HOURS',
    format_12h: '12H (AM/PM)',

    hardware_title: 'Printing Hardware & ESC/POS',
    hardware_desc: 'Direct connection via TCP socket to kitchen and central cash register thermal printers.',
    thermal_printer: 'Network Thermal Printer',
    ip_address: 'IP Address',
    port_socket: 'Port / Socket',
    paper_width: 'Paper Width',
    auto_cut: 'Auto-cut',
    acoustic_buzzer: 'Acoustic buzzer',
    print_test: 'Print Test Ticket',
    printing: 'Sending...',
    escpos_monitor: 'ESC/POS MONITOR',
    simulator: 'SIMULATOR',
    waiter: 'WAITER',
    order_ticket: 'ORDER TICKET',
    total_order: 'TOTAL ORDER',
    escpos_ok: '-- ESC/POS PROTOCOL OK --',

    modal_logo_title: 'Update Branch Logo',
    upload_pc: 'Upload image from computer',
    upload_specs: 'PNG, JPG, SVG or WebP (Max. 5MB)',
    or_url: 'Or enter direct URL (Image link)',
    assign: 'Assign',
    restore_default_logo: 'Restore Default Logo (/logo.png)',
    toast_saved: 'Configuration saved successfully',
    toast_reset: 'Values restored to defaults',
    toast_lang_changed: 'Language changed to English (US)'
  }
};

export function getLanguageCode(langString: string | undefined): LanguageCode {
  if (!langString) return 'es';
  const lower = langString.toLowerCase();
  if (lower.includes('en') || lower.includes('english')) return 'en';
  return 'es';
}

export function getTranslations(langString: string | undefined): TranslationDictionary {
  const code = getLanguageCode(langString);
  return DICTIONARY[code];
}
