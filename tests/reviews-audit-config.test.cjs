const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDb, as } = require('./db-helpers.cjs');

const ADMIN_UID = '00000000-0000-4000-8000-0000000000aa';

async function setup() {
  const db = await createDb(['20261018020000_reviews_audit_config.sql']);
  await db.exec(`INSERT INTO public.categories(id, name) VALUES ('fondos', 'Fondos');
    INSERT INTO public.dishes(id, name, price, category_id) VALUES ('lomo', 'Lomo', 68, 'fondos');
    INSERT INTO public.system_config(id) VALUES ('primary');
    INSERT INTO auth.users(id) VALUES ('${ADMIN_UID}');
    INSERT INTO public.staff(name, username, role, auth_user_id) VALUES ('Carlos Mendoza', 'admin', 'admin', '${ADMIN_UID}');`);
  return db;
}

const rows = async (db, sql, params) => (await db.query(sql, params)).rows;
const review = (db, args) => db.query(
  'SELECT public.submit_review($1, $2, $3, $4, $5, $6, $7, $8, $9) AS id',
  [args.table ?? 'MESA 04', args.rating ?? 5, args.tip ?? 0, args.comments ?? null, args.method ?? 'YAPE', null, false, args.orderId ?? null, args.key ?? null]
);

test('reseñas: el comensal las envía, se verifican con la clave del pedido y solo el admin las lee', async () => {
  const db = await setup();
  try {
    await as(db, 'anon');
    const key = crypto.randomUUID();
    const order = (await db.query("SELECT public.place_order('MESA 04', '[{\"dish_id\":\"lomo\",\"quantity\":1}]'::jsonb, $1::uuid) AS o", [key])).rows[0].o;

    await review(db, { orderId: order.id, key, rating: 5, tip: 6.8, comments: '  Excelente lomo  ' });
    await review(db, { orderId: order.id, key: crypto.randomUUID(), rating: 1, comments: 'Reseña falsa' });
    await assert.rejects(review(db, { orderId: order.id, key }), /ya tiene una reseña/, 'una sola reseña verificada por pedido');
    await assert.rejects(review(db, { rating: 9 }), /de 1 a 5/);
    await assert.rejects(review(db, { tip: -5 }), /Propina/);
    await assert.rejects(db.query("INSERT INTO public.customer_reviews(table_number, rating) VALUES ('X', 5)"), /permission denied/);
    await assert.rejects(db.query('SELECT id FROM public.customer_reviews'), /permission denied/, 'el público no lee reseñas');

    await as(db, 'authenticated', 'floor');
    assert.equal((await rows(db, 'SELECT id FROM public.customer_reviews')).length, 0, 'sala no lee reseñas');

    await as(db, 'authenticated', 'admin');
    const saved = await rows(db, 'SELECT order_id, rating, tip_amount, comments, verified FROM public.customer_reviews ORDER BY rating DESC');
    assert.deepEqual(saved.map(r => [r.order_id, r.rating, Number(r.tip_amount), r.comments, r.verified]), [
      [order.id, 5, 6.8, 'Excelente lomo', true],
      [null, 1, 0, 'Reseña falsa', false],
    ], 'con una clave ajena la reseña no se vincula ni se verifica');
  } finally { await db.close(); }
});

test('auditoría: la base firma quién hizo la acción y nadie puede editarla ni borrarla', async () => {
  const db = await setup();
  try {
    await as(db, 'authenticated', 'admin', ADMIN_UID);
    await db.query("INSERT INTO public.staff_audit_logs(action, performed_by, details, level, event_type) VALUES ('Cobro de mesa', 'Alguien Falso', 'Mesa 04', 'info', 'TABLE_SETTLED')");
    const [log] = await rows(db, 'SELECT performed_by, actor_role, actor_auth_id, event_type FROM public.staff_audit_logs');
    assert.deepEqual([log.performed_by, log.actor_role, log.actor_auth_id, log.event_type],
      ['Carlos Mendoza', 'admin', ADMIN_UID, 'TABLE_SETTLED'], 'el nombre lo pone la base, no el navegador');

    await assert.rejects(db.query("UPDATE public.staff_audit_logs SET details = 'x'"), /permission denied/);
    await as(db, null);
    await assert.rejects(db.query("UPDATE public.staff_audit_logs SET details = 'x'"), /no se puede modificar/, 'ni con superusuario');
    await assert.rejects(db.query('DELETE FROM public.staff_audit_logs'), /no se puede modificar/);

    // Rutas del servidor (service_role, sin JWT de usuario): se respeta performed_by.
    await db.query("INSERT INTO public.staff_audit_logs(action, performed_by) VALUES ('Inicio de sesión', 'Kenji Takahashi')");
    assert.equal((await rows(db, "SELECT performed_by FROM public.staff_audit_logs WHERE action = 'Inicio de sesión'"))[0].performed_by, 'Kenji Takahashi');
  } finally { await db.close(); }
});

test('configuración de pago y geocerca: la lee cualquiera, la cambia solo el admin', async () => {
  const db = await setup();
  try {
    await as(db, 'authenticated', 'admin');
    await db.query(`UPDATE public.system_config SET payment_config = '{"phoneNumber":"999 111 222","acceptYape":true}',
      geofence_config = '{"latitude":-12.1,"longitude":-77.03,"radiusMeters":120}' WHERE id = 'primary'`);

    await as(db, 'anon');
    const [cfg] = await rows(db, "SELECT payment_config, geofence_config FROM public.system_config WHERE id = 'primary'");
    assert.equal(cfg.payment_config.phoneNumber, '999 111 222', 'el celular del comensal ve el número real');
    assert.equal(cfg.geofence_config.radiusMeters, 120);
    await assert.rejects(db.query(`UPDATE public.system_config SET payment_config = '{"phoneNumber":"estafa"}'`), /permission denied/);

    await as(db, 'authenticated', 'floor');
    assert.equal((await rows(db, `UPDATE public.system_config SET payment_config = '{}' RETURNING id`)).length, 0, 'sala no cambia el número de pago');

    await as(db, 'authenticated', 'admin');
    await assert.rejects(
      db.query("UPDATE public.system_config SET payment_config = jsonb_build_object('yapeQrImage', repeat('x', 1600000))"),
      /payment_config_size/, 'tope de tamaño para las imágenes QR');
  } finally { await db.close(); }
});
