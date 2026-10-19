const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/supabase.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function initialize(env) {
  const calls = [];
  const client = { testClient: true };
  const module = { exports: {} };
  const context = { process: { env }, module, exports: module.exports,
    require(id) {
      assert.equal(id, '@supabase/ssr');
      return { createBrowserClient(...args) { calls.push(args); return client; } };
    } };
  try {
    vm.runInNewContext(compiled, context);
    return { calls, client, result: module.exports.supabase };
  } catch (error) {
    return { calls, error };
  }
}

test('Supabase: falla antes de crear el cliente si falta alguna variable', () => {
  const url = 'https://environment-test.supabase.co';
  const key = 'test-key-never-log';
  for (const [env, missing] of [
    [{}, ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']],
    [{ NEXT_PUBLIC_SUPABASE_URL: url }, ['NEXT_PUBLIC_SUPABASE_ANON_KEY']],
    [{ NEXT_PUBLIC_SUPABASE_ANON_KEY: key }, ['NEXT_PUBLIC_SUPABASE_URL']],
    [{ NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: key }, ['NEXT_PUBLIC_SUPABASE_URL']],
    [{ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: '  \t' }, ['NEXT_PUBLIC_SUPABASE_ANON_KEY']],
  ]) {
    const { error, calls } = initialize(env);
    assert.ok(error); assert.equal(calls.length, 0);
    missing.forEach(name => assert.ok(error.message.includes(name)));
    assert.ok(error.message.includes('.env.local')); assert.ok(error.message.includes('despliegue'));
    assert.ok(!error.message.includes(url)); assert.ok(!error.message.includes(key));
  }
});

test('Supabase: usa solo el entorno y conserva cliente de cookies y parámetros Realtime', () => {
  const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://configured-project.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'configured-key' };
  const { calls, client, result, error } = initialize(env);
  assert.equal(error, undefined); assert.equal(result, client); assert.equal(calls.length, 1);
  assert.equal(calls[0][0], env.NEXT_PUBLIC_SUPABASE_URL); assert.equal(calls[0][1], env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  assert.equal(calls[0][2].realtime.params.eventsPerSecond, 20);
  assert.ok(!source.includes('https://')); assert.ok(!/eyJ[a-zA-Z0-9_-]+\./.test(source));
});
