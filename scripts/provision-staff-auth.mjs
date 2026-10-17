#!/usr/bin/env node
/**
 * Crea la cuenta de Supabase Auth de cada colaborador que aún no la tiene
 * (staff.auth_user_id vacío), con una contraseña TEMPORAL al azar. Al entrar
 * por primera vez, la app obliga a cambiarla.
 *
 * Uso:
 *   node scripts/provision-staff-auth.mjs --dry-run   # solo muestra qué haría
 *   node scripts/provision-staff-auth.mjs
 *
 * Necesita NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (de .env.local
 * o del entorno). Las contraseñas temporales se escriben SOLO en
 * staff-temp-passwords.local.txt (ignorado por git): entrégalas en persona y
 * borra el archivo. Nunca se imprimen en la terminal.
 */
import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');
const OUTPUT = path.join(root, 'staff-temp-passwords.local.txt');

function loadEnv() {
  const envFile = path.join(root, '.env.local');
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

/** Mismo formato que staffAuthEmail() en src/lib/supabaseServer.ts. */
const staffAuthEmail = (username) => `${username}@personal.gastropulse.invalid`;

/** Mismos claims que staffAppMetadata() en src/lib/supabaseServer.ts. */
function staffAppMetadata(staffId, role) {
  const isAdmin = role === 'admin';
  return {
    staff_id: staffId,
    staff_role: role,
    must_change_password: true,
    complaint_role: isAdmin ? 'admin' : null,
    complaint_book_id: isAdmin ? process.env.COMPLAINT_BOOK_ID || 'primary' : null,
    reports_role: isAdmin ? 'admin' : null,
    reports_scope: isAdmin ? 'primary' : null
  };
}

/** 12 caracteres sin ambiguos (0/O, 1/l/I) para dictarla sin errores. */
function temporaryPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 12 }, () => alphabet[randomInt(alphabet.length)]).join('');
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found || data.users.length < 200) return found ?? null;
  }
  return null;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (en .env.local o el entorno).');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, name, username, role, auth_user_id')
    .order('created_at');
  if (error) throw error;

  const pending = staff.filter((member) => !member.auth_user_id);
  console.log(`Personal: ${staff.length} · ya con cuenta: ${staff.length - pending.length} · por crear: ${pending.length}`);
  if (dryRun) {
    for (const member of pending) console.log(`  - ${member.username} (${member.role})`);
    console.log('Modo --dry-run: no se creó nada.');
    return;
  }

  const issued = [];
  const failures = [];
  for (const member of pending) {
    const username = member.username?.trim().toLowerCase();
    if (!username || !/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) {
      failures.push(`${member.username}: usuario con formato no válido`);
      continue;
    }
    const email = staffAuthEmail(username);
    const password = temporaryPassword();
    const appMetadata = staffAppMetadata(member.id, member.role);

    let userId;
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: appMetadata
    });
    if (created?.user) {
      userId = created.user.id;
    } else if (/already|registered|exists/i.test(createError?.message ?? '')) {
      // Una corrida anterior creó la cuenta pero no llegó a vincularla.
      const existing = await findUserByEmail(supabase.auth.admin, email);
      if (!existing) {
        failures.push(`${username}: la cuenta existe pero no se encontró`);
        continue;
      }
      const { error: resetError } = await supabase.auth.admin.updateUserById(existing.id, { password, app_metadata: appMetadata });
      if (resetError) {
        failures.push(`${username}: ${resetError.message}`);
        continue;
      }
      userId = existing.id;
    } else {
      failures.push(`${username}: ${createError?.message ?? 'error desconocido'}`);
      continue;
    }

    const { error: linkError } = await supabase
      .from('staff')
      .update({ auth_user_id: userId, must_change_password: true })
      .eq('id', member.id);
    if (linkError) {
      failures.push(`${username}: cuenta creada pero no vinculada (${linkError.message})`);
      continue;
    }
    issued.push({ username, name: member.name, role: member.role, password });
  }

  if (issued.length > 0) {
    const lines = [
      'Contraseñas TEMPORALES del personal de GastroPulse',
      `Generadas: ${new Date().toISOString()}`,
      'Entrégalas en persona. Cada colaborador debe cambiarla al entrar. BORRA ESTE ARCHIVO después.',
      '',
      ...issued.map((u) => `${u.username.padEnd(16)} ${u.role.padEnd(8)} ${u.password}   (${u.name})`),
      ''
    ];
    writeFileSync(OUTPUT, lines.join('\n'), { encoding: 'utf8', flag: 'a' });
  }

  console.log(`Cuentas creadas: ${issued.length}${issued.length ? ` → contraseñas en ${path.relative(root, OUTPUT)}` : ''}`);
  if (failures.length > 0) {
    console.error(`Con problemas (${failures.length}):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Error:', err.message ?? err);
  process.exit(1);
});
