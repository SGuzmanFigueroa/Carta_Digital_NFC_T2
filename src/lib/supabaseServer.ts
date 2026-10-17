import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Clientes de Supabase para rutas API (solo servidor). La service role key
 * NUNCA debe llegar al navegador: no lleva prefijo NEXT_PUBLIC_.
 */

export type StaffRole = 'admin' | 'kitchen' | 'floor' | 'bar' | 'runner';
export const STAFF_ROLES: readonly StaffRole[] = ['admin', 'kitchen', 'floor', 'bar', 'runner'];

export class ServerConfigError extends Error {}

function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new ServerConfigError('Falta NEXT_PUBLIC_SUPABASE_URL.');
  return url;
}

const serverAuth = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Cliente con privilegios de administrador (bypassa RLS). */
export function createServiceClient(): SupabaseClient<Database> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new ServerConfigError('Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.');
  return createClient<Database>(supabaseUrl(), key, serverAuth);
}

/** Cliente anónimo de servidor (login con contraseña, verificación de JWT). */
export function createAnonServerClient(): SupabaseClient<Database> {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new ServerConfigError('Falta NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  return createClient<Database>(supabaseUrl(), key, serverAuth);
}

/** Email interno de la cuenta Auth: se inicia sesión con el usuario, no con un correo real. */
export function staffAuthEmail(username: string): string {
  return `${username}@personal.gastropulse.invalid`;
}

export function normalizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const username = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) ? username : null;
}

/** Contraseña aceptable: 8 a 72 caracteres (72 es el límite de bcrypt). */
export function isValidPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 72;
}

/**
 * Claims firmados que Supabase Auth pone en el JWT. El rol viene de
 * app_metadata, que solo puede escribir el servidor.
 */
export function staffAppMetadata(staffId: string, role: StaffRole, mustChangePassword: boolean) {
  const isAdmin = role === 'admin';
  return {
    staff_id: staffId,
    staff_role: role,
    must_change_password: mustChangePassword,
    // El admin también administra el Libro de Reclamaciones y el reporte diario.
    // `null` borra la clave si el colaborador deja de ser admin.
    complaint_role: isAdmin ? 'admin' : null,
    complaint_book_id: isAdmin ? process.env.COMPLAINT_BOOK_ID || 'primary' : null,
    reports_role: isAdmin ? 'admin' : null,
    reports_scope: isAdmin ? 'primary' : null
  };
}

export type StaffClaims = {
  userId: string;
  staffId: string;
  role: StaffRole;
  mustChangePassword: boolean;
};

/** Valida el Bearer token del request y devuelve el colaborador, o null. */
export async function getStaffFromRequest(request: Request): Promise<StaffClaims | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S{20,8000})$/i)?.[1];
  if (!token) return null;
  const { data, error } = await createAnonServerClient().auth.getClaims(token);
  if (error || !data?.claims) return null;
  const meta = (data.claims.app_metadata ?? {}) as Record<string, unknown>;
  const role = meta.staff_role as StaffRole;
  if (!STAFF_ROLES.includes(role) || typeof meta.staff_id !== 'string') return null;
  return {
    userId: data.claims.sub,
    staffId: meta.staff_id,
    role,
    mustChangePassword: meta.must_change_password === true
  };
}

/** IP del cliente (Netlify la entrega en x-nf-client-connection-ip). */
export function clientIp(request: Request): string {
  return (
    request.headers.get('x-nf-client-connection-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'desconocida'
  ).slice(0, 64);
}

/** Bloquea peticiones de otros sitios (CSRF) en rutas que cambian estado. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

/** Escapa % y _ para usar ilike como igualdad sin distinguir mayúsculas. */
export function ilikeExact(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
