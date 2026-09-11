import { smallestRegionAt } from './geo';
import type { WorldIndex } from './catalog';
import type { Region } from './types';

const KIND_RANK: Record<Region['kind'], number> = {
  city: 0,
  admin1: 1,
  country: 2,
  district: 3,
  street: 4,
};

function fields(region: Region): string[] {
  const out = [region.name, region.nameLocal, region.iso2, region.iso3166_2, region.id].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  const colon = region.id.lastIndexOf(':');
  if (colon >= 0) out.push(region.id.slice(colon + 1));
  return out;
}

export function findOrigin(index: WorldIndex, query: string): Region | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  let best: Region | null = null;
  let bestScore = 1e9;

  for (const region of index.catalog.regions) {
    const kind = KIND_RANK[region.kind] ?? 9;
    let match = 3;
    for (const field of fields(region)) {
      if (!field) continue;
      const n = field.toLowerCase();
      if (n === q) {
        match = 0;
        break;
      }
      if (match > 1 && n.startsWith(q)) match = 1;
      else if (match > 2 && q.length >= 2 && n.includes(q)) match = 2;
    }
    if (match > 2) continue;
    const score = match * 10 + kind;
    if (score < bestScore || (score === bestScore && (best === null || region.name.length < best.name.length))) {
      best = region;
      bestScore = score;
    }
  }

  return best;
}

export function originFromLonLat(index: WorldIndex, lon: number, lat: number): Region | null {
  const point = { lon, lat };
  const regions = index.catalog.regions;
  return (
    smallestRegionAt(point, regions, new Set(['city'])) ??
    smallestRegionAt(point, regions, new Set(['admin1'])) ??
    smallestRegionAt(point, regions, new Set(['country']))
  );
}

export function countryOf(index: WorldIndex, region: Region): Region {
  let current: Region | undefined = region;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.kind === 'country') return current;
    current = current.parentId ? index.byId.get(current.parentId) : undefined;
  }
  return region;
}
