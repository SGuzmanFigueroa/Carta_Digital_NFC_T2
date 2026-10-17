const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.join(__dirname, '..');
function load(file, dependencies = {}, react = React) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('React', 'require', 'exports', 'module', source)(react, id => id === 'react' ? react : dependencies[id] ?? {}, module.exports, module);
  return module.exports;
}
const filters = load('src/features/orders/paymentFilter.ts');
const order = (id, paymentStatus = 'pending', status = 'entregado') => ({ id, paymentStatus, status,
  table: 'Mesa 04', pax: 2, timeAgo: 'En vivo', createdTime: '12:00', origin: 'GARZÓN', subtotal: 15, total: 15,
  items: [{ id: 'item-' + id, name: 'Plato ' + id, quantity: 1, price: 15, station: 'wok' }] });

test('entregado no significa pagado; cobro, pedido nuevo y mesa reutilizada actualizan filtros y contadores', () => {
  const delivered = order('delivered'); delete delivered.paymentStatus;
  const unpaid = order('unpaid', 'pending', 'en-cocina');
  const cancelled = order('cancelled', 'pending', 'cancelado');
  let merged = filters.mergePaymentOrders([delivered, unpaid, cancelled], []);
  assert.deepEqual(filters.paymentFilterCounts(merged), { all: 2, pending: 2, paid: 0 });
  const paid = order('unpaid', 'paid');
  merged = filters.mergePaymentOrders([delivered, unpaid], [paid]);
  assert.deepEqual(filters.paymentFilterCounts(merged), { all: 2, pending: 1, paid: 1 });
  assert.deepEqual(filters.filterOrdersByPayment(merged, 'paid').map(o => o.id), ['unpaid']);
  const newRound = order('new-round', 'pending', 'por-validar');
  merged = filters.mergePaymentOrders([newRound, delivered, unpaid], [paid]);
  assert.deepEqual(filters.paymentFilterCounts(merged), { all: 3, pending: 2, paid: 1 });
  assert.deepEqual(filters.filterOrdersByPayment(merged, 'pending').map(o => o.id), ['new-round', 'delivered']);
});

function fakeDatabase(orders, items = []) {
  const calls = [];
  const db = { from(table) {
    const actions = []; const query = { select() { return query; },
      eq(key, value) { actions.push(['eq', key, value]); return query; },
      neq(key, value) { actions.push(['neq', key, value]); return query; },
      in(key, values) { actions.push(['in', key, values]); return query; },
      order() { return query; }, range(start, end) { actions.push(['range', start, end]); return query; },
      then(resolve, reject) {
        calls.push({ table, actions });
        let data = table === 'orders' ? orders : items;
        for (const [op, key, value] of actions) {
          if (op === 'eq') data = data.filter(row => row[key] === value);
          if (op === 'neq') data = data.filter(row => row[key] !== value);
          if (op === 'in') data = data.filter(row => value.includes(row[key]));
          if (op === 'range') data = data.slice(key, value + 1);
        }
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      } }; return query;
    } };
  return { db, calls };
}

test('orderService conserva consulta activa y carga historial paginado con paymentStatus derivado', async () => {
  const rows = Array.from({ length: 501 }, (_, i) => ({ id: 'paid-' + i, status: 'cobrado', table_number: 'Mesa 04',
    created_at: '2026-10-13T15:00:00Z', subtotal: 15, total: 15 }));
  rows.push({ ...rows[0], id: 'active', status: 'entregado' });
  const { db, calls } = fakeDatabase(rows, [{ id: 'i1', order_id: 'paid-0', name: 'Plato', quantity: 2, price: 15 }]);
  const service = load('src/services/orderService.ts', { '@/lib/supabase': { supabase: db } });
  const active = await service.fetchOrdersFromDb();
  assert.equal(active.length, 1); assert.equal(active[0].paymentStatus, 'pending');
  assert.ok(calls[0].actions.some(a => a[0] === 'neq' && a[2] === 'cobrado'));
  const paid = await service.fetchOrdersFromDb({ paymentStatus: 'paid', throwOnError: true });
  assert.equal(paid.length, 501); assert.equal(paid[0].paymentStatus, 'paid'); assert.equal(paid[0].status, 'entregado');
  assert.equal(paid[0].items[0].quantity, 2);
  assert.ok(calls.some(c => c.table === 'orders' && c.actions.some(a => a[0] === 'range' && a[1] === 500)));
  const failing = load('src/services/orderService.ts', { '@/lib/supabase': { supabase: {
    from() { const query = { select: () => query, order: () => query, eq: () => query, range: () => query,
      then: resolve => Promise.resolve({ data: null, error: Error('unavailable') }).then(resolve) }; return query; },
  } } });
  await assert.rejects(failing.fetchOrdersFromDb({ paymentStatus: 'paid', throwOnError: true }), /unavailable/);
});

test('panel: pastillas accesibles y detalle restringido a la selección, sin acciones de cocina para pagadas', () => {
  const pills = load('src/components/OrderPaymentFilters.tsx');
  for (const filter of ['all', 'pending', 'paid']) {
    let stateIndex = 0;
    const hookReact = { ...React, useState(initial) {
      const index = stateIndex++;
      return [index === 7 ? filter : initial, () => {}];
    } };
    const panel = load('src/components/OrdersCentral.tsx', {
      '@/components/OrderPaymentFilters': pills, '@/features/orders/paymentFilter': filters,
      '@/hooks/useDialog': { useDialog: () => ({}) },
    }, hookReact);
    const html = renderToStaticMarkup(panel.OrdersCentral({ orders: [order('pending', 'pending', 'en-cocina'), order('paid', 'paid')],
      onUpdateOrderStatus() {}, onShowToast() {} }));
    assert.ok(html.includes('Filtrar comandas por estado de cuenta'));
    assert.ok(html.includes('Por Cobrar / En Consumo'));
    if (filter === 'paid') {
      assert.ok(html.includes('ID: #paid')); assert.ok(!html.includes('ID: #pending'));
      assert.ok(!html.includes('Marcar Entregado a Mesa'));
    }
    if (filter === 'pending') { assert.ok(html.includes('ID: #pending')); assert.ok(!html.includes('Ver comanda paid')); }
  }
  let stateIndex = 0;
  const panel = load('src/components/OrdersCentral.tsx', { '@/components/OrderPaymentFilters': pills, '@/features/orders/paymentFilter': filters, '@/hooks/useDialog': { useDialog: () => ({}) } },
    { ...React, useState(initial) { return [stateIndex++ === 7 ? 'paid' : initial, () => {}]; } });
  const empty = renderToStaticMarkup(panel.OrdersCentral({ orders: [order('pending')], onUpdateOrderStatus() {}, onShowToast() {} }));
  assert.ok(empty.includes('No hay comandas que coincidan')); assert.ok(!empty.includes('Inspección de Ticket'));
});

test('historial: actualización por evento y limpieza independiente del canal core', async () => {
  let effect, cleanup, change, subscribed, removed = false;
  let databaseRows = [order('paid', 'paid')];
  const states = []; let stateIndex = 0;
  const react = { ...React, useState(initial) { const index = stateIndex++; states[index] = initial; return [initial, value => { states[index] = value; }]; },
    useEffect(fn) { effect = fn; } };
  const channel = { on(event, binding, callback) { assert.equal(binding.table, 'orders'); change = callback; return channel; },
    subscribe(fn) { subscribed = fn; return channel; } };
  const oldDocument = global.document, oldWindow = global.window;
  const { webcrypto } = require('node:crypto'); const oldCrypto = global.crypto;
  Object.defineProperty(global, 'crypto', { value: webcrypto, configurable: true });
  global.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  global.window = { addEventListener() {}, removeEventListener() {} };
  const hook = load('src/hooks/usePaidOrderHistory.ts', {
    '@/lib/supabase': { supabase: { channel(name) { assert.match(name, /^orders-payment-history-/); return channel; }, removeChannel() { removed = true; } } },
    '@/services/orderService': { async fetchOrdersFromDb(options) { assert.equal(options.paymentStatus, 'paid'); return databaseRows; } },
  }, react);
  try {
    hook.usePaidOrderHistory(); cleanup = effect();
    await new Promise(setImmediate); assert.equal(states[0].length, 1);
    databaseRows = [...databaseRows, order('new-paid', 'paid')]; change();
    await new Promise(setImmediate); assert.equal(states[0].length, 2);
    subscribed('SUBSCRIBED'); await new Promise(setImmediate);
    cleanup(); assert.equal(removed, true);
    databaseRows = []; change(); await new Promise(setImmediate); assert.equal(states[0].length, 2);
  } finally {
    global.document = oldDocument; global.window = oldWindow;
    Object.defineProperty(global, 'crypto', { value: oldCrypto, configurable: true });
  }
});
