const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');
const root = path.join(__dirname, '..');
const migration = name => fs.readFileSync(path.join(root, 'supabase/migrations', name), 'utf8').replace(/^﻿/, '');

const KENJI = '00000000-0000-4000-8000-000000000001';
const SOFIA = '00000000-0000-4000-8000-000000000002';

async function setup() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto SCHEMA extensions;
    CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT coalesce(nullif(current_setting('test.jwt', true), ''), '{}')::jsonb $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;`);
  await db.exec(migration('20260919183000_init_gastropulse.sql').replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;', '')
    .replace(/ALTER PUBLICATION[^;]+;/g, 'NULL;'));
  await db.exec(migration('20260922192000_add_password_to_staff.sql'));
  await db.exec(`INSERT INTO auth.users(id) VALUES ('${KENJI}'), ('${SOFIA}');
    INSERT INTO public.staff(name, username, role, pin, password) VALUES
      ('Kenji', 'chef_kenji', 'kitchen', '1042', 'texto-plano'),
      ('Sofía', 'garzon_sofia', 'floor', '2045', NULL),
      ('Sin PIN válido', 'raro', 'bar', 'abc', NULL);`);
  await db.exec(migration('20261018000000_staff_supabase_auth.sql'));
  // Entre las dos fases el login anterior debe seguir funcionando.
  const between = (await db.query("SELECT pin FROM public.staff WHERE username = 'chef_kenji'")).rows[0];
  if (between.pin !== '1042') throw new Error('la fase aditiva no debe tocar staff.pin');
  await db.exec("INSERT INTO public.staff(name, username, role) VALUES ('Alta nueva', 'alta_nueva', 'floor')");
  await db.exec(migration('20261018000100_staff_lockdown.sql'));
  await db.exec(`UPDATE public.staff SET auth_user_id = '${KENJI}' WHERE username = 'chef_kenji';
    UPDATE public.staff SET auth_user_id = '${SOFIA}' WHERE username = 'garzon_sofia';`);
  return db;
}

const asUser = (db, uid) => db.query("SELECT set_config('test.uid', $1, false)", [uid]);
const verify = async (db, pin) => (await db.query('SELECT public.verify_my_pin($1) AS r', [pin])).rows[0].r;

test('migración: PIN a bcrypt y sin contraseñas en texto plano', async () => {
  const db = await setup();
  try {
    const cols = (await db.query(`SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='staff' AND column_name IN ('pin','password')`)).rows;
    assert.deepEqual(cols, [], 'staff ya no tiene pin ni password');
    const pins = (await db.query(`SELECT s.username, p.pin_hash FROM private.staff_pins p JOIN public.staff s ON s.id = p.staff_id ORDER BY 1`)).rows;
    assert.deepEqual(pins.map(p => p.username), ['chef_kenji', 'garzon_sofia'], 'un PIN no numérico no se migra');
    for (const { pin_hash } of pins) assert.match(pin_hash, /^\$2a\$10\$/);
  } finally { await db.close(); }
});

test('verify_my_pin: solo el PIN propio y bloqueo tras 5 fallos', async () => {
  const db = await setup();
  try {
    await asUser(db, '');
    await assert.rejects(verify(db, '1042'), /Inicia sesión/);

    await asUser(db, SOFIA);
    assert.equal((await verify(db, '1042')).ok, false, 'el PIN de otro colaborador no sirve');
    assert.equal((await verify(db, '2045')).ok, true);

    await asUser(db, KENJI);
    for (let i = 1; i <= 4; i++) {
      const r = await verify(db, '0000');
      assert.deepEqual([r.ok, r.reason, r.remaining], [false, 'wrong_pin', 5 - i]);
    }
    const locked = await verify(db, '0000');
    assert.equal(locked.reason, 'locked');
    assert.equal((await verify(db, '1042')).reason, 'locked', 'bloqueado aunque ahora acierte');

    await db.exec(`SELECT public.admin_set_staff_pin(id, '5555') FROM public.staff WHERE username = 'chef_kenji'`);
    assert.equal((await verify(db, '1042')).ok, false, 'el PIN anterior deja de valer');
    assert.equal((await verify(db, '5555')).ok, true, 'cambiar el PIN desbloquea');
    await assert.rejects(db.exec(`SELECT public.admin_set_staff_pin(id, '12') FROM public.staff WHERE username = 'chef_kenji'`), /entre 4 y 8/);
  } finally { await db.close(); }
});

test('login_retry_after: 5 fallos por usuario o 20 por IP en 15 minutos', async () => {
  const db = await setup();
  try {
    const retry = async (id, ip) => (await db.query('SELECT public.login_retry_after($1, $2) AS s', [id, ip])).rows[0].s;
    const record = (id, ip, ok) => db.query('SELECT public.record_login_attempt($1, $2, $3)', [id, ip, ok]);

    for (let i = 0; i < 4; i++) await record('Chef_Kenji ', '1.1.1.1', false);
    assert.equal(await retry('chef_kenji', '9.9.9.9'), 0);
    await record('chef_kenji', '2.2.2.2', false);
    const wait = await retry('CHEF_KENJI', '9.9.9.9');
    assert.ok(wait > 800 && wait <= 900, `bloqueado ~15 min por usuario (${wait}s)`);
    assert.equal(await retry('garzon_sofia', '9.9.9.9'), 0, 'otro usuario desde otra IP no se bloquea');

    for (let i = 0; i < 20; i++) await record(`u${i}`, '3.3.3.3', false);
    assert.ok(await retry('nadie', '3.3.3.3') > 0, 'una IP que prueba muchos usuarios se bloquea');

    await record('chef_kenji', '1.1.1.1', true);
    assert.equal(await retry('chef_kenji', '9.9.9.9'), 0, 'un login correcto limpia los fallos del usuario');

    await db.query("UPDATE private.login_attempts SET created_at = now() - interval '16 minutes'");
    assert.equal(await retry('nadie', '3.3.3.3'), 0, 'la ventana vence');
  } finally { await db.close(); }
});

test('cierre: staff deja de ser pública y solo el servidor la escribe', async () => {
  const db = await setup();
  try {
    await db.exec('SET ROLE anon');
    await assert.rejects(db.query('SELECT name FROM public.staff'), /permission denied/);
    await db.exec('RESET ROLE');

    await db.exec('SET ROLE authenticated');
    assert.equal((await db.query('SELECT name FROM public.staff')).rows.length, 0, 'sin staff_role en el JWT no ve a nadie');
    await db.query("SELECT set_config('test.jwt', $1, false)", [JSON.stringify({ app_metadata: { staff_role: 'floor' } })]);
    assert.equal((await db.query('SELECT name FROM public.staff')).rows.length, 4, 'el personal con sesión ve la lista');
    await assert.rejects(db.query("UPDATE public.staff SET role = 'admin'"), /permission denied/, 'nadie se sube de rol desde el navegador');
    await assert.rejects(db.query('SELECT pin_hash FROM private.staff_pins'), /permission denied/);
    await db.exec('RESET ROLE');
  } finally { await db.close(); }
});
