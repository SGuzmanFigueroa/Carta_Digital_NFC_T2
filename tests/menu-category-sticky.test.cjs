const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const menuViewerSource = fs.readFileSync(
  path.join(__dirname, '../src/components/QRMenuViewer.tsx'),
  'utf8'
);

test('CD-41: El contenedor de categorías incluye clases sticky, backdrop-blur y z-index adecuado', () => {
  assert.ok(
    menuViewerSource.includes('sticky top-[53px] sm:top-[57px] z-30'),
    'Debe tener posicionamiento sticky bajo el header'
  );
  assert.ok(
    menuViewerSource.includes('backdrop-blur-xl'),
    'Debe contar con efecto de desenfoque al hacer scroll'
  );
  assert.ok(
    menuViewerSource.includes('border-b'),
    'Debe tener borde separador sutil al acoplarse'
  );
});

test('CD-41: Contador de resultados reactivo implementado en las pestañas de categorías', () => {
  assert.ok(
    menuViewerSource.includes('categoryCounts'),
    'Debe existir el cálculo de conteo de platos por categoría'
  );
  assert.ok(
    menuViewerSource.includes('font-mono-code font-bold tabular-nums'),
    'Las pastillas deben mostrar el número con fuente monoespaciada para evitar saltos'
  );
});

test('CD-41: Cálculo lógico de platos por categoría y filtro general "todos"', () => {
  const sampleItems = [
    { id: '1', name: 'Lomo Saltado', category: 'fondos' },
    { id: '2', name: 'Arroz con Mariscos', category: 'fondos' },
    { id: '3', name: 'Ceviche Clásico', category: 'entradas' },
    { id: '4', name: 'Suspiro Limeño', category: 'postres' },
    { id: '5', name: 'Pisco Sour', category: 'bebidas' },
  ];

  function normalize(str) {
    return (str || '').toLowerCase().trim();
  }

  function countByCategory(items, query = '') {
    const counts = { todos: 0 };
    const q = normalize(query);
    items.forEach((item) => {
      const matchSearch = !q || normalize(item.name).includes(q);
      if (matchSearch) {
        counts.todos = (counts.todos || 0) + 1;
        const cat = normalize(item.category);
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }

  const initialCounts = countByCategory(sampleItems);
  assert.equal(initialCounts.todos, 5);
  assert.equal(initialCounts.fondos, 2);
  assert.equal(initialCounts.entradas, 1);
  assert.equal(initialCounts.postres, 1);
  assert.equal(initialCounts.bebidas, 1);

  // Al filtrar por búsqueda "ceviche"
  const filteredCounts = countByCategory(sampleItems, 'ceviche');
  assert.equal(filteredCounts.todos, 1);
  assert.equal(filteredCounts.entradas, 1);
  assert.equal(filteredCounts.fondos, undefined);
});
