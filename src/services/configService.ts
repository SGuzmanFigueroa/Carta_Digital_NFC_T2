import { RESTAURANT_ID, SYSTEM_CONFIG_STORAGE_KEY, SYSTEM_CONFIG_CHANGED_EVENT } from '@/config/restaurant';
import { supabase } from '@/lib/supabase';
import { SystemConfigState } from '@/types';
import { INITIAL_CONFIG } from '@/data/mockData';
import { createAuditLogInDb } from './authService';

const STORAGE_KEY = SYSTEM_CONFIG_STORAGE_KEY;

const THEME_MODES: readonly SystemConfigState['themeMode'][] = ['obsidian', 'midnight', 'titanium', 'light', 'kds-high-contrast'];
const DENSITIES: readonly SystemConfigState['density'][] = ['compact', 'touch'];
const TIME_FORMATS: readonly SystemConfigState['timeFormat'][] = ['24h', '12h'];
const PAPER_WIDTHS: readonly SystemConfigState['paperWidth'][] = ['80mm', '58mm'];

/** Valor de la BD (texto libre) solo si es una de las opciones que entiende la app. */
function oneOf<T extends string>(value: string | null, options: readonly T[]): T | undefined {
  return options.find((option) => option === value);
}

export async function fetchSystemConfigFromDb(): Promise<SystemConfigState> {
  let localConfig: SystemConfigState | null = null;
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        localConfig = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error reading localStorage config:', e);
    }
  }

  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .eq('id', RESTAURANT_ID)
      .maybeSingle();

    if (error || !data) {
      return localConfig || INITIAL_CONFIG;
    }

    const merged: SystemConfigState = {
      branchName: data.branch_name || localConfig?.branchName || INITIAL_CONFIG.branchName,
      branchRuc: data.branch_ruc || localConfig?.branchRuc || INITIAL_CONFIG.branchRuc,
      logoUrl: data.logo_url || localConfig?.logoUrl || "/logo.png",
      managerName: data.manager_name || localConfig?.managerName || INITIAL_CONFIG.managerName,
      email: data.email || localConfig?.email || INITIAL_CONFIG.email,
      phone: data.phone || localConfig?.phone || INITIAL_CONFIG.phone,
      soundAlerts: data.sound_alerts ?? (localConfig?.soundAlerts ?? INITIAL_CONFIG.soundAlerts),
      delayAlerts: data.delay_alerts ?? (localConfig?.delayAlerts ?? INITIAL_CONFIG.delayAlerts),
      paymentAlerts: data.payment_alerts ?? (localConfig?.paymentAlerts ?? INITIAL_CONFIG.paymentAlerts),
      lowStockAlerts: data.low_stock_alerts ?? (localConfig?.lowStockAlerts ?? INITIAL_CONFIG.lowStockAlerts),
      themeMode: oneOf(data.theme_mode, THEME_MODES) || localConfig?.themeMode || INITIAL_CONFIG.themeMode,
      colorAccent: data.color_accent || localConfig?.colorAccent || INITIAL_CONFIG.colorAccent,
      density: oneOf(data.density, DENSITIES) || localConfig?.density || INITIAL_CONFIG.density,
      language: data.language || localConfig?.language || INITIAL_CONFIG.language,
      currency: data.currency || localConfig?.currency || INITIAL_CONFIG.currency,
      timezone: data.timezone || localConfig?.timezone || INITIAL_CONFIG.timezone,
      timeFormat: oneOf(data.time_format, TIME_FORMATS) || localConfig?.timeFormat || INITIAL_CONFIG.timeFormat,
      printerIp: data.printer_ip || localConfig?.printerIp || INITIAL_CONFIG.printerIp,
      printerPort: data.printer_port || localConfig?.printerPort || INITIAL_CONFIG.printerPort,
      paperWidth: oneOf(data.paper_width, PAPER_WIDTHS) || localConfig?.paperWidth || INITIAL_CONFIG.paperWidth,
      autoCut: data.auto_cut ?? (localConfig?.autoCut ?? INITIAL_CONFIG.autoCut),
      acousticBuzzer: data.acoustic_buzzer ?? (localConfig?.acousticBuzzer ?? INITIAL_CONFIG.acousticBuzzer)
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }

    return merged;
  } catch (err) {
    console.error('Error fetching system config from Supabase:', err);
    return localConfig || INITIAL_CONFIG;
  }
}

export async function saveSystemConfigToDb(updated: SystemConfigState): Promise<boolean> {
  // 1. Immediately save to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving config to localStorage:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYSTEM_CONFIG_CHANGED_EVENT, { detail: updated }));
  }

  // 2. Persist to Supabase
  try {
    const { error } = await supabase
      .from('system_config')
      .upsert({
        id: RESTAURANT_ID,
        branch_name: updated.branchName,
        branch_ruc: updated.branchRuc,
        logo_url: updated.logoUrl || "/logo.png",
        manager_name: updated.managerName,
        email: updated.email,
        phone: updated.phone,
        sound_alerts: updated.soundAlerts,
        delay_alerts: updated.delayAlerts,
        payment_alerts: updated.paymentAlerts,
        low_stock_alerts: updated.lowStockAlerts,
        theme_mode: updated.themeMode,
        color_accent: updated.colorAccent,
        density: updated.density,
        language: updated.language,
        currency: updated.currency,
        timezone: updated.timezone,
        time_format: updated.timeFormat,
        printer_ip: updated.printerIp,
        printer_port: updated.printerPort,
        paper_width: updated.paperWidth,
        auto_cut: updated.autoCut,
        acoustic_buzzer: updated.acousticBuzzer,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating system_config in Supabase:', error);
      return false;
    }

    await createAuditLogInDb(
      'Configuración del Sistema Guardada',
      updated.branchName,
      `Parámetros operacionales actualizados (Sucursal: ${updated.branchName}, Impresora: ${updated.printerIp}:${updated.printerPort})`,
      'info'
    );

    return true;
  } catch (err) {
    console.error('Error in saveSystemConfigToDb:', err);
    return false;
  }
}
