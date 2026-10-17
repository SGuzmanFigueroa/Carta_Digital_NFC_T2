const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDb, as } = require('./db-helpers.cjs');

async function setup() {
  const db = await createDb();
  await db.exec(`INSERT INTO public.categories(id, name) VALUES ('fondos', 'Fondos');
    INSERT INTO public.dishes(id, name, price, category_id) VALUES ('lomo', 'Lomo', 68, 'fondos');
    INSERT INTO public.restaurant_tables(id, number, status) VALUES ('m-04', 'Mesa 04', 'disponible'), ('m-05', 'Mesa 05', 'disponible');
    INSERT INTO public.system_config(id) VALUES ('primary');
    INSERT INTO public.staff_audit_logs(action) VALUES ('Registro previo');`);
  return db;
}

const rows = async (db, sql, params) => (await db.query(sql, params)).rows;
const placeOrder = (db, origin = 'QR COMENSAL', key = crypto.randomUUID()) =>
  db.query('SELECT public.place_order($1, $2::jsonb, $3::uuid, 2, $4) AS o', ['MESA 04', '[{"dish_id":"lomo","quantity":1}]', key, origin]);

test('comensal (anon): lee la carta y pide, pero no toca pedidos, precios ni mesas', async () => {
  const db = await setup();
  try {
    await as(db, 'anon');
    assert.equal((await rows(db, 'SELECT id FROM public.dishes')).length, 1, 've la carta');
    assert.equal((await rows(db, 'SELECT id FROM public.restaurant_tables')).length, 2, 've las mesas');
    await assert.rejects(db.query("UPDATE public.dishes SET price = 1"), /permission denied/, 'no cambia precios');
    await assert.rejects(db.query("UPDATE public.restaurant_tables SET status = 'cuenta'"), /permission denied/);
    await assert.rejects(db.query("UPDATE public.system_config SET branch_name = 'X'"), /permission denied/);
    await assert.rejects(db.query("INSERT INTO public.orders(id, table_number) VALUES ('cmd-1', 'MESA 01')"), /permission denied/);

    const key = crypto.randomUUID();
    const order = (await placeOrder(db, 'QR COMENSAL', key)).rows[0].o;
    assert.equal(Number(order.total), 68, 'place_order sigue funcionando para el comensal');
    assert.equal((await rows(db, 'SELECT id FROM public.orders')).length, 0, 'no ve los pedidos de nadie');
    await assert.rejects(placeOrder(db, 'GARZÓN'), /Solo el personal/, 'no puede saltarse la validación como garzón');

    const mine = (await rows(db, 'SELECT public.get_diner_orders($1::jsonb) AS r', [JSON.stringify([{ id: order.id, key }])]))[0].r;
    assert.deepEqual(mine.map(o => [o.id, o.status]), [[order.id, 'por-validar']], 've su propio pedido con su clave');
    const other = (await rows(db, 'SELECT public.get_diner_orders($1::jsonb) AS r', [JSON.stringify([{ id: order.id, key: crypto.randomUUID() }])]))[0].r;
    assert.deepEqual(other, [], 'con otra clave no ve nada');

    assert.equal((await rows(db, "SELECT public.diner_table_signal('MESA 04', 'bill', 'Yape') AS ok"))[0].ok, true);
    await assert.rejects(db.query("SELECT public.diner_table_signal('MESA 04', 'borrar')"), /no válido/);

    await db.query("INSERT INTO public.waiter_calls(table_number, reason) VALUES ('MESA 04', 'Consulta al mozo')");
    await assert.rejects(
      db.query("INSERT INTO public.waiter_calls(table_number, reason, status) VALUES ('MESA 05', 'Consulta al mozo', 'attended')"),
      /row-level security/, 'no puede crear llamados ya atendidos');
    assert.equal((await rows(db, 'SELECT id FROM public.waiter_calls')).length, 0, 'no lee los llamados');
    assert.equal((await rows(db, 'SELECT id FROM public.staff_audit_logs')).length, 0);
    assert.equal((await rows(db, 'SELECT id FROM public.role_permissions')).length, 0);

    await as(db, null);
    const table = (await rows(db, "SELECT status FROM public.restaurant_tables WHERE id = 'm-04'"))[0];
    const flagged = (await rows(db, 'SELECT account_requested, payment_method FROM public.orders WHERE id = $1', [order.id]))[0];
    assert.equal(table.status, 'cuenta');
    assert.deepEqual([flagged.account_requested, flagged.payment_method], [true, 'Yape']);
  } finally { await db.close(); }
});

test('personal (sala): opera pedidos y mesas, pero no la carta ni la auditoría', async () => {
  const db = await setup();
  try {
    await as(db, 'authenticated', 'floor');
    const order = (await placeOrder(db, 'GARZÓN')).rows[0].o;
    assert.equal(order.status, 'en-cocina', 'el personal sí registra comandas de sala');
    assert.equal((await rows(db, 'SELECT id FROM public.orders')).length, 1, 've los pedidos');
    assert.equal((await rows(db, "UPDATE public.orders SET status = 'entregado' RETURNING id")).length, 1);
    assert.equal((await rows(db, "UPDATE public.restaurant_tables SET status = 'comiendo' RETURNING id")).length, 2);
    await assert.rejects(db.query('DELETE FROM public.orders'), /permission denied/, 'nadie borra pedidos');

    assert.equal((await rows(db, 'UPDATE public.dishes SET price = 1 RETURNING id')).length, 0, 'sala no cambia precios');
    await assert.rejects(db.query("INSERT INTO public.dishes(id, name, price) VALUES ('x', 'X', 1)"), /row-level security/);

    await db.query("INSERT INTO public.staff_audit_logs(action) VALUES ('Cobro de mesa')");
    assert.equal((await rows(db, 'SELECT id FROM public.staff_audit_logs')).length, 0, 'solo el admin lee la auditoría');
    await assert.rejects(db.query('DELETE FROM public.staff_audit_logs'), /permission denied/);
    assert.ok((await rows(db, 'SELECT id FROM public.role_permissions')).length > 0, 've los permisos');
    assert.equal((await rows(db, "UPDATE public.role_permissions SET panel_admin = 'allow' RETURNING id")).length, 0, 'no los cambia');
  } finally { await db.close(); }
});

test('admin: gestiona la carta, la configuración y lee la auditoría', async () => {
  const db = await setup();
  try {
    await as(db, 'authenticated', 'admin');
    assert.equal((await rows(db, 'UPDATE public.dishes SET price = 70 RETURNING id')).length, 1);
    await db.query("INSERT INTO public.promo_offers(mechanic, main_dish_id, discount_percent) VALUES ('discount', 'lomo', 10)");
    assert.equal((await rows(db, "UPDATE public.system_config SET branch_name = 'Nuevo' RETURNING id")).length, 1);
    assert.equal((await rows(db, 'SELECT id FROM public.staff_audit_logs')).length, 1);
    await assert.rejects(db.query("UPDATE public.staff_audit_logs SET action = 'editado'"), /permission denied/, 'ni el admin edita la auditoría');
    assert.ok((await rows(db, "UPDATE public.role_permissions SET panel_admin = 'allow' RETURNING id")).length > 0);
  } finally { await db.close(); }
});

test('usuario autenticado sin rol de personal: nada más que lo público', async () => {
  const db = await setup();
  try {
    await as(db, 'authenticated');
    assert.equal((await rows(db, 'SELECT id FROM public.orders')).length, 0);
    assert.equal((await rows(db, "UPDATE public.restaurant_tables SET status = 'x' RETURNING id")).length, 0);
    await assert.rejects(placeOrder(db, 'GARZÓN'), /Solo el personal/);
  } finally { await db.close(); }
});
