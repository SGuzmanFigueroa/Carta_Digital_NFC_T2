import { MenuItem } from '@/types';

export type TemporaryPairingItem = MenuItem & {
  id: `pairing-temp:${string}`;
  isTemporaryPairing: true;
};

export function isTemporaryPairingItem(item: MenuItem): item is TemporaryPairingItem {
  return item.id.startsWith('pairing-temp:');
}

export function resolvePairingItem(
  pairing: string,
  catalog: MenuItem[],
  sourceItemId?: string
): MenuItem | null {
  const name = pairing.trim();
  if (!name) return null;

  const normalizedName = name.toLowerCase();
  const catalogItem = catalog.find(
    (item) =>
      item.id !== sourceItemId &&
      item.name.trim().toLowerCase() === normalizedName
  );
  if (catalogItem) return catalogItem;

  return createTemporaryPairingItem(name);
}

function createTemporaryPairingItem(name: string): TemporaryPairingItem {
  return {
    id: `pairing-temp:${encodeURIComponent(name.toLowerCase())}`,
    isTemporaryPairing: true,
    name,
    description: 'Artículo temporal generado para validar la sugerencia de maridaje.',
    price: 35.00,
    category: 'bebidas',
    image: '',
    rating: 0,
    reviewsCount: 0,
    badge: 'MARIDAJE',
    tag: 'TEMPORAL'
  };
}
