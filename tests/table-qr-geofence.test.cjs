const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDb, as } = require('./db-helpers.cjs');

async function setup() {
  const db = await createDb(['20261018020000_reviews_audit_config.sql', '20261018030000_table_qr_geofence.sql']);
  await db.exec(`INSERT INTO public.categories(id, name) VALUES ('fondos', 'Fondos');
    INSERT INTO public.dishes(id, name, price, category_id) VALUES ('lomo', 'Lomo', 68, 'fondos');
    INSERT INTO public.restaurant_tables(id, number, status) VALUES ('m-04', 'Mesa 04', 'comiendo'), ('m-05', 'Mesa 05', 'comiendo');
    INSERT INTO public.system_config(id) VALUES ('primary');`);
  await as(db, 'authenticated', 'admin');
  const tokens = (await db.query('SELECT public.get_table_qr_tokens(12) AS t')).rows[0].t;
  await as(db, null);
  return { db, token: (n) => tokens.find((t) => t.table === n).token };
}

const order = (db, table, tableToken, coords = {}) => db.query(
  'SELECT public.place_order($1, $2::jsonb, $3::uuid, 2, $4, NULL, $5, $6, $7, $8) AS o',
  [table, '[{"dish_id":"lomo","quantity":1}]', crypto.randomUUID(), 'QR COMENSAL', tableToken, coords.lat ?? null, coords.lng ?? null, coords.accuracy ?? null]
);

test('QR firmado: sin el código de SU mesa el comensal no pide, no llama al mozo ni pide la cuenta', async () => {
  const { db, token } = await setup();
  try {
    assert.match(token(4), /^[A-Za-z0-9_-]{22}$/, 'código de 128 bits en base64url');
    assert.notEqual(token(4), token(5));

    await as(db, 'anon');
    await assert.rejects(order(db, 'MESA 04', null), /Escanea el código QR/, 'sin código');
    await assert.rejects(order(db, 'MESA 04', token(5)), /Escanea el código QR/, 'código de otra mesa');
    await assert.rejects(order(db, 'MESA 04', 'x'.repeat(22)), /Escanea el código QR/, 'código inventado');
    const ok = (await order(db, 'MESA 04 (Terraza)', token(4))).rows[0].o;
    assert.equal(ok.status, 'por-validar', 'con su código sí pide');

    await assert.rejects(db.query("SELECT public.create_waiter_call('MESA 05', 'Consulta al mozo', NULL)"), /Escanea el código QR/);
    assert.equal((await db.query("SELECT public.create_waiter_call('MESA 05', 'Consulta al mozo', $1) AS ok", [token(5)])).rows[0].ok, true);
    assert.equal((await db.query("SELECT public.create_waiter_call('MESA 05', 'Consulta al mozo', $1) AS ok", [token(5)])).rows[0].ok, true, 'un segundo llamado abierto no falla');
    await assert.rejects(db.query("INSERT INTO public.waiter_calls(table_number, reason) VALUES ('MESA 05', 'Consulta al mozo')"), /permission denied/, 'ya no inserta directo');

    await assert.rejects(db.query("SELECT public.diner_table_signal('MESA 05', 'bill', 'Yape', $1)", [token(4)]), /Escanea el código QR/);
    assert.equal((await db.query("SELECT public.diner_table_signal('MESA 05', 'bill', 'Yape', $1) AS ok", [token(5)])).rows[0].ok, true);

    await assert.rejects(db.query('SELECT public.get_table_qr_tokens(5)'), /permission denied/, 'el público ni siquiera puede llamar la función');
    await assert.rejects(db.query('SELECT token FROM private.table_qr_tokens'), /permission denied/);
  } finally { await db.close(); }
});

test('QR firmado: el personal con sesión no necesita código y el admin puede invalidar los QR impresos', async () => {
  const { db, token } = await setup();
  try {
    await as(db, 'authenticated', 'floor');
    assert.ok((await order(db, 'MESA 07', null)).rows[0].o.id, 'sala registra sin código');
    assert.equal((await db.query("SELECT public.create_waiter_call('MESA 07', 'Consulta al mozo') AS ok")).rows[0].ok, true);
    await assert.rejects(db.query('SELECT public.get_table_qr_tokens(5)'), /Solo el administrador/);
    await assert.rejects(db.query('SELECT public.rotate_table_qr_tokens()'), /Solo el administrador/);

    const old = token(4);
    await as(db, 'authenticated', 'admin');
    assert.equal((await db.query('SELECT public.rotate_table_qr_tokens(ARRAY[4]) AS n')).rows[0].n, 1);
    const fresh = (await db.query('SELECT public.get_table_qr_tokens(12) AS t')).rows[0].t.find((t) => t.table === 4).token;
    assert.notEqual(fresh, old);
    assert.equal((await db.query('SELECT public.get_table_qr_tokens(12) AS t')).rows[0].t.find((t) => t.table === 5).token, token(5), 'las otras mesas no cambian');

    await as(db, 'anon');
    await assert.rejects(order(db, 'MESA 04', old), /Escanea el código QR/, 'el QR viejo deja de servir');
    assert.ok((await order(db, 'MESA 04', fresh)).rows[0].o.id);
  } finally { await db.close(); }
});

test('geocerca en el servidor: con la geocerca activa el pedido debe venir desde el restaurante', async () => {
  const { db, token } = await setup();
  try {
    await as(db, 'anon');
    assert.ok((await order(db, 'MESA 04', token(4))).rows[0].o.id, 'sin geocerca configurada no se exige ubicación');

    await as(db, null);
    await db.exec(`UPDATE public.system_config SET geofence_config = '{"enabled":true,"latitude":-12.1217,"longitude":-77.0298,"radiusMeters":150}'`);

    await as(db, 'anon');
    await assert.rejects(order(db, 'MESA 04', token(4)), /debes estar en el restaurante/, 'sin ubicación');
    // ~1,1 km al norte.
    await assert.rejects(order(db, 'MESA 04', token(4), { lat: -12.1117, lng: -77.0298, accuracy: 20 }), /debes estar en el restaurante/);
    // ~90 m: dentro del radio.
    assert.ok((await order(db, 'MESA 04', token(4), { lat: -12.1209, lng: -77.0298, accuracy: 15 })).rows[0].o.id);
    // ~220 m con GPS impreciso (±80 m): entra por el margen de precisión.
    assert.ok((await order(db, 'MESA 04', token(4), { lat: -12.1197, lng: -77.0298, accuracy: 80 })).rows[0].o.id);
    // La precisión no da más de 100 m de margen.
    await assert.rejects(order(db, 'MESA 04', token(4), { lat: -12.1177, lng: -77.0298, accuracy: 5000 }), /debes estar en el restaurante/);
    await assert.rejects(order(db, 'MESA 04', token(4), { lat: 95, lng: 0 }), /debes estar en el restaurante/, 'coordenadas imposibles');

    await as(db, 'authenticated', 'floor');
    assert.ok((await order(db, 'MESA 04', null)).rows[0].o.id, 'el personal no depende de la geocerca');
  } finally { await db.close(); }
});
