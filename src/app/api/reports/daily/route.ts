import { createClient } from '@supabase/supabase-js';
import { isReportDate, isDailyReport, limaDate } from '@/features/reports/daily';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
});

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return json({ error: 'Inicia sesión para consultar el reporte.' }, 401);

  const params = new URL(request.url).searchParams;
  const dates = params.getAll('date');
  const date = dates[0] ?? limaDate();
  if (dates.length > 1 || !isReportDate(date) || date > limaDate()) {
    return json({ error: 'Usa una fecha válida YYYY-MM-DD, desde 2000 y hasta hoy en Lima.' }, 400);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return json({ error: 'El servicio de reportes no está configurado.' }, 503);

  try {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    // Verify the token with Supabase; do not trust the browser's session cookie.
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) return json({ error: 'La sesión no es válida.' }, 401);
    if (user.app_metadata?.reports_role !== 'admin' || user.app_metadata?.reports_scope !== 'primary') {
      return json({ error: 'No tienes permiso para consultar las ventas.' }, 403);
    }
    const { data, error } = await db.rpc('get_daily_sales_report', { p_date: date });
    if (error) return json({ error: 'No se pudo consultar el reporte. Revisa la migración y la conexión de Supabase.' }, 503);
    if (!isDailyReport(data, date)) {
      return json({ error: 'El servicio devolvió un reporte inválido.' }, 502);
    }
    return json(data);
  } catch {
    return json({ error: 'El servicio de reportes no está disponible.' }, 503);
  }
}
