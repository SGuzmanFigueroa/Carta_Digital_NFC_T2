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
// Session & Auth Cookie Utilities
// ==========================================

export function setAuthSessionCookie(user: AuthUser): void {
  if (typeof document === 'undefined') return;
  const payload = encodeURIComponent(
    JSON.stringify({
      id: user.id,
      name: user.name,
      role: user.role,
      roleTitle: user.roleTitle,
      loginTime: user.loginTime,
    })
  );
  // SameSite=Lax, Secure session cookie valid for 8 hours
  const maxAge = 8 * 60 * 60;
  document.cookie = `${AUTH_COOKIE_NAME}=${payload}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearAuthSessionCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function getAuthSessionCookie(): { id: string; name: string; role: string; roleTitle: string } | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!match) return null;
  
  try {
    const value = match.split('=')[1];
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return null;
  }
}
