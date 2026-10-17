// Base de datos de prueba (PGlite) que imita lo que Supabase da por defecto:
// roles anon/authenticated con privilegios de tabla (RLS decide), auth.jwt()
// configurable y pgcrypto en el esquema extensions.
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');

const root = path.join(__dirname, '..');
const migration = name => fs.readFileSync(path.join(root, 'supabase/migrations', name), 'utf8').replace(/^﻿/, '');

/** Migraciones que forman el esquema actual de pedidos, personal y RLS. */
const CORE_MIGRATIONS = [
  '20260919183000_init_gastropulse.sql',
  '20260921210000_staff_roles_and_permissions.sql',
  '20261010000000_create_waiter_calls.sql',
  '20261017000000_atomic_place_order.sql',
  '20261018000000_staff_supabase_auth.sql',
  '20261018000100_staff_lockdown.sql',
  '20261018010000_rls_lockdown.sql',
  '20261018010100_diner_signal_payment_length.sql',
];

async function createDb(extraMigrations = []) {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
    CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto SCHEMA extensions;
    CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT coalesce(nullif(current_setting('test.jwt', true), ''), '{}')::jsonb $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;`);
  // Sin Realtime en PGlite: solo sentencias sueltas, no los format('ALTER PUBLICATION ...').
  const noPublication = sql => sql.replace(/^(\s*)ALTER PUBLICATION[^;]+;/gm, '$1NULL;');
  for (const name of [...CORE_MIGRATIONS, ...extraMigrations]) {
    await db.exec(noPublication(migration(name).replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;', '')));
  }
  return db;
}

/** Cambia de rol: role = 'anon' | 'authenticated' | null (superusuario). */
async function as(db, role, staffRole, uid = '') {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('test.jwt', $1, false), set_config('test.uid', $2, false)", [
    staffRole ? JSON.stringify({ app_metadata: { staff_role: staffRole } }) : '',
    uid
  ]);
  if (role) await db.exec(`SET ROLE ${role}`);
}

module.exports = { createDb, as, migration };
