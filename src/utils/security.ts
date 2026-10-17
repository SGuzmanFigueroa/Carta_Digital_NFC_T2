import { MenuItem, AuthUser } from '../types';

// ==========================================
// GastroPulse Security & Defense Utilities
// ==========================================

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'PIN_LOCKOUT'
  | 'PRICE_TAMPERING_DETECTED'
  | 'CORTE_Z_EXECUTED'
  | 'TABLE_SETTLED'
  | 'TABLE_PRIORITIZED'
  | 'SESSION_LOCKED'
  | 'SESSION_UNLOCKED'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  isoDate: string;
  eventType: SecurityEventType;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  user?: string;
  role?: string;
  details: string;
  metadata?: Record<string, any>;
}

const STORAGE_KEY_AUDIT = 'gastropulse_security_audit_v1';
const AUTH_COOKIE_NAME = 'gastropulse_session';

/**
 * Strips script tags, malicious HTML, and escapes dangerous characters
 * against Stored XSS and injection.
 */
export function sanitizeText(input: unknown, maxLen = 160): string {
  if (typeof input !== 'string') return '';
  
  let cleaned = input.trim();
  
  // Remove dangerous HTML tags & scripts
  cleaned = cleaned.replace(/<\/?(script|iframe|object|embed|svg|style|link|meta|base)[^>]*>/gi, '');
  
  // Remove dangerous event attributes (onerror, onload, onclick, etc.)
  cleaned = cleaned.replace(/on\w+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '');
  
  // Remove javascript: and data: URIs
  cleaned = cleaned.replace(/(javascript|vbscript|data):/gi, '');
  
  // Escape remaining angle brackets
  cleaned = cleaned.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Truncate to maximum length
  if (cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen);
  }
  
  return cleaned;
}

/**
 * Validates and normalizes table strings (e.g. "Mesa 04 (Terraza)" => "MESA 04")
 */
export function validateTableString(tableStr: unknown): string {
  if (typeof tableStr !== 'string') return 'MESA 01';
  
  const sanitized = sanitizeText(tableStr, 40).toUpperCase();
  const match = sanitized.match(/MESA\s*(\d{1,2})/i);
  
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    const padded = num.toString().padStart(2, '0');
    if (sanitized.includes('TERRAZA')) return `MESA ${padded} (Terraza)`;
    if (sanitized.includes('BARRA')) return `MESA ${padded} (Barra)`;
    return `MESA ${padded}`;
  }
  
  return 'MESA 01';
}

/**
 * Sanitizes cooking notes entered by the diner or waiter.
 */
export function sanitizeNotes(notes?: unknown): string {
  if (!notes || typeof notes !== 'string') return '';
  return sanitizeText(notes, 120);
}

/**
 * Anti-Tampering: Verifies client-sent dish prices against the canonical menu catalog.
 * If the client manipulated the price, the canonical server price is enforced and logged.
 */
export function verifyAndSanitizeDishPrice(
  dishId: string,
  clientPrice: number,
  catalog: MenuItem[]
): { price: number; wasTampered: boolean } {
  const canonical = catalog.find((m) => m.id === dishId);
  
  if (!canonical) {
    // If not found in catalog, ensure it's at least a valid positive number
    const safePrice = Math.max(0, typeof clientPrice === 'number' && !isNaN(clientPrice) ? clientPrice : 15);
    return { price: safePrice, wasTampered: false };
  }
  
  // If price differs from canonical by more than 0.05 PEN
  if (Math.abs(clientPrice - canonical.price) > 0.05) {
    AuditLogger.log({
      eventType: 'PRICE_TAMPERING_DETECTED',
      severity: 'WARN',
      details: `Intento de alteración de precio detectado para ${canonical.name}. Cliente envió: S/ ${clientPrice}, Precio oficial forzado: S/ ${canonical.price}`,
      metadata: { dishId, clientPrice, canonicalPrice: canonical.price },
    });
    
    return { price: canonical.price, wasTampered: true };
  }
  
  return { price: canonical.price, wasTampered: false };
}

// ==========================================
// Audit Logger (Security & Operational Trail)
// ==========================================

export class AuditLogger {
  static getLogs(): AuditLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUDIT);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'isoDate'>): AuditLogEntry {
    const now = new Date();
    const newEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now.toLocaleTimeString('es-PE', { hour12: false }),
      isoDate: now.toISOString(),
      ...entry,
    };

    if (typeof window !== 'undefined') {
      try {
        const existing = this.getLogs();
        // Keep last 150 entries in rolling ring buffer
        const updated = [newEntry, ...existing].slice(0, 150);
        localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(updated));
      } catch (err) {
        console.warn('Audit log write error:', err);
      }
    }

    return newEntry;
  }

  static clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_AUDIT);
    }
  }
}

// ==========================================
// Session, Role Resolution & Live Sync Utilities
// ==========================================

/**
 * Roles oficiales del sistema GastroPulse.
 * Un rol oficial NUNCA se reinterpreta mediante heurísticas de texto libre.
 */
export const OFFICIAL_ROLES = ['admin', 'kitchen', 'floor', 'bar', 'runner'] as const;
export type OfficialRole = (typeof OFFICIAL_ROLES)[number];

/** Clave de la sesión persistida (rememberMe) compartida con el contexto global. */
export const STORAGE_KEY_AUTH_USER = 'gastropulse_auth_user';

/**
 * Evento global emitido cuando cambia la sesión (login, logout, cambio de usuario
 * o sincronización entre pestañas del mismo terminal). Permite que la UI reaccione
 * en vivo al rol activo sin depender de una recarga completa de la aplicación.
 */
export const AUTH_SESSION_CHANGE_EVENT = 'gastropulse:auth-session-changed';

/**
 * Subconjunto de la sesión persistido en la cookie. Nunca incluye el PIN,
 * que permanece únicamente en memoria durante la sesión activa.
 */
export type AuthSessionPayload = Partial<Omit<AuthUser, 'pin' | 'email'>>;

/** Alias legados o provenientes de base de datos que otorgan permisos de administración. */
const ADMIN_ROLE_ALIASES: ReadonlySet<string> = new Set([
  'admin', 'administrador', 'administrator', 'superadmin', 'super_admin',
  'admin_general', 'gerente', 'gerente_general', 'manager', 'general_manager',
  'tenant_admin', 'company_admin', 'owner', 'propietario', 'dueno', 'dueno_general'
]);

/** Títulos ejecutivos inequívocos (se usan SÓLO cuando no existe rol persistido). */
const EXECUTIVE_TITLE_PATTERN = /^(admin|administrador|gerente|manager|owner|propietario|dueno|socio)/;

/**
 * Normaliza cualquier rol a minúsculas con separador único "_"
 * ("Admin General", "ADMIN-GENERAL", " admin " => "admin_general" / "admin").
 */
export function normalizeRole(role: unknown): string {
  if (typeof role !== 'string') return '';
  return role.trim().toLowerCase().replace(/[\s./-]+/g, '_');
}

/**
 * Resolución robusta de permisos de administrador:
 * 1. Coincidencia exacta con un alias de administración => true.
 * 2. Coincidencia con un rol oficial no-admin (kitchen/floor/bar/runner) => false,
 *    de modo que ningún cargo ("Gerente de partida", "Admin de turno") escale privilegios.
 * 3. Rol personalizado desconocido => false (sin privilegios implícitos).
 * 4. Sin rol persistido => sólo se acepta un título ejecutivo inequívoco.
 */
export function isAdminRole(role: unknown, roleTitle?: unknown): boolean {
  const normalizedRole = normalizeRole(role);

  if (ADMIN_ROLE_ALIASES.has(normalizedRole)) return true;
  if ((OFFICIAL_ROLES as readonly string[]).includes(normalizedRole)) return false;
  if (normalizedRole) return false;

  return EXECUTIVE_TITLE_PATTERN.test(normalizeRole(roleTitle));
}

/**
 * Construye un AuthUser íntegro a partir de cualquier fuente parcial
 * (localStorage, cookie de sesión o evento de sesión) normalizando siempre el rol.
 * Devuelve null cuando no hay rol: no existe sesión válida.
 */
export function buildAuthUser(source: Partial<AuthUser> | null | undefined): AuthUser | null {
  if (!source) return null;

  const role = normalizeRole(source.role);
  if (!role) return null;

  const name = (source.name || '').toString().trim() || 'Personal de Turno';

  return {
    id: (source.id || '').toString().trim() || `session-${role}`,
    name,
    username: (source.username || '').toString().trim() || name.toLowerCase().replace(/\s+/g, '.'),
    email: (source.email || '').toString().trim(),
    role: role as AuthUser['role'],
    roleTitle: (source.roleTitle || '').toString().trim() || 'Personal GastroPulse',
    pin: (source.pin || '').toString().trim(),
    assignment: (source.assignment || '').toString().trim() || 'General',
    terminal: (source.terminal || '').toString().trim() || 'TPV-01 (Principal)',
    loginTime: (source.loginTime || '').toString().trim()
  };
}

/** Emite el cambio de sesión para los consumidores en vivo (React) del mismo documento. */
function emitAuthSessionChange(user: AuthUser | null): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AuthUser | null>(AUTH_SESSION_CHANGE_EVENT, { detail: user }));
}

/**
 * Fuente única de verdad para restaurar la sesión activa del terminal:
 * 1. Cookie de sesión: refleja el último inicio de sesión (la valida el proxy de
 *    rutas protegidas) y descarta cualquier recuerdo obsoleto de otro usuario.
 * 2. Sesión recordada en localStorage (opción "Recordarme"), siempre que pertenezca al
 *    mismo usuario que la cookie o que la cookie ya no exista.
 */
export function readAuthSession(): AuthUser | null {
  if (typeof window === 'undefined') return null;

  // La cookie representa la sesión más reciente del terminal (se reescribe en cada
  // inicio de sesión), por lo que se lee primero para poder detectar sesiones obsoletas.
  const cookieSession = getAuthSessionCookie();
  const cookieUser = cookieSession ? buildAuthUser(cookieSession) : null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_AUTH_USER);
    if (raw) {
      const remembered = buildAuthUser(JSON.parse(raw) as Partial<AuthUser>);
      // Se prefiere la sesión recordada sólo si pertenece al mismo usuario que la cookie.
      // Así no se resucita el rol de un usuario anterior cuando el último inicio de
      // sesión del terminal se realizó sin la opción "Recordarme".
      if (remembered && (!cookieUser || remembered.id === cookieUser.id)) {
        return remembered;
      }
    }
  } catch {
    // Sesión persistida corrupta o inaccesible: se continúa con la cookie
  }

  return cookieUser;
}

// ==========================================
// Auth Cookie Persistence
// ==========================================

export function setAuthSessionCookie(user: AuthUser): void {
  if (typeof document === 'undefined') return;
  const session = buildAuthUser(user);
  if (!session) return;

  // El rol se canonicaliza antes de persistirse: el proxy de rutas y la interfaz
  // comparan siempre el mismo valor normalizado ("Admin" => "admin").
  const payload = encodeURIComponent(
    JSON.stringify({
      id: session.id,
      name: session.name,
      username: session.username,
      role: session.role,
      roleTitle: session.roleTitle,
      assignment: session.assignment,
      terminal: session.terminal,
      loginTime: session.loginTime,
    } as AuthSessionPayload)
  );
  // SameSite=Lax, Secure session cookie valid for 8 hours
  const maxAge = 8 * 60 * 60;
  document.cookie = `${AUTH_COOKIE_NAME}=${payload}; path=/; max-age=${maxAge}; SameSite=Lax`;

  // Notifica en vivo a los consumidores de sesión (React) para que apliquen el nuevo
  // rol inmediatamente, sin esperar a una recarga de página.
  emitAuthSessionChange(session);
}

export function clearAuthSessionCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;

  try {
    window.localStorage.removeItem(STORAGE_KEY_AUTH_USER);
  } catch {
    // localStorage inaccesible (modo privado / permisos): la cookie ya quedó limpia
  }

  // Propaga el cierre de sesión a la UI en vivo (Header / contexto global)
  emitAuthSessionChange(null);
}

export function getAuthSessionCookie(): AuthSessionPayload | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!match) return null;
  
  try {
    // slice en lugar de split: preserva payloads URL-encoded que contienen "="
    const value = match.slice(match.indexOf('=') + 1);
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return null;
  }
}
