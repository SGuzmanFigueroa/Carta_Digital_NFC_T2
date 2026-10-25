const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.join(__dirname, '..');

function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('React', 'require', 'exports', 'module', source)(React, id => id === 'react' ? React : dependencies[id] ?? {}, module.exports, module);
  return module.exports;
}

const { SplitBillModal } = load('src/components/menu/SplitBillModal.tsx', {
  '@/hooks/useLanguage': { useLanguage: () => ({ language: 'es', t: (key, p) => p?.amount ? `Saldo pendiente: ${p.amount}` : (key === 'splitBill.continue' ? 'Continuar al pago' : key) }) },
  '@/hooks/useDialog': { useDialog: () => ({}) },
  'lucide-react': { Minus: () => null, Plus: () => null, X: () => null },
});

const { CartDrawer } = load('src/components/qr-menu/CartDrawer.tsx', {
  '@/hooks/useLanguage': { useLanguage: () => ({ language: 'es', t: key => key }) },
  '@/hooks/useDialog': { useDialog: () => ({}) },
  './cart': { cartLineKey: item => item.id },
  '@/i18n/menuContent': { localizeMenuItemName: item => item.name },
  '@/i18n/tableLabel': { localizeTableLabel: table => table },
  '../menu/AnimatedSoles': {
    AnimatedSoles: ({ value }) => React.createElement(
      'span',
      { 'data-amount': String(value) },
      `S/ ${Number(value).toFixed(2)}`
    ),
  },
});

function cartDrawerHtml({ amountDue, orderTotal, cart = [{ item: { id: 'lomo', name: 'Lomo Saltado', price: 45 }, quantity: 1 }] }) {
  return renderToStaticMarkup(React.createElement(CartDrawer, {
    isCartOpen: true,
    onClose() {},
    selectedTable: 'MESA 04',
    cart,
    amountDue,
    orderTotal,
    isVerifyingGeofence: false,
    activeNoteItemId: {},
    setActiveNoteItemId() {},
    onAddToCart() {},
    onRemoveFromCart() {},
    onUpdateNotes() {},
    onSendOrder() {},
    onOpenSplitBill() {},
  }));
}

test('SplitBillModal divide el saldo pendiente de la mesa, no el total original de los platos', () => {
  const html = renderToStaticMarkup(React.createElement(SplitBillModal, {
    isOpen: true,
    amountDue: 22.5,
    // Los platos suman 45: ya se abonaron 22.50 antes. No deben imponer el cobro.
    items: [{ id: 'lomo', name: 'Lomo Saltado', quantity: 1, price: 45 }],
    onClose() {},
    onConfirm() {},
  }));

  assert.ok(html.includes('Saldo pendiente: S/ 22.50'), 'El encabezado debe mostrar el saldo pendiente');
  assert.ok(html.includes('S/ 22.50'), 'El monto a pagar debe ser el saldo pendiente');
  assert.ok(!html.includes('S/ 45.00'), 'Nunca debe cobrar el total original por encima del saldo');
});

test('SplitBillModal deshabilita el cobro cuando no hay saldo pendiente', () => {
  const html = renderToStaticMarkup(React.createElement(SplitBillModal, {
    isOpen: true,
    amountDue: 0,
    items: [],
    onClose() {},
    onConfirm() {},
  }));

  assert.ok(html.includes('Saldo pendiente: S/ 0.00'));
  assert.match(html, /<button[^>]*disabled=""[^>]*>Continuar al pago<\/button>/);
});

test('CartDrawer muestra Abonos Previos y Saldo Pendiente cuando la mesa ya fue abonada', () => {
  const html = cartDrawerHtml({ amountDue: 22.5, orderTotal: 45, cart: [] });

  assert.ok(html.includes('cart.orderTotal'), 'Debe mostrar el total original de los platos');
  assert.ok(html.includes('cart.previousPayments'), 'Debe mostrar la fila de abonos previos');
  assert.ok(html.includes('cart.pendingBalance'), 'El rótulo final debe ser Saldo Pendiente');
  assert.ok(!html.includes('cart.totalToPay'), 'No debe rotular el saldo como Total a Pagar');
  assert.ok(html.includes('data-amount="45"'), 'Debe mostrar el total original (45.00)');
  assert.ok(html.includes('data-amount="22.5"'), 'Debe mostrar lo que ya se abonó y el saldo (22.50)');
});

test('CartDrawer mantiene Total a Pagar cuando no hay abonos previos', () => {
  const html = cartDrawerHtml({ amountDue: 45, orderTotal: 45 });

  assert.ok(html.includes('cart.totalToPay'), 'Sin abonos, el rótulo sigue siendo Total a Pagar');
  assert.ok(!html.includes('cart.previousPayments'), 'No debe inventar una fila de abonos');
  assert.ok(!html.includes('cart.pendingBalance'), 'No debe cambiar el rótulo sin abonos');
  assert.ok(html.includes('data-amount="45"'));
});

test('CartDrawer ignores historical table balance while the local cart has new dishes', () => {
  const html = cartDrawerHtml({ amountDue: 45, orderTotal: 45 });

  assert.ok(html.includes('cart.totalToPay'), 'A new local cart must use its own total');
  assert.ok(!html.includes('cart.previousPayments'), 'A historical balance cannot fabricate previous payments');
  assert.ok(!html.includes('cart.pendingBalance'));
  assert.ok(html.includes('data-amount="45"'));
  assert.ok(!html.includes('data-amount="35"'));
});

test('updateTableStateInDb encuentra mesas con formato "Mesa 04" y persiste el saldo restante', async () => {
  const updates = [];
  const supabase = {
    from(table) {
      assert.equal(table, 'restaurant_tables');
      return {
        select: async () => ({ data: [{ id: 'm-04', number: 'Mesa 04' }], error: null }),
        update: payload => ({
          in: async (column, ids) => {
            updates.push({ payload, column, ids });
            return { error: null };
          },
        }),
      };
    },
  };
  const { updateTableStateInDb } = load('src/services/tableService.ts', {
    '@/lib/supabase': { supabase },
    '@/data/mockData': { INITIAL_TABLES: [] },
  });

  const saved = await updateTableStateInDb('Mesa 04', { amount: 22.5 });

  assert.equal(saved, true);
  assert.deepEqual(updates, [{
    payload: { amount: 22.5, updated_at: updates[0].payload.updated_at },
    column: 'id',
    ids: ['m-04'],
  }]);
  assert.equal(typeof updates[0].payload.updated_at, 'string');
});
