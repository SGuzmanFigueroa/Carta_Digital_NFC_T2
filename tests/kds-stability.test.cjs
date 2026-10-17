const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vm = require('node:vm');
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const root = path.join(__dirname, '..');
function load(file, dependencies = {}, globals = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, React, require: id => id === 'react' ? React : dependencies[id] ?? {}, ...globals });
  return module.exports;
}

function audioEnvironment({ reject = false, unsupported = false, constructorFails = false } = {}) {
  const stats = { resumes: 0, oscillators: 0, stops: 0, contexts: [] };
  class AudioContext {
    state = 'suspended'; currentTime = 0; destination = {};
    constructor() { if (constructorFails) throw Error('blocked'); stats.contexts.push(this); }
    resume() { stats.resumes++; if (reject) return Promise.reject(Error('autoplay blocked')); this.state = 'running'; return Promise.resolve(); }
    createOscillator() { stats.oscillators++; return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() { stats.stops++; } }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  }
  const listeners = new Map();
  const document = { addEventListener(type, fn) { listeners.set(type, fn); }, removeEventListener(type) { listeners.delete(type); } };
  const api = load('src/utils/audio.ts', {}, { window: unsupported ? {} : { AudioContext }, document });
  return { ...api, stats, listeners };
}

test('audio: desbloquea por gesto, conserva los sonidos y respeta silencio', async () => {
  const { kitchenAudio: audio, stats } = audioEnvironment();
  assert.equal(audio.isReady, false); assert.equal(await audio.prepareForPlayback(), true);
  assert.equal(audio.isReady, true); assert.equal(stats.resumes, 1);
  await audio.prepareForPlayback(); assert.equal(stats.resumes, 1);
  audio.playDispatchSound(); assert.equal(stats.oscillators, 3); assert.equal(stats.stops, 3);
  audio.playCheckItemSound(); audio.playRunnerAlertSound(); audio.playReadyBell(); audio.playWaiterCallChime(); audio.playAllergyWarning();
  assert.equal(stats.oscillators, 10);
  audio.enabled = false;
  audio.playDispatchSound(); audio.playCheckItemSound(); audio.playRunnerAlertSound(); audio.playReadyBell(); audio.playWaiterCallChime(); audio.playAllergyWarning();
  assert.equal(stats.oscillators, 10); assert.equal(await audio.prepareForPlayback(), true); assert.equal(audio.enabled, false);
  stats.contexts[0].state = 'closed'; await audio.prepareForPlayback(); assert.equal(stats.contexts.length, 2);
});

test('audio: errores de permisos o API ausente no crean promesas rechazadas sin manejar', async () => {
  for (const options of [{ reject: true }, { unsupported: true }, { constructorFails: true }]) {
    const { kitchenAudio: audio } = audioEnvironment(options);
    assert.equal(await audio.prepareForPlayback(), false);
    assert.doesNotThrow(() => audio.playDispatchSound());
    await new Promise(setImmediate); assert.equal(audio.isReady, false);
  }
});

test('banner: no se oculta con gestos sintéticos ni permisos rechazados; reintenta y limpia listeners', async () => {
  const { bindKitchenAudioUnlock, listeners } = audioEnvironment();
  let allowed = false, ready, calls = 0;
  const cleanup = bindKitchenAudioUnlock(value => { ready = value; }, {
    isReady: false, async prepareForPlayback() { calls++; return allowed; },
  });
  assert.equal(ready, false);
  listeners.get('click')({ isTrusted: false }); assert.equal(calls, 0);
  listeners.get('click')({ isTrusted: true }); await new Promise(setImmediate);
  assert.equal(ready, false); assert.equal(listeners.size, 3);
  allowed = true; listeners.get('pointerup')({ isTrusted: true }); await new Promise(setImmediate);
  assert.equal(ready, true); assert.equal(listeners.size, 0); cleanup();
  let resolve;
  const lateCleanup = bindKitchenAudioUnlock(() => {}, { isReady: false, prepareForPlayback: () => new Promise(done => { resolve = done; }) });
  listeners.get('keydown')({ isTrusted: true }); lateCleanup(); resolve(true); await new Promise(setImmediate);
  assert.equal(listeners.size, 0);
});

test('previa: borrador vacío, plato ausente y descuento inválido muestran ejemplo sin modificar el formulario', () => {
  const promo = load('src/utils/promo.ts');
  const offers = load('src/utils/promoOffers.ts', { '@/utils/promo': promo });
  const preview = load('src/utils/promoPreview.ts', { '@/utils/promoOffers': offers });
  const dish = { id: 'real-dish', name: 'Plato real', price: 60, category: 'fondos', image: '/logo.png', description: 'Descripción real' };
  const form = { ...offers.createInitialOfferForm(), mainDishId: dish.id, isRecurring: true };
  for (const [draft, main, complement] of [
    [offers.createInitialOfferForm(), null, null],
    [{ ...form, mainDishId: '' }, dish, null],
    [{ ...form, discountValue: '' }, dish, null],
    [{ ...form, discountValue: 'NaN' }, dish, null],
    [{ ...form, mechanic: 'combo', complementaryDishId: 'missing' }, dish, null],
    [form, { ...dish, price: NaN }, null],
    [form, null, null],
  ]) {
    const before = JSON.stringify(draft);
    const data = preview.buildSafePromoPreview(draft, main, complement);
    assert.equal(data.isExample, true); assert.equal(data.deals[0].name, 'Plato de ejemplo');
    assert.equal(data.pricing.originalPrice, 40); assert.equal(data.pricing.promoPrice, 34);
    assert.equal(JSON.stringify(draft), before);
  }
  for (const mechanic of ['discount', 'two_for_one', 'combo', 'second_unit']) {
    const draft = { ...form, mechanic, complementaryDishId: dish.id };
    const actual = preview.buildSafePromoPreview(draft, dish, dish);
    const totals = offers.calculateDraftOfferTotals(draft, dish, dish);
    assert.equal(actual.isExample, false);
    assert.equal(actual.pricing.promoPrice, totals.precioFinalTotal);
    assert.equal(actual.pricing.originalPrice, totals.precioOriginalTotal);
  }
});

test('SVG: área con margen, trazo sin deformación y tres etiquetas alineadas sin escalado tipográfico', () => {
  const { PassVelocityChart } = load('src/components/PassVelocityChart.tsx');
  const html = renderToStaticMarkup(React.createElement(PassVelocityChart));
  assert.ok(html.includes('viewBox="0 0 320 110"'));
  assert.ok(html.includes('non-scaling-stroke')); assert.ok(html.includes('grid-cols-3'));
  for (const time of ['14:00', '14:30', '14:48']) assert.ok(html.includes(`<time>${time}</time>`));
  for (const file of ['src/components/KDSBoard.tsx', 'src/components/PromoOffersManager.tsx', 'src/components/PassVelocityChart.tsx', 'src/utils/audio.ts', 'src/utils/promoPreview.ts']) {
    assert.equal(/\p{Extended_Pictographic}/u.test(fs.readFileSync(path.join(root, file), 'utf8')), false, file);
  }
});
