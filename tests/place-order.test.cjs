const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const root = path.join(__dirname, '..');
const migration = name => fs.readFileSync(path.join(root, 'supabase/migrations', name), 'utf8').replace(/^﻿/, '');

async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;`);
  await db.exec(migration('20260919183000_init_gastropulse.sql')
    .split('-- ROW LEVEL SECURITY')[0].replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;', ''));
  await db.exec(migration('20260930120000_cd4_order_limits_eta.sql').replace('create extension if not exists pgcrypto;', ''));
  await db.exec(`INSERT INTO public.categories(id,name) VALUES ('fondos','Fondos'),('bebidas','Bebidas');
    INSERT INTO public.dishes(id,name,price,category_id,active) VALUES
      ('lomo','Lomo Saltado',68,'fondos',true),('pisco','Pisco Sour',30,'bebidas',true),('viejo','Plato retirado',10,'fondos',false);
    INSERT INTO public.restaurant_tables(id,number,status,amount) VALUES ('m-04','Mesa 04','disponible',0);
    INSERT INTO public.system_config(id) VALUES ('primary');
    INSERT INTO public.orders(id,table_number,total) VALUES ('cmd-512','MESA 02',0);
    INSERT INTO public.cd4_restaurant_order_settings(restaurant_id,max_items_per_dish,max_items_per_order)
      VALUES ('11111111-1111-4111-8111-111111111111',5,8);`);
  await db.exec(migration('20261017000000_atomic_place_order.sql'));
  return db;
}

const place = async (db, items, key = crypto.randomUUID(), extra = {}) =>
  (await db.query('SELECT public.place_order($1,$2::jsonb,$3::uuid,$4,$5,$6) AS o',
    [extra.table ?? 'mesa 04', JSON.stringify(items), key, extra.pax ?? 2, extra.origin ?? 'QR COMENSAL', extra.waiter ?? null])).rows[0].o;

test('place_order: precios del servidor, número de secuencia y cuenta de mesa acumulada', async () => {
  const db = await setup();
  try {
    const first = await place(db, [
      { dish_id: 'lomo', quantity: 2, notes: '  sin cebolla ', price: 0.01, name: 'Hackeado' },
      { pairing_name: 'Chicha morada', quantity: 1 },
    ]);
    assert.match(first.id, /^cmd-\d+$/);
    assert.ok(first.order_number > 10000, 'arranca por encima del rango aleatorio legado');
    assert.equal(first.id, `cmd-${first.order_number}`);
    assert.equal(first.table_number, 'MESA 04');
    assert.equal(first.status, 'por-validar');
    assert.equal(Number(first.total), 68 * 2 + 35, 'ignora el precio y el nombre enviados por el cliente');
    assert.deepEqual(first.items.map(i => [i.name, i.quantity, Number(i.price), i.notes, i.station]), [
      ['Lomo Saltado', 2, 68, 'sin cebolla', 'wok_saute'],
      ['Chicha morada', 1, 35, null, 'barra_mixologia'],
    ]);

    const second = await place(db, [{ dish_id: 'pisco', quantity: 1, station: 'fuego_grill' }]);
    assert.equal(second.order_number, first.order_number + 1);
    assert.equal(second.items[0].station, 'fuego_grill', 'acepta la estación sugerida si es válida');
    const table = (await db.query("SELECT status, amount FROM public.restaurant_tables WHERE id='m-04'")).rows[0];
    assert.deepEqual([table.status, Number(table.amount)], ['qr', 171 + 30]);

    const staff = await place(db, [{ dish_id: 'pisco', quantity: 1 }], undefined, { origin: 'GARZÓN', waiter: 'Sofía' });
    assert.equal(staff.status, 'en-cocina');
  } finally { await db.close(); }
});

test('place_order: idempotente ante reintentos con la misma clave', async () => {
  const db = await setup();
  try {
    const key = crypto.randomUUID();
    const a = await place(db, [{ dish_id: 'lomo', quantity: 1 }], key);
    const b = await place(db, [{ dish_id: 'lomo', quantity: 9 }], key);
    assert.equal(b.id, a.id);
    assert.equal(Number(b.total), 68);
    const { rows } = await db.query('SELECT count(*)::int AS n FROM public.orders WHERE idempotency_key = $1', [key]);
    assert.equal(rows[0].n, 1);
  } finally { await db.close(); }
});

test('place_order: un plato inválido revierte toda la comanda (atómico)', async () => {
  const db = await setup();
  try {
    const before = (await db.query('SELECT count(*)::int AS n FROM public.orders')).rows[0].n;
    const cases = [
      [[{ dish_id: 'lomo', quantity: 1 }, { dish_id: 'viejo', quantity: 1 }], /ya no está disponible/],
      [[{ dish_id: 'no-existe', quantity: 1 }], /ya no está disponible/],
      [[{ dish_id: 'lomo', quantity: 0 }], /cantidad válida/],
      [[{ dish_id: 'lomo', quantity: '1; DROP TABLE orders' }], /cantidad válida/],
      [[], /al menos un plato/],
      [[{ quantity: 1 }], /qué se pidió/],
      // Límites migrados desde cd4_restaurant_order_settings: 5 por plato, 8 por orden.
      [[{ dish_id: 'lomo', quantity: 3 }, { dish_id: 'lomo', quantity: 3 }], /límite máximo de 5/],
      [[{ dish_id: 'lomo', quantity: 5 }, { dish_id: 'pisco', quantity: 4 }], /superar las 8/],
    ];
    for (const [items, message] of cases) {
      await assert.rejects(place(db, items), message);
    }
    await assert.rejects(place(db, [{ dish_id: 'lomo', quantity: 1 }], undefined, { table: 'terraza' }), /mesa válida/);
    await assert.rejects(place(db, [{ dish_id: 'lomo', quantity: 1 }], undefined, { pax: 0 }), /entre 1 y 24/);
    await assert.rejects(place(db, [{ dish_id: 'lomo', quantity: 1 }], undefined, { origin: 'ADMIN' }), /Origen/);
    const after = await db.query('SELECT (SELECT count(*)::int FROM public.orders) AS o, (SELECT count(*)::int FROM public.order_items) AS i');
    assert.deepEqual(after.rows[0], { o: before, i: 0 });
  } finally { await db.close(); }
});

test('prototipo cd4 archivado sin perder datos', async () => {
  const db = await setup();
  try {
    const { rows } = await db.query(`SELECT
      to_regclass('public.cd4_orders') AS pub, to_regclass('archive.cd4_orders') AS arch,
      (SELECT count(*)::int FROM archive.cd4_restaurant_order_settings) AS settings,
      to_regprocedure('public.create_cd4_order(uuid,text,uuid,jsonb)') AS fn`);
    assert.deepEqual(rows[0], { pub: null, arch: 'archive.cd4_orders', settings: 1, fn: null });
  } finally { await db.close(); }
});
