const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const root = path.join(__dirname, '..');
const compile = file => ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const dates = { exports: {} };
new Function('exports', 'module', compile('src/features/reports/daily.ts'))(dates.exports, dates);

test('fecha del reporte: medianoche de Lima y calendario real', () => {
  assert.equal(dates.exports.limaDate(new Date('2026-10-11T04:59:59Z')), '2026-10-10');
  assert.equal(dates.exports.limaDate(new Date('2026-10-11T05:00:00Z')), '2026-10-11');
  for (const date of ['2026-02-29', '2026-13-01', '2026-1-01', 'x', '1999-12-31']) {
    assert.equal(dates.exports.isReportDate(date), false);
  }
  assert.equal(dates.exports.isReportDate('2024-02-29'), true);
});

test('Route Handler: autenticación verificada, permisos, JSON, fecha y errores privados', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://reports-test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test';
  let user = { app_metadata: { reports_role: 'admin', reports_scope: 'primary' } };
  let authError = null, rpcError = null, calls = 0, args;
  let report = { date: '2024-02-29', timezone: 'America/Lima', currency: 'PEN', totalRevenue: 35.5,
    completedOrders: 2, bestSellingDish: null, averageOccupancyPercent: null,
    occupancy: { observedSeconds: 0, elapsedSeconds: 86400, coveragePercent: 0 },
    dataQuality: { estimatedPaymentDates: 0, estimatedCompletionDates: 0 } };
  const route = { exports: {} };
  const db = { auth: { getUser: async token => { assert.equal(token, 'verified-token'); return { data: { user }, error: authError }; } },
    rpc: async (name, params) => { calls++; args = params; assert.equal(name, 'get_daily_sales_report'); return { data: report, error: rpcError }; } };
  new Function('require', 'exports', 'module', compile('src/app/api/reports/daily/route.ts'))(
    id => id.includes('supabase-js') ? { createClient: () => db } : dates.exports, route.exports, route);
  const req = (query = '?date=2024-02-29', token = true) => new Request('http://localhost/api/reports/daily' + query,
    { headers: token ? { Authorization: 'Bearer verified-token' } : {} });
  assert.equal((await route.exports.GET(req('', false))).status, 401);
  for (const query of ['?date=2026-02-29', '?date=2099-01-01', '?date=2024-02-29&date=2024-02-28']) {
    assert.equal((await route.exports.GET(req(query))).status, 400);
  }
  assert.equal(calls, 0);
  user = { app_metadata: {}, user_metadata: { reports_role: 'admin', reports_scope: 'primary' } };
  assert.equal((await route.exports.GET(req())).status, 403);
  user = { app_metadata: { reports_role: 'admin', reports_scope: 'another-restaurant' } };
  assert.equal((await route.exports.GET(req())).status, 403);
  user = { app_metadata: { reports_role: 'admin', reports_scope: 'primary' } };
  authError = new Error('expired'); assert.equal((await route.exports.GET(req())).status, 401); authError = null;
  const response = await route.exports.GET(req());
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), report);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('vary'), 'Authorization'); assert.equal(args.p_date, '2024-02-29');
  const validReport = report;
  report = { ...validReport, totalRevenue: '35.50' };
  assert.equal((await route.exports.GET(req())).status, 502);
  report = validReport;
  rpcError = { message: 'PRIVATE DATABASE DETAILS' };
  const failed = await route.exports.GET(req()); assert.equal(failed.status, 503);
  assert.ok(!JSON.stringify(await failed.json()).includes('PRIVATE DATABASE DETAILS'));
});

async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.jwt() TO authenticated;`);
  const schema = fs.readFileSync(path.join(root, 'supabase/migrations/20260919183000_init_gastropulse.sql'), 'utf8')
    .replace(/^\uFEFF/, '').split('-- ROW LEVEL SECURITY')[0].replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;', '');
  await db.exec(schema);
  await db.exec(`INSERT INTO public.dishes(id,name,price) VALUES ('a','Chaufa',10),('b','Lomo',20);
    INSERT INTO public.orders(id,table_number,status,total,created_at,updated_at) VALUES
    ('paid-start','Mesa 01','cobrado',30.10,'2024-02-28T20:00Z','2024-02-29T05:00Z'),
    ('paid-late','Mesa 01','cobrado',20.20,'2024-02-29T20:00Z','2024-03-01T04:59:59Z'),
    ('paid-next','Mesa 01','cobrado',100,'2024-02-29T20:00Z','2024-03-01T05:00Z'),
    ('delivered','Mesa 01','entregado',90,'2024-02-29T20:00Z','2024-02-29T21:00Z'),
    ('cancelled','Mesa 01','cancelado',200,'2024-02-29T20:00Z','2024-02-29T22:00Z'),
    ('cooking','Mesa 01','en-cocina',200,'2024-02-29T20:00Z','2024-02-29T22:00Z');
    INSERT INTO public.order_items(order_id,dish_id,name,quantity,price) VALUES
    ('paid-start','a','Chaufa',2,10),('paid-start','b','Lomo',1,20),
    ('paid-late','a','Chaufa',3,10),('cancelled','b','Lomo',999,20),('delivered','b','Lomo',100,20);`);
  await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/20261011000000_daily_sales_report.sql'), 'utf8'));
  await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ app_metadata: { reports_role: 'admin', reports_scope: 'primary' } })]);
  return db;
}
const report = async (db, date = '2024-02-29') => (await db.query('SELECT public.get_daily_sales_report($1::date) AS report', [date])).rows[0].report;

test('SQL real: soles exactos, límites de día, ventas por unidades y promedio ponderado', async () => {
  const db = await setup();
  try {
    await db.exec(`INSERT INTO private.report_occupancy_samples(sampled_at,total_tables,occupied_tables) VALUES
      ('2024-02-29T05:00Z',4,1),('2024-02-29T11:00Z',4,3),('2024-03-01T05:00Z',4,0);`);
    const result = await report(db);
    assert.equal(result.totalRevenue, 50.3); assert.equal(result.completedOrders, 3);
    assert.deepEqual(result.bestSellingDish, { id: 'a', name: 'Chaufa', units: 5 });
    assert.equal(result.averageOccupancyPercent, 62.5); assert.equal(result.occupancy.observedSeconds, 86400);
    assert.equal(result.occupancy.coveragePercent, 100);
    assert.deepEqual(result.dataQuality, { estimatedPaymentDates: 2, estimatedCompletionDates: 3 });
    await db.exec("UPDATE public.orders SET updated_at='2024-03-02T12:00Z',paid_at='2024-03-02T12:00Z' WHERE id='paid-start'");
    assert.equal((await report(db)).totalRevenue, 50.3);
    const empty = await report(db, '2024-02-28');
    assert.equal(empty.totalRevenue, 0); assert.equal(empty.completedOrders, 0);
    assert.equal(empty.bestSellingDish, null); assert.equal(empty.averageOccupancyPercent, null);
    assert.equal(empty.occupancy.coveragePercent, 0);
    await db.exec("DELETE FROM private.report_occupancy_samples WHERE sampled_at < '2025-01-01'; INSERT INTO private.report_occupancy_samples(sampled_at,total_tables,occupied_tables) VALUES ('2024-02-29T17:00Z',4,2)");
    const partial = await report(db); assert.equal(partial.averageOccupancyPercent, 50);
    assert.equal(partial.occupancy.coveragePercent, 50);
  } finally { await db.close(); }
});

test('SQL real: acceso restringido, fechas y captura automática de eventos', async () => {
  const db = await setup();
  try {
    await db.exec('SET ROLE anon'); await assert.rejects(report(db), /permission denied/);
    await db.exec('RESET ROLE; SET ROLE authenticated');
    await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ user_metadata: { reports_role: 'admin', reports_scope: 'primary' } })]);
    await assert.rejects(report(db), /No autorizado/);
    await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ app_metadata: { reports_role: 'admin', reports_scope: 'other' } })]);
    await assert.rejects(report(db), /No autorizado/);
    await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ app_metadata: { reports_role: 'admin', reports_scope: 'primary' } })]);
    assert.equal((await report(db)).totalRevenue, 50.3);
    await assert.rejects(report(db, '2099-12-31'), /Fecha inválida/);
    await assert.rejects(db.exec('SELECT * FROM private.report_occupancy_samples'), /permission denied/);
    await db.exec(`RESET ROLE; UPDATE public.orders SET status='entregado' WHERE id='cooking';
      UPDATE public.orders SET status='cobrado' WHERE id='cooking';
      INSERT INTO public.restaurant_tables(id,number,status) VALUES ('test-table','Mesa test','comiendo');`);
    const events = (await db.query("SELECT paid_at,completed_at,payment_date_estimated FROM public.orders WHERE id='cooking'")).rows[0];
    assert.ok(events.paid_at); assert.ok(events.completed_at); assert.equal(events.payment_date_estimated, false);
    const today = await report(db, dates.exports.limaDate());
    assert.equal(today.totalRevenue, 200); assert.equal(today.completedOrders, 1);
    assert.equal(today.dataQuality.estimatedPaymentDates, 0);
    await db.exec("UPDATE public.orders SET status='cobrado' WHERE id='cooking'");
    assert.equal((await report(db, dates.exports.limaDate())).completedOrders, 1);
    const sample = (await db.query('SELECT * FROM private.report_occupancy_samples ORDER BY id DESC LIMIT 1')).rows[0];
    assert.equal(sample.total_tables, 1); assert.equal(sample.occupied_tables, 1);
  } finally { await db.close(); }
});
