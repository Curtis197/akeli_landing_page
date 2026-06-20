const COUNTABLE_UNITS = new Set([
  'unit', 'piece', 'clove', 'bunch', 'can', 'pot', 'tsp', 'tbsp', 'pinch',
]);

const UNIT_TRANSLATIONS: Record<string, string> = {
  'clove': 'gousse',
  'bunch': 'botte',
  'can': 'boîte',
  'pot': 'pot',
  'tsp': 'c.à.c',
  'tbsp': 'c.à.s',
  'pinch': 'pincée',
  'unit': '',
  'piece': '',
};

const FRACTION_MAP: { key: number; value: string }[] = [
  { key: 0.25, value: '1/4' },
  { key: 0.333, value: '1/3' },
  { key: 0.5, value: '1/2' },
  { key: 0.667, value: '2/3' },
  { key: 0.75, value: '3/4' },
];

/**
 * Format a scaled ingredient quantity for display.
 * Modeled after the Flutter app's quantity_formatter.dart.
 */
export function formatQuantity(qty: number | null, unit: string | null): string {
  if (qty === null || qty === undefined || qty === 0) return '';
  const unitStr = unit || '';
  const isPlural = qty > 1;
  let translatedUnit = UNIT_TRANSLATIONS[unitStr] ?? unitStr;

  if (isPlural && ['gousse', 'botte', 'boîte', 'pot', 'pincée'].includes(translatedUnit)) {
    translatedUnit += 's';
  }

  if (!COUNTABLE_UNITS.has(unitStr)) {
    if (qty % 1 === 0) return `${Math.floor(qty)} ${translatedUnit}`.trim();
    return `${qty.toFixed(1)} ${translatedUnit}`.trim();
  }

  const suffix = translatedUnit === '' ? '' : ` ${translatedUnit}`;
  const whole = Math.floor(qty);
  const decimal = qty - whole;

  if (decimal < 0.01) return `${whole}${suffix}`.trim();

  const entry = FRACTION_MAP.find((e) => Math.abs(e.key - decimal) < 0.01);
  const fractionStr = entry ? entry.value : decimal.toFixed(2);

  if (whole === 0) return `${fractionStr}${suffix}`.trim();
  return `${whole} ${fractionStr}${suffix}`.trim();
}
