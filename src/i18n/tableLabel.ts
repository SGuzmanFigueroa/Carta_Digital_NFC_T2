/**
 * GastroPulse OS · CD-31
 * Rótulos de MESA / ZONA del comensal (ES ↔ EN).
 *
 * ¿Por qué un módulo aparte?
 *  - El identificador de mesa es un DATO de la BD (`restaurant_tables.number` = "Mesa 01")
 *    que viaja por pedidos, KDS, pagos y reseñas. Ese valor NUNCA debe cambiar de idioma:
 *    es la clave con la que cocina y sala casan la comanda.
 *  - La CARA VISIBLE del mismo dato sí se traduce: "Mesa 04" → "Table 04", "Barra B1" →
 *    "Bar B1", "Terraza T1" → "Terrace T1".
 *
 * Reglas de normalización (tolerante a los datos reales del proyecto):
 *  - Acepta el prefijo en cualquiera de los dos idiomas ("MESA", "Mesa", "Table", ...).
 *  - Colapsa prefijos duplicados ("MESA Mesa 01" → "Table 01").
 *  - Sin prefijo de zona: sólo se rotula como mesa si el valor ES un número ("4" → "Table 04").
 *    Cualquier otro texto ("Para llevar", "Delivery") se devuelve intacto.
 */

import { translate, type MenuLanguage, type TranslationKey } from './translations';

/** Zonas soportadas por los rótulos de mesa. */
type TableZone = 'table' | 'bar' | 'terrace';

/** Clave de diccionario que rotula cada zona (el `{number}` lo aporta el valor). */
const ZONE_LABEL_KEYS: Record<TableZone, TranslationKey> = {
  table: 'table.label',
  bar: 'table.barLabel',
  terrace: 'table.terraceLabel'
};

/** Palabras de zona reconocidas (ES y EN) → zona canónica. */
const ZONE_WORDS: Record<string, TableZone> = {
  mesa: 'table',
  table: 'table',
  barra: 'bar',
  bar: 'bar',
  terraza: 'terrace',
  terrace: 'terrace'
};

/** Prefijo de zona + separadores habituales ("MESA ", "Mesa: ", "Barra-"). */
const ZONE_PREFIX = /^(mesa|table|terraza|terrace|barra|bar)\b[\s.:\-–—]*/i;

/**
 * Traduce la etiqueta visible de una mesa conservando su identificador.
 *
 * @param raw      Valor tal como llega de la BD/QR ("Mesa 01", "MESA 04", "BARRA B1").
 * @param language Idioma activo de la carta del comensal.
 * @returns Rótulo localizado ("Mesa 04" / "Table 04", "Barra B1" / "Bar B1").
 */
export function localizeTableLabel(raw: string | null | undefined, language: MenuLanguage): string {
  const value = (raw ?? '').trim();
  if (!value) return value;

  let rest = value;
  let zone: TableZone = 'table';
  let zoneDetected = false;

  // 1) Consumir el prefijo de zona (repetido en bucle por si llegó duplicado).
  for (let i = 0; i < 3; i++) {
    const match = rest.match(ZONE_PREFIX);
    if (!match) break;
    const detected = ZONE_WORDS[match[1].toLowerCase()];
    if (!detected) break;
    if (!zoneDetected) {
      zone = detected;
      zoneDetected = true;
    }
    rest = rest.slice(match[0].length).trim();
  }

  // 2) Sin prefijo reconocible: sólo se rotula si es un número de mesa suelto ("4").
  if (!zoneDetected && !/^\d+$/.test(value)) return value;

  // 3) Rótulo localizado; si no queda número, se devuelve la sola palabra ("Mesa"/"Table").
  return translate(language, ZONE_LABEL_KEYS[zone], { number: rest }).trim();
}
