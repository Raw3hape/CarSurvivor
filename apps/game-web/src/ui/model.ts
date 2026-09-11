export function kindLabel(kind: string): string {
  switch (kind) {
    case 'country':
      return 'страна';
    case 'admin1':
      return 'провинция';
    case 'city':
      return 'город';
    case 'district':
      return 'район';
    case 'street':
      return 'улица';
    default:
      return kind;
  }
}

export function formatArea(km2: number): string {
  if (!Number.isFinite(km2) || km2 <= 0) return '—';
  if (km2 < 0.1) return `${formatDecimal(km2, 2)}\u00a0км²`;
  if (km2 < 10) return `${formatDecimal(km2, 1)}\u00a0км²`;
  if (km2 < 1_000_000) {
    return `${Math.round(km2).toLocaleString('ru-RU')}\u00a0км²`;
  }
  const millions = km2 / 1_000_000;
  return `${formatDecimal(millions, 1)}\u00a0млн км²`;
}

export function formatPaint(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  if (abs === 0) return '0';
  if (abs < 0.01) return `${sign}${abs.toFixed(3).replace('.', ',')}`;
  if (abs < 1) return `${sign}${formatDecimal(abs, 2)}`;
  if (abs < 100) return `${sign}${formatDecimal(abs, 1)}`;
  if (abs < 1_000_000) return `${sign}${Math.round(abs).toLocaleString('ru-RU')}`;
  return `${sign}${formatDecimal(abs / 1_000_000, 1)}\u00a0млн`;
}

function formatDecimal(n: number, digits: number): string {
  return n
    .toFixed(digits)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
    .replace('.', ',');
}
