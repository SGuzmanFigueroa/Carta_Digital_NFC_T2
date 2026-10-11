const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = ts.transpileModule(fs.readFileSync(path.join(root, 'src/utils/menuTheme.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function environment({ dark = false, manual, blocked = false, legacy = false, pathname = '/menu', admin = 'light' } = {}) {
  const attrs = new Map([['data-theme', admin]]), classes = new Set(['dark']);
  const element = { setAttribute: (key, value) => attrs.set(key, value), removeAttribute: key => attrs.delete(key),
    getAttribute: key => attrs.get(key) ?? null,
    classList: { toggle(key, yes) { if (yes) classes.add(key); else classes.delete(key); }, remove(...keys) { keys.forEach(key => classes.delete(key)); } },
    style: { colorScheme: '', removeProperty(key) { if (key === 'color-scheme') this.colorScheme = ''; } } };
  const storage = new Map([['gastropulse_system_config', JSON.stringify({ themeMode: admin })]]);
  if (manual !== undefined) storage.set('gastropulse_menu_theme', manual);
  let writes = 0; const listeners = new Set();
  const media = { matches: dark, addListener(fn) { listeners.add(fn); }, removeListener(fn) { listeners.delete(fn); } };
  if (!legacy) { media.addEventListener = (event, fn) => { assert.equal(event, 'change'); listeners.add(fn); };
    media.removeEventListener = (event, fn) => { assert.equal(event, 'change'); listeners.delete(fn); }; }
  const localStorage = { getItem(key) { if (blocked) throw Error('storage blocked'); return storage.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw Error('storage blocked'); writes++; storage.set(key, value); } };
  const document = { documentElement: element, body: element };
  const window = { location: { pathname }, localStorage, matchMedia(query) { assert.equal(query, '(prefers-color-scheme: dark)'); return media; } };
  const module = { exports: {} }; const context = vm.createContext({ module, exports: module.exports, window, document, localStorage });
  vm.runInContext(source, context);
  return { api: module.exports, context, attrs, classes, storage, element, listeners, writes: () => writes,
    change(matches) { media.matches = matches; listeners.forEach(listener => listener({ matches })); } };
}

test('primer paint: claro/oscuro, preferencia manual, almacenamiento bloqueado y ámbito público', () => {
  for (const options of [{ dark: true }, { dark: false }, { dark: true, manual: 'light' },
    { dark: false, manual: 'dark' }, { dark: true, manual: 'invalid' }, { dark: true, blocked: true }]) {
    const env = environment(options); vm.runInContext(env.api.MENU_THEME_BOOTSTRAP, env.context);
    const expected = ['dark', 'light'].includes(options.manual) ? options.manual : options.dark ? 'dark' : 'light';
    assert.equal(env.attrs.get('data-menu-theme'), expected); assert.equal(env.classes.has('dark'), expected === 'dark');
    assert.equal(env.element.style.colorScheme, expected); assert.equal(env.attrs.has('data-theme'), false);
    assert.equal(env.writes(), 0); assert.equal(env.api.resolveInitialMenuTheme(), expected);
  }
  const admin = environment({ pathname: '/dashboard' }); vm.runInContext(admin.api.MENU_THEME_BOOTSTRAP, admin.context);
  assert.equal(admin.attrs.get('data-theme'), 'light'); assert.equal(admin.attrs.has('data-menu-theme'), false);
  const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
  assert.ok(layout.indexOf('__html: MENU_THEME_BOOTSTRAP') < layout.indexOf('<body'));
});

test('cambio reactivo del SO sin persistir y limpieza al salir de la carta', () => {
  const env = environment({ dark: false }); const changes = [];
  const controller = env.api.createMenuThemeController(theme => changes.push(theme));
  env.change(true); env.change(false);
  assert.deepEqual(changes, ['light', 'dark', 'light']); assert.equal(env.writes(), 0);
  assert.equal(env.listeners.size, 1); controller.dispose(); assert.equal(env.listeners.size, 0);
  assert.equal(env.attrs.get('data-theme'), 'light'); assert.equal(env.attrs.has('data-menu-theme'), false);
  env.change(true); assert.equal(changes.length, 3);
});

test('la elección manual prevalece ante el SO y una nueva carga', () => {
  const env = environment({ dark: false });
  let current;
  const controller = env.api.createMenuThemeController(theme => { current = theme; });
  controller.toggleTheme(); assert.equal(current, 'dark'); assert.equal(env.storage.get('gastropulse_menu_theme'), 'dark');
  env.change(true); env.change(false); assert.equal(current, 'dark');
  controller.dispose();
  const reloaded = env.api.createMenuThemeController(theme => { current = theme; });
  assert.equal(current, 'dark'); env.change(false); assert.equal(current, 'dark');
  reloaded.toggleTheme(); assert.equal(current, 'light'); assert.equal(env.storage.get('gastropulse_menu_theme'), 'light');
  reloaded.dispose();
});

test('Safari antiguo y almacenamiento bloqueado mantienen el cambio manual en memoria', () => {
  const env = environment({ dark: true, legacy: true, blocked: true }); let current;
  const controller = env.api.createMenuThemeController(theme => { current = theme; });
  env.change(false); assert.equal(current, 'light'); controller.setTheme('dark'); env.change(false);
  assert.equal(current, 'dark'); controller.dispose(); assert.equal(env.listeners.size, 0);
});
