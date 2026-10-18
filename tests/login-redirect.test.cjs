const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vm = require('node:vm'), React = require('react');
const root = path.join(__dirname, '..');
function load(file, dependencies = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { URL, URLSearchParams, module, exports: module.exports,
    require: id => dependencies[id] ?? (id === 'react' ? React : {}), ...globals });
  return module.exports;
}
const validator = load('src/utils/loginRedirect.ts');
const safe = validator.getSafeLoginRedirect;
const attacks = [undefined, null, 4, {}, '', '/', '//evil.com', '/\\evil.com', '\\evil.com',
  'https://evil.com', 'http://evil.com', '/https://evil.com', '/pedidos?next=HTTPS://evil.com',
  'javascript:alert(1)', ' /pedidos', '/pedidos ', '/\nevil.com', '/\tevil.com', '/a\u0000',
  '/%2Fevil.com', '/%5Cevil.com', '/%252Fevil.com', '/a/%255cevil.com', '/a/..//evil.com',
  '/a/..%2f..%2f%2fevil.com', '/pedidos?next=https%3A%2F%2Fevil.com', '/%0devil.com',
  '/a%00', '/a%7f', '/a%', '/a%GG', '/.evil.com', '/_evil', '/-evil', '/a\u2028',
  '/a'.repeat(1100), '/\\\\evil.com', '///evil.com'];

test('redirección estricta: rechaza hosts, protocolos, escapes, controles y normalización peligrosa', () => {
  attacks.forEach(value => assert.equal(safe(value), '/dashboard', JSON.stringify(value)));
  for (const destination of ['/pedidos', '/dashboard', '/kds', '/configuracion#ofertas', '/pedidos?mesa=04&estado=pending', '/orders/abc-123_4', '/123']) {
    assert.equal(safe(destination), destination);
    assert.equal(new URL(safe(destination), 'https://restaurant.example').origin, 'https://restaurant.example');
  }
  for (const prefix of ['//', '/\\', '/%2f', '/%5c', '/%252f', '/%255c']) {
    for (const host of ['evil.com', 'user@evil.com', 'evil.com:443', 'evil.com/path']) {
      const value = new URLSearchParams('redirect=' + encodeURIComponent(prefix + host)).get('redirect');
      assert.equal(safe(value), '/dashboard');
    }
  }
});

test('servicio y página: se valida el parámetro decodificado; ausencia conserva navegación por rol', () => {
  const service = load('src/services/authService.ts', { '@/utils/loginRedirect': validator });
  assert.equal(service.getSafeLoginRedirect('/\\evil.com'), '/dashboard');
  const LoginScreen = () => null;
  const react = { ...React, useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useEffect() {} };
  for (const [query, expected] of [['redirect=%2F%5Cevil.com', '/dashboard'], ['redirect=%2F%2Fevil.com', '/dashboard'], ['redirect=/pedidos', '/pedidos'], ['redirect=', '/dashboard'], ['', undefined]]) {
    const page = load('src/app/(auth)/login/page.tsx', { react,
      'next/navigation': { useRouter: () => ({}), useSearchParams: () => new URLSearchParams(query) },
      '@/components/LoginScreen': { LoginScreen }, '@/data/mockData': { INITIAL_STAFF: [] },
      '@/services/authService': { getSafeLoginRedirect: safe },
    });
    const contentElement = page.default().props.children;
    const rendered = contentElement.type();
    assert.equal(rendered.props.children[0].props.redirectTo, expected);
  }
});

function findDemoButton(node, name) {
  if (Array.isArray(node)) return node.map(child => findDemoButton(child, name)).find(Boolean);
  if (!node?.props) return null;
  const text = value => Array.isArray(value) ? value.map(text).join(' ') : typeof value === 'object' && value ? text(value.props?.children) : String(value ?? '');
  if (node.type === 'button' && text(node.props.children).includes(name)) return node;
  return findDemoButton(node.props.children, name);
}

test('navegación real del componente: valida de nuevo un redirectTo recibido directamente', () => {
  const staff = [{ id: 'test-admin', name: 'Administrador de prueba', role: 'admin', roleTitle: 'Administrador', username: 'test-admin', pin: '1234' }];
  const react = { ...React, useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useEffect() {} };
  for (const [redirectTo, expected] of [['/\\evil.com', '/dashboard'], ['//evil.com', '/dashboard'], ['https://evil.com', '/dashboard'], ['', '/dashboard'], ['/pedidos', '/pedidos'], [undefined, '/dashboard']]) {
    let destination;
    const component = load('src/components/LoginScreen.tsx', { react,
      'next/navigation': { useRouter: () => ({ replace(value) { destination = value; } }) },
      '../services/authService': { getSafeLoginRedirect: safe },
      '../utils/security': { setAuthSessionCookie() {}, AuditLogger: { log() {} } },
      '../data/mockData': { INITIAL_STAFF: staff },
    }, { localStorage: { setItem() {} } });
    const tree = component.LoginScreen({ staffList: staff, onLoginSuccess() {}, onExploreAsGuest() {}, onShowToast() {}, redirectTo });
    const button = findDemoButton(tree, 'Admin / Gerente');
    assert.ok(button); button.props.onClick();
    assert.equal(destination, expected);
  }
});
