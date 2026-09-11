import type { FlagVisual, Region } from './types';

export function isoFromFlag(flag: FlagVisual | undefined, region?: Pick<Region, 'iso2'>): string | null {
  const fromRegion = region?.iso2?.toLowerCase();
  if (fromRegion && /^[a-z]{2}$/.test(fromRegion)) return fromRegion;
  const id = flag?.id ?? '';
  const match = /^flag:([a-z]{2})$/.exec(id);
  return match?.[1] ?? null;
}

export function flagPngUrl(iso: string, width: 80 | 160 | 320 = 320): string {
  return `https://flagcdn.com/w${width}/${iso}.png`;
}
