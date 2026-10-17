import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';
import { WaiterCall, WaiterCallReason, WaiterCallStatus } from '@/types';
import { getTableToken } from '@/utils/tableAccess';

/**
 * GastroPulse OS · CD-28 · Llamar al Mozo / Asistencia en Mesa
 *
 * Capa de acceso a `public.waiter_calls`. Convive con la lógica heredada:
 * `callWaiterForTableInDb()` (que marca la mesa como 'demora') sigue ejecutándose
 * intacta; este servicio AÑADE el registro persistente y auditable del llamado.
 */

/**
 * `database.types.ts` es un archivo GENERADO por Supabase y aún no conoce la tabla
 * `waiter_calls`. En vez de ensuciar el acceso con `any`, se extiende el tipo
 * `Database` SOLO en este módulo: el cliente queda 100% tipado y, cuando se
 * regenere `database.types.ts`, basta con borrar este bloque.
 *
 * Nota técnica: `Row`/`Insert`/`Update` se declaran como `type` (no `interface`)
 * porque `postgrest-js` exige que cada tabla sea asignable a `GenericTable`,
 * cuyos miembros son `Record<string, unknown>` (los alias de objeto sí reciben
 * index signature implícita; las interfaces no).
 */
type WaiterCallRow = {
  id: string;
  table_number: string;
  reason: WaiterCallReason;
  status: WaiterCallStatus;
  created_at: string;
  resolved_at: string | null;
};

type WaiterCallInsert = {
  id?: string;
  table_number: string;
  reason: WaiterCallReason;
  status?: WaiterCallStatus;
  created_at?: string;
  resolved_at?: string | null;
};

type WaiterCallUpdate = {
  table_number?: string;
  reason?: WaiterCallReason;
  status?: WaiterCallStatus;
  resolved_at?: string | null;
};

type DatabaseWithWaiterCalls = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: Database['public']['Tables'] & {
      waiter_calls: {
        Row: WaiterCallRow;
        Insert: WaiterCallInsert;
        Update: WaiterCallUpdate;
        Relationships: [];
      };
    };
  };
};

/** Cliente tipado con la tabla de CD-28 incluida. */
const waiterCallsDb = supabase as unknown as SupabaseClient<DatabaseWithWaiterCalls>;

/**
 * Opciones EXACTAS del Bottom Sheet del comensal (motivo + icono limpio).
 * No se agregan motivos fuera del ticket.
 */
export const WAITER_CALL_OPTIONS: ReadonlyArray<{ reason: WaiterCallReason; icon: string }> = [
  { reason: 'Traer cubiertos/servilletas', icon: 'restaurant' },
  { reason: 'Consulta al mozo', icon: 'help' },
  { reason: 'Llamar mozo general', icon: 'room_service' }
];

/** Único estado abierto: es el que alimenta KDS y Salón. */
const OPEN_STATUS: WaiterCallStatus = 'open';

/**
 * Convierte cualquier texto de motivo al conjunto EXACTO del ticket.
 * Así, las llamadas heredadas y genéricas (p. ej. "Solicitud de atención general"
 * del geofence) se registran como "Llamar mozo general" sin inventar motivos nuevos.
 */
export function normalizeWaiterCallReason(reason?: string | null): WaiterCallReason {
  const match = WAITER_CALL_OPTIONS.find((option) => option.reason === reason);
  return match ? match.reason : 'Llamar mozo general';
}

/**
 * Normaliza el identificador de mesa al formato canónico de `restaurant_tables.number`
 * ("Mesa 04"). Es clave para que el índice único anti-spam agrupe SIEMPRE la misma mesa,
 * sin importar si llegó como "MESA 04", "mesa 4" o "04".
 */
export function normalizeTableLabel(tableNumber?: string | null): string {
  const raw = (tableNumber || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (digits) return `Mesa ${digits.padStart(2, '0')}`;
  return raw || 'Mesa 00';
}

/** Devuelve el número de mesa ("04") a partir de cualquier etiqueta. */
export function extractTableDigits(tableNumber?: string | null): string {
  return (tableNumber || '').replace(/\D/g, '');
}

/**
 * FIX CD-28 (bug de caché en realtime) · Estrecha el `payload.new` que llega por
 * `postgres_changes` a un `WaiterCall` válido, SIN usar `any` y SIN tocar la red.
 *
 * Con esto el estado de React se hidrata directamente desde el webhook, por lo que
 * ya no se llama a `fetchWaiterCallsFromDb()` dentro de la suscripción y ningún
 * caché de `fetch` (Next.js / navegador) puede servir datos viejos y congelar la UI
 * después del primer llamado.
 *
 * Devuelve `null` si el payload no tiene la forma esperada (defensivo: nunca rompe
 * la app por un evento inesperado del canal).
 */
export function parseWaiterCallRow(raw: unknown): WaiterCall | null {
  if (!raw || typeof raw !== 'object') return null;

  const candidate = raw as Record<string, unknown>;
  const { id, table_number: tableNumber, reason, status, created_at: createdAt, resolved_at: resolvedAt } = candidate;

  if (typeof id !== 'string' || typeof tableNumber !== 'string' || typeof createdAt !== 'string') {
    return null;
  }

  return {
    id,
    table_number: normalizeTableLabel(tableNumber),
    reason: normalizeWaiterCallReason(typeof reason === 'string' ? reason : null),
    status: status === 'attended' ? 'attended' : 'open',
    created_at: createdAt,
    resolved_at: typeof resolvedAt === 'string' ? resolvedAt : null
  };
}

/**
 * Lee los llamados ABIERTOS (KDS / Salón). Nunca lanza: si la tabla aún no fue
 * creada en Supabase devuelve [] y el sistema sigue operando con la lógica heredada.
 */
export async function fetchWaiterCallsFromDb(): Promise<WaiterCall[]> {
  try {
    const { data, error } = await waiterCallsDb
      .from('waiter_calls')
      .select('*')
      .eq('status', OPEN_STATUS)
      .order('created_at', { ascending: true })
      // FIX (bug de caché) · postgrest-js no envía ninguna opción `cache` al fetch, así
      // que el navegador puede reutilizar una respuesta GET vieja. Este header fuerza
      // que la carga inicial/durabilidad (reabrir el KDS) siempre lea datos frescos.
      .setHeader('Cache-Control', 'no-store');

    if (error || !data) {
      console.warn('waiter_calls no disponible en Supabase:', error?.message);
      return [];
    }

    return data;
  } catch (err) {
    console.warn('Error fetching waiter calls:', err);
    return [];
  }
}

/**
 * Registra un llamado de mesa. Idempotente frente al índice anti-spam:
 * si la mesa ya tenía un llamado abierto (SQLSTATE 23505) se considera éxito,
 * porque el objetivo de negocio (que el personal lo vea) ya está cumplido.
 */
export async function createWaiterCall(
  tableNumber: string,
  reason: WaiterCallReason
): Promise<boolean> {
  try {
    // RPC: el comensal debe traer el código del QR de su mesa (el personal con
    // sesión no). Un llamado ya abierto para la mesa cuenta como éxito.
    const { error } = await supabase.rpc('create_waiter_call', {
      p_table: normalizeTableLabel(tableNumber),
      p_reason: reason,
      p_table_token: getTableToken(tableNumber)
    });

    if (error) {
      console.warn('Error registrando llamado de mozo:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Error registrando llamado de mozo:', err);
    return false;
  }
}

/** Marca un llamado como atendido (lo dispara el botón "Atendido" del KDS/Salón). */
export async function attendWaiterCallInDb(callId: string): Promise<boolean> {
  try {
    const { error } = await waiterCallsDb
      .from('waiter_calls')
      .update({ status: 'attended', resolved_at: new Date().toISOString() })
      .eq('id', callId);

    if (error) {
      console.warn('Error marcando llamado como atendido:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Error marcando llamado como atendido:', err);
    return false;
  }
}
