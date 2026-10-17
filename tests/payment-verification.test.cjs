const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDb, as } = require('./db-helpers.cjs');

const WAITER_UID = '00000000-0000-4000-8000-0000000000bb';

async function setup() {
  const db = await createDb([
    '20261018020000_reviews_audit_config.sql',
    '20261018030000_table_qr_geofence.sql',
    '20261018040000_payment_verification.sql',
  ]);
  await db.exec(`INSERT INTO public.categories(id, name) VALUES ('fondos', 'Fondos');
    INSERT INTO public.dishes(id, name, price, category_id) VALUES ('lomo', 'Lomo', 68, 'fondos');
    INSERT INTO public.restaurant_tables(id, number, status) VALUES ('m-04', 'Mesa 04', 'comiendo'), ('m-14', 'Mesa 14', 'comiendo');
    INSERT INTO public.system_config(id) VALUES ('primary');
    INSERT INTO auth.users(id) VALUES ('${WAITER_UID}');
    INSERT INTO public.staff(name, username, role, auth_user_id) VALUES ('Sofía Valdivia', 'garzon_sofia', 'floor', '${WAITER_UID}');`);
  await as(db, 'authenticated', 'admin');
  const tokens = (await db.query('SELECT public.get_table_qr_tokens(20) AS t')).rows[0].t;
  return { db, token: (n) => tokens.find((t) => t.table === n).token };
}

const rows = async (db, sql, params) => (await db.query(sql, params)).rows;

async function dinerOrder(db, token, table = 'MESA 04') {
  const key = crypto.randomUUID();
  const o = (await db.query("SELECT public.place_order($1, '[{\"dish_id\":\"lomo\",\"quantity\":1}]'::jsonb, $2::uuid, 2, 'QR COMENSAL', NULL, $3) AS o", [table, key, token])).rows[0].o;
  return { id: o.id, key };
}

test('Yape/Plin: pedir la cuenta deja el pago pendiente de verificación y el comensal lo ve', async () => {
  const { db, token } = await setup();
  try {
    await as(db, 'anon');
    const mine = await dinerOrder(db, token(4));
    const other = await dinerOrder(db, token(14), 'MESA 14');

    await assert.rejects(db.query("SELECT public.diner_table_signal('MESA 04', 'bill', 'Yape', $1, 'bitcoin')", [token(4)]), /Método de pago/);
    await assert.rejects(db.query("SELECT public.diner_table_signal('MESA 04', 'bill', 'Yape', $1, 'yape', '12')", [token(4)]), /entre 6 y 8 dígitos/);
    await db.query("SELECT public.diner_table_signal('MESA 04', 'bill', 'Yape QR (OP: 123456)', $1, 'yape', 'OP-123456')", [token(4)]);

    const [status] = (await rows(db, 'SELECT public.get_diner_orders($1::jsonb) AS r', [JSON.stringify([mine])]))[0].r;
    assert.equal(status.payment_status, 'pending_verification', 'el comensal ve que falta verificar');

    await as(db, null);
    const [o4] = await rows(db, 'SELECT payment_status, payment_reference, account_requested FROM public.orders WHERE id = $1', [mine.id]);
    const [o14] = await rows(db, 'SELECT payment_status FROM public.orders WHERE id = $1', [other.id]);
    assert.deepEqual([o4.payment_status, o4.payment_reference, o4.account_requested], ['pending_verification', '123456', true]);
    assert.equal(o14.payment_status, 'none', 'la Mesa 14 no se ve afectada');

    await as(db, 'anon');
    await db.query("SELECT public.diner_table_signal('MESA 14', 'bill', 'Efectivo', $1, 'efectivo')", [token(14)]);
    await as(db, null);
    assert.equal((await rows(db, 'SELECT payment_status FROM public.orders WHERE id = $1', [other.id]))[0].payment_status, 'none', 'efectivo no queda por verificar');
  } finally { await db.close(); }
});

test('solo el personal confirma o rechaza, y queda en la auditoría con su nombre', async () => {
  const { db, token } = await setup();
  try {
    await as(db, 'anon');
    const mine = await dinerOrder(db, token(4));
    await db.query("SELECT public.diner_table_signal('MESA 04', 'bill', 'Plin', $1, 'plin', '87654321')", [token(4)]);
    await assert.rejects(db.query("SELECT public.review_table_payment('MESA 04', true)"), /permission denied/, 'el comensal no se autoconfirma');

    await as(db, 'authenticated', 'floor', WAITER_UID);
    assert.equal((await rows(db, "SELECT public.review_table_payment('MESA 04', false) AS n"))[0].n, 1);
    await as(db, null);
    const [rejected] = await rows(db, 'SELECT payment_status, account_requested, payment_reviewed_by FROM public.orders WHERE id = $1', [mine.id]);
    assert.deepEqual([rejected.payment_status, rejected.account_requested, rejected.payment_reviewed_by], ['rejected', false, 'Sofía Valdivia'],
      'rechazado: la cuenta vuelve a quedar pendiente');

    // El comensal reintenta con el código correcto y esta vez se confirma.
    await as(db, 'anon');
    await db.query("SELECT public.diner_table_signal('MESA 04', 'bill', 'Plin', $1, 'plin', '11223344')", [token(4)]);
    await as(db, 'authenticated', 'floor', WAITER_UID);
    assert.equal((await rows(db, "SELECT public.review_table_payment('Mesa 04 (Salón)', true) AS n"))[0].n, 1);
    assert.equal((await rows(db, "SELECT public.review_table_payment('MESA 04', true) AS n"))[0].n, 0, 'no hay nada más que confirmar');

    await as(db, null);
    assert.equal((await rows(db, 'SELECT payment_status FROM public.orders WHERE id = $1', [mine.id]))[0].payment_status, 'verified');
    const audit = await rows(db, "SELECT action, performed_by, details FROM public.staff_audit_logs WHERE event_type LIKE 'PAYMENT_%' ORDER BY created_at");
    assert.deepEqual(audit.map((a) => [a.action, a.performed_by]), [
      ['Pago digital rechazado', 'Sofía Valdivia'],
      ['Pago digital confirmado', 'Sofía Valdivia'],
    ]);
    assert.match(audit[1].details, /11223344/);
  } finally { await db.close(); }
});
