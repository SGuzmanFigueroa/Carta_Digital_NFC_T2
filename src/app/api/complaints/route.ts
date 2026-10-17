import { createClient } from '@supabase/supabase-js';
import { validateComplaint, type ComplaintReceipt } from '@/features/complaints/validation';

/**
 * Endpoint del Libro de Reclamaciones.
 *
 * GET  : entrega la configuracion publica del libro y su disponibilidad.
 * POST : registra una hoja validada en el servidor mediante la RPC
 *        submit_complaint, que asigna el correlativo de forma atomica.
 * PUT  : permite a un administrador autorizado configurar los datos del
 *        proveedor que se imprimen en la hoja.
 *
 * Seguridad: este endpoint nunca registra ni devuelve detalles internos de la
 * base de datos que puedan contener datos personales. El cifrado AES-GCM de
 * los borradores ocurre en el cliente, antes de tocar IndexedDB, por lo que
 * este archivo solo maneja texto ya validado y no persiste claves.
 */
export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Constantes compartidas
// ---------------------------------------------------------------------------

const MAX_BODY_BYTES = 32768;
const MAX_TOKEN_LENGTH = 8000;
const DEFAULT_BOOK_ID = 'primary';

// UUID v4: identifica de forma idempotente el envio desde el cliente.
const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RUC_PATTERN = /^\d{11}$/;

// ---------------------------------------------------------------------------
// Tipos de entrada
// ---------------------------------------------------------------------------

interface ComplaintRequestBody {
  requestId?: unknown;
  bookId?: unknown;
  entry?: unknown;
}

interface BookConfigurationRequestBody {
  name?: unknown;
  ruc?: unknown;
  address?: unknown;
}

interface BookConfiguration {
  name: string;
  ruc: string;
  address: string;
}

// ---------------------------------------------------------------------------
// Cliente de datos y respuestas HTTP
// ---------------------------------------------------------------------------

function resolveBookId(): string {
  return process.env.COMPLAINT_BOOK_ID || DEFAULT_BOOK_ID;
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Todas las respuestas del libro son privadas y no deben almacenarse en cache.
function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

// ---------------------------------------------------------------------------
// Validaciones de la solicitud
// ---------------------------------------------------------------------------

function isSameOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin;
}

function isJsonContentType(request: Request): boolean {
  return Boolean(request.headers.get('content-type')?.includes('application/json'));
}

function isComplaintRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value);
}

/**
 * Lee el cuerpo como JSON con un limite estricto de 32 KB. El corte ocurre
 * mientras se consumen los fragmentos, antes de cualquier logica de negocio,
 * para no cargar payloads gigantes en memoria.
 */
async function readBoundedJsonBody(request: Request): Promise<unknown> {
  if (!request.body) {
    throw new Error('Cuerpo vacío');
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    size += value.byteLength;

    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error('Solicitud demasiado grande');
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }

  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * Normaliza y valida los datos del proveedor que se imprimen en la hoja.
 * Devuelve null cuando cualquier campo no cumple el contrato, de modo que el
 * llamador responda un unico 400 sin exponer el detalle campo por campo.
 */
function parseBookConfiguration(raw: unknown): BookConfiguration | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const { name, ruc, address } = raw as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 160) {
    return null;
  }

  if (typeof ruc !== 'string' || !RUC_PATTERN.test(ruc)) {
    return null;
  }

  if (typeof address !== 'string' || address.trim().length < 5 || address.length > 300) {
    return null;
  }

  return { name: name.trim(), ruc, address: address.trim() };
}

// ---------------------------------------------------------------------------
// GET: estado publico del libro
// ---------------------------------------------------------------------------

export async function GET() {
  const db = createSupabaseClient();

  if (!db) {
    return jsonResponse({ error: 'El libro no está configurado.' }, 503);
  }

  const { data, error } = await db.rpc('get_complaint_book', { p_book_id: resolveBookId() });

  if (error || !data) {
    return jsonResponse({ error: 'El libro no está disponible. Solicita el libro físico.' }, 503);
  }

  return jsonResponse(data);
}

// ---------------------------------------------------------------------------
// POST: registro de una hoja de reclamacion
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonResponse({ error: 'Origen no permitido.' }, 403);
  }

  if (!isJsonContentType(request)) {
    return jsonResponse({ error: 'Envía los datos como JSON.' }, 415);
  }

  let body: ComplaintRequestBody;

  try {
    const parsed = await readBoundedJsonBody(request);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Formato inválido');
    }

    body = parsed as ComplaintRequestBody;
  } catch {
    return jsonResponse(
      { error: 'La solicitud está vacía, es demasiado grande o no es válida.' },
      400,
    );
  }

  const requestId = body.requestId;

  if (!isComplaintRequestId(requestId)) {
    return jsonResponse({ error: 'Referencia de envío inválida.' }, 400);
  }

  const targetBookId = resolveBookId();

  if (body.bookId !== targetBookId) {
    return jsonResponse(
      { error: 'El formulario corresponde a otro establecimiento. Vuelve a abrirlo.' },
      409,
    );
  }

  // La validacion de campos ocurre antes de abrir cualquier conexion de datos.
  const validation = validateComplaint(body.entry);

  if (!validation.valid) {
    return jsonResponse(
      { error: Object.values(validation.errors)[0], errors: validation.errors },
      400,
    );
  }

  const db = createSupabaseClient();

  if (!db) {
    return jsonResponse({ error: 'El libro no está configurado. Solicita el libro físico.' }, 503);
  }

  const { data, error } = await db.rpc('submit_complaint', {
    p_book_id: targetBookId,
    p_request_id: requestId,
    p_entry: validation.value,
  });

  // No se registran ni se devuelven detalles de la base de datos con datos personales.
  if (error) {
    if (error.code === '22023') {
      return jsonResponse({ error: 'Revisa los datos de la hoja o la referencia de envío.' }, 400);
    }

    return jsonResponse(
      {
        error:
          'No se confirmó el registro. El establecimiento debe revisar su configuración. Puedes solicitar el libro físico.',
      },
      503,
    );
  }

  if (!data) {
    return jsonResponse({ error: 'No se confirmó el registro.' }, 503);
  }

  return jsonResponse(data as ComplaintReceipt);
}

// ---------------------------------------------------------------------------
// PUT: configuracion del libro por un administrador autorizado
// ---------------------------------------------------------------------------

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonResponse({ error: 'Origen no permitido.' }, 403);
  }

  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];

  if (!token || token.length > MAX_TOKEN_LENGTH) {
    return jsonResponse({ error: 'Inicia una sesión segura de administrador del libro.' }, 401);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return jsonResponse({ error: 'El libro no está configurado.' }, 503);
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await db.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse({ error: 'La sesión no es válida.' }, 401);
  }

  let body: BookConfigurationRequestBody;

  try {
    body = (await readBoundedJsonBody(request)) as BookConfigurationRequestBody;
  } catch {
    return jsonResponse({ error: 'Solicitud inválida.' }, 400);
  }

  const configuration = parseBookConfiguration(body);

  if (!configuration) {
    return jsonResponse(
      { error: 'Completa la razón social, RUC de 11 dígitos y dirección.' },
      400,
    );
  }

  const { data, error } = await db.rpc('configure_complaint_book', {
    p_book_id: resolveBookId(),
    p_name: configuration.name,
    p_ruc: configuration.ruc,
    p_address: configuration.address,
  });

  if (error) {
    const isForbidden = error.code === '42501';

    return jsonResponse(
      {
        error: isForbidden
          ? 'Tu cuenta no está autorizada para editar este libro.'
          : 'No se pudo guardar. Revisa la migración del libro.',
      },
      isForbidden ? 403 : 503,
    );
  }

  return jsonResponse(data);
}
