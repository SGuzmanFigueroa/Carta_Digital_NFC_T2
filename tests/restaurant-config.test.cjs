const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

function load(file, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', ...Object.keys(globals), source)(
    id => dependencies[id] ?? require(id), module.exports, module, ...Object.values(globals));
  return module.exports;
}
const config = load('src/config/restaurant.ts');
const custom = { branchName: 'Sucursal Norte', email: 'contacto@example.test', branchRuc: '20123456789' };
const tick = () => new Promise(resolve => setImmediate(resolve));
class ConfigEvent extends Event {
  constructor(type, options) { super(type); this.detail = options?.detail; }
}

test('identidad: respeta configuración editable y usa respaldo solo para valores ausentes', () => {
  assert.deepEqual(config.restaurantIdentity(custom), custom);
  assert.deepEqual(config.restaurantIdentity({ branchName: '  Norte  ', email: '  ', branchRuc: undefined }), {
    ...config.DEFAULT_RESTAURANT_IDENTITY, branchName: 'Norte',
  });
  assert.deepEqual(config.restaurantIdentity(null), config.DEFAULT_RESTAURANT_IDENTITY);
  assert.equal(config.escapeRestaurantHtml(`<img src=x onerror="alert('x')"> &`),
    '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp;');
});

test('configService: lee y guarda con el mismo identificador centralizado y anuncia los cambios', async () => {
  const calls = [];
  const window = new EventTarget();
  let changed;
  window.addEventListener(config.SYSTEM_CONFIG_CHANGED_EVENT, event => { changed = event.detail; });
  const storage = new Map();
  const service = load('src/services/configService.ts', {
    '@/config/restaurant': config,
    '@/data/mockData': { INITIAL_CONFIG: config.DEFAULT_RESTAURANT_IDENTITY },
    './authService': { createAuditLogInDb: async () => {} },
    '@/lib/supabase': { supabase: { from(table) {
      assert.equal(table, 'system_config');
      const query = {
        select: () => query,
        eq(key, value) { calls.push(['read', key, value]); return query; },
        maybeSingle: async () => ({ data: { branch_name: custom.branchName, email: custom.email, branch_ruc: custom.branchRuc } }),
        upsert: async row => { calls.push(['write', row]); return { error: null }; },
      };
      return query;
    } } },
  }, { window, CustomEvent: ConfigEvent, localStorage: {
    getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value),
  } });
  const read = await service.fetchSystemConfigFromDb();
  assert.deepEqual(config.restaurantIdentity(read), custom);
  assert.equal(await service.saveSystemConfigToDb(read), true);
  assert.deepEqual(calls[0], ['read', 'id', config.RESTAURANT_ID]);
  assert.equal(calls[1][1].id, config.RESTAURANT_ID);
  assert.equal(calls[1][1].email, custom.email);
  assert.deepEqual(config.restaurantIdentity(changed), custom);
  assert.equal(JSON.parse(storage.get(config.SYSTEM_CONFIG_STORAGE_KEY)).branchName, custom.branchName);
});

test('identidad compartida: un guardado prevalece sobre una carga anterior y se sincronizan otras pestañas', async () => {
  const window = new EventTarget();
  const effects = [], updates = [];
  let resolveFirst;
  let request = 0;
  const context = load('src/context/RestaurantIdentityContext.tsx', {
    'react': { ...React, useState: initial => [initial, value => updates.push(value)], useEffect: effect => effects.push(effect) },
    '@/config/restaurant': config,
    '@/services/configService': { fetchSystemConfigFromDb: () => ++request === 1
      ? new Promise(resolve => { resolveFirst = resolve; })
      : Promise.resolve({ ...custom, branchName: 'Sucursal Sur' }) },
  }, { window });
  context.RestaurantIdentityProvider({ children: null });
  const cleanup = effects[0]();
  window.dispatchEvent(new ConfigEvent(config.SYSTEM_CONFIG_CHANGED_EVENT, { detail: custom }));
  assert.deepEqual(updates.at(-1), custom);
  resolveFirst({ branchName: 'Respuesta antigua' });
  await tick();
  assert.equal(updates.length, 1);
  const storage = new Event('storage');
  storage.key = config.SYSTEM_CONFIG_STORAGE_KEY;
  storage.newValue = JSON.stringify({ ...custom, branchName: 'Sucursal Sur' });
  window.dispatchEvent(storage);
  await tick();
  assert.equal(updates.at(-1).branchName, 'Sucursal Sur');
  assert.equal(request, 1, 'el guardado local de otra pestaña no se sobrescribe con una lectura remota anterior');
  cleanup();
  window.dispatchEvent(new ConfigEvent(config.SYSTEM_CONFIG_CHANGED_EVENT, { detail: custom }));
  assert.equal(updates.length, 2);
});
