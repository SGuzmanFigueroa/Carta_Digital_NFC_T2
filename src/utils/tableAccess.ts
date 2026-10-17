/**
 * Acceso del comensal a SU mesa (Tarea 9).
 *
 * El QR de cada mesa lleva un código secreto: /menu?mesa=MESA%2004&t=<código>.
 * Se guarda junto con la mesa y se envía al servidor al pedir, pedir la cuenta
 * o llamar al mozo; sin él (o con el de otra mesa) el servidor lo rechaza.
 * Aquí también se guarda la última ubicación GPS, que el servidor compara con
 * la geocerca (Tarea 10).
 */
const STORAGE_KEY = 'gastropulse_table_access';
const POSITION_MAX_AGE_MS = 2 * 60 * 1000;

type TableAccess = { table: number; token: string };
type DinerPosition = { lat: number; lng: number; accuracy: number; at: number };

let lastPosition: DinerPosition | null = null;

const tableNumberOf = (table: string | null | undefined): number | null => {
  const digits = (table ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : null;
};

function read(): TableAccess | null {
  if (typeof window === 'undefined') return null;
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as TableAccess;
    } catch {}
  }
  return null;
}

/** Guarda el código del QR escaneado (si no hay código, no borra el de esa misma mesa). */
export function saveTableAccess(table: string, token: string | null | undefined): void {
  const number = tableNumberOf(table);
  if (number === null || typeof window === 'undefined') return;
  const cleanToken = (token ?? '').trim();
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(cleanToken)) {
    // QR antiguo o mesa elegida a mano: se conserva el código solo si es de esa mesa.
    if (read()?.table !== number) clearTableAccess();
    return;
  }
  const value = JSON.stringify({ table: number, token: cleanToken } satisfies TableAccess);
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.setItem(STORAGE_KEY, value);
    } catch {}
  }
}

export function clearTableAccess(): void {
  if (typeof window === 'undefined') return;
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.removeItem(STORAGE_KEY);
    } catch {}
  }
}

/** Código de la mesa indicada, o undefined si el comensal no escaneó su QR. */
export function getTableToken(table: string | null | undefined): string | undefined {
  const access = read();
  const number = tableNumberOf(table);
  return access && number !== null && access.table === number ? access.token : undefined;
}

export function rememberDinerPosition(coords: { latitude: number; longitude: number; accuracy: number }): void {
  lastPosition = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy, at: Date.now() };
}

/** Última ubicación del comensal si es reciente (menos de 2 minutos). */
export function getRecentDinerPosition(): Omit<DinerPosition, 'at'> | undefined {
  if (!lastPosition || Date.now() - lastPosition.at > POSITION_MAX_AGE_MS) return undefined;
  const { lat, lng, accuracy } = lastPosition;
  return { lat, lng, accuracy };
}
