import { afterEach, describe, expect, it, vi } from 'vitest';
import { indexWorld, loadWorld, regionFact, regionFlag, type WorldIndex } from './catalog';
import { findOrigin, originFromLonLat } from './origin';
import type { LonLat, Region, WorldCatalog } from './types';

function box(w: number, s: number, e: number, n: number): LonLat[] {
  return [
    { lon: w, lat: s },
    { lon: e, lat: s },
    { lon: e, lat: n },
    { lon: w, lat: n },
    { lon: w, lat: s },
  ];
}

function polyRegion(
  partial: Omit<Region, 'geom' | 'bbox' | 'centroid' | 'neighborIds' | 'areaKm2'> & {
    w: number;
    s: number;
    e: number;
    n: number;
    areaKm2: number;
    neighborIds?: string[];
  },
): Region {
  const { w, s, e, n, neighborIds = [], ...rest } = partial;
  return {
    ...rest,
    areaKm2: partial.areaKm2,
    centroid: { lon: (w + e) / 2, lat: (s + n) / 2 },
    bbox: [w, s, e, n],
    neighborIds,
    geom: { polygons: [{ rings: [box(w, s, e, n)] }] },
  };
}

function cityRegion(
  partial: Omit<Region, 'geom' | 'bbox' | 'kind'> & { center: LonLat; radiusKm: number },
): Region {
  const { center, radiusKm, ...rest } = partial;
  const dlat = radiusKm / 111.32;
  const dlon = radiusKm / (111.32 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)));
  return {
    ...rest,
    kind: 'city',
    bbox: [center.lon - dlon, center.lat - dlat, center.lon + dlon, center.lat + dlat],
    centroid: center,
    geom: { circle: { center, radiusKm } },
  };
}

const RULES = {
  paintPerSecondAt1km2: 0.4,
  areaExponent: 0.42,
  boostMultiplier: 2.6,
  boostSeconds: 2.2,
  yieldPerKm2PerSecond: 0.012,
  unlockCostPerSqrtKm2: 1.8,
  minUnlockCost: 10,
  originGrant: 24,
} as const;

export const TINY_CATALOG: WorldCatalog = {
  version: 1,
  planet: { id: 'earth', name: 'Earth', radiusKm: 6371 },
  rules: RULES,
  flags: [
    { id: 'flag:pl', pattern: 'horizontal', colors: ['#FFFFFF', '#DC143C'] },
    { id: 'flag:ru', pattern: 'horizontal', colors: ['#FFFFFF', '#0039A6', '#D52B1E'] },
    { id: 'flag:us', pattern: 'canton', colors: ['#3C3B6E', '#FFFFFF', '#B22234'] },
  ],
  facts: [
    { id: 'fact:pl', title: 'Польша', lines: ['Европа · Центральная Европа', 'Столица: Варшава'] },
    { id: 'fact:ru', title: 'Россия', lines: ['Европа · Восточная Европа', 'Столица: Москва'] },
    { id: 'fact:us', title: 'США', lines: ['Америка · Северная Америка', 'Столица: Вашингтон'] },
  ],
  regions: [
    polyRegion({
      id: 'country:pl',
      kind: 'country',
      name: 'Poland',
      nameLocal: 'Польша',
      parentId: null,
      iso2: 'PL',
      w: 14,
      s: 49,
      e: 24,
      n: 55,
      areaKm2: 312679,
      flagId: 'flag:pl',
      factId: 'fact:pl',
      neighborIds: ['country:ru'],
    }),
    polyRegion({
      id: 'country:ru',
      kind: 'country',
      name: 'Russia',
      nameLocal: 'Россия',
      parentId: null,
      iso2: 'RU',
      w: 30,
      s: 50,
      e: 45,
      n: 60,
      areaKm2: 17098242,
      flagId: 'flag:ru',
      factId: 'fact:ru',
      neighborIds: ['country:pl'],
    }),
    polyRegion({
      id: 'country:us',
      kind: 'country',
      name: 'United States',
      nameLocal: 'США',
      parentId: null,
      iso2: 'US',
      w: -125,
      s: 32,
      e: -114,
      n: 42,
      areaKm2: 9833517,
      flagId: 'flag:us',
      factId: 'fact:us',
    }),
    polyRegion({
      id: 'admin1:PL-MZ',
      kind: 'admin1',
      name: 'Masovian',
      nameLocal: 'Мазовецкое воеводство',
      parentId: 'country:pl',
      iso3166_2: 'PL-MZ',
      w: 19,
      s: 51,
      e: 23,
      n: 53.2,
      areaKm2: 35558,
    }),
    polyRegion({
      id: 'admin1:US-CA',
      kind: 'admin1',
      name: 'California',
      nameLocal: 'Калифорния',
      parentId: 'country:us',
      iso3166_2: 'US-CA',
      w: -125,
      s: 32,
      e: -114,
      n: 42,
      areaKm2: 423970,
    }),
    cityRegion({
      id: 'city:ne:1',
      name: 'Warsaw',
      nameLocal: 'Варшава',
      parentId: 'admin1:PL-MZ',
      areaKm2: 1257,
      centroid: { lon: 21.01, lat: 52.23 },
      neighborIds: [],
      center: { lon: 21.01, lat: 52.23 },
      radiusKm: 20,
    }),
    cityRegion({
      id: 'city:ne:2',
      name: 'Moscow',
      nameLocal: 'Москва',
      parentId: 'country:ru',
      areaKm2: 2463,
      centroid: { lon: 37.62, lat: 55.76 },
      neighborIds: [],
      center: { lon: 37.62, lat: 55.76 },
      radiusKm: 28,
    }),
    cityRegion({
      id: 'city:ne:3',
      name: 'Los Angeles',
      nameLocal: 'Лос-Анджелес',
      parentId: 'admin1:US-CA',
      areaKm2: 1520,
      centroid: { lon: -118.24, lat: 34.05 },
      neighborIds: [],
      center: { lon: -118.24, lat: 34.05 },
      radiusKm: 22,
    }),
  ],
};

function indexed(): WorldIndex {
  return indexWorld(TINY_CATALOG);
}

describe('indexWorld', () => {
  it('indexes ids, countries, and direct children', () => {
    const index = indexed();
    expect(index.countries.map((r) => r.id)).toEqual(['country:pl', 'country:ru', 'country:us']);
    expect(index.byId.get('admin1:US-CA')?.name).toBe('California');
    expect(index.childrenOf(null).map((r) => r.id)).toEqual(['country:pl', 'country:ru', 'country:us']);
    expect(index.childrenOf('country:pl').map((r) => r.id)).toEqual(['admin1:PL-MZ']);
    expect(index.childrenOf('admin1:PL-MZ').map((r) => r.id)).toEqual(['city:ne:1']);
    expect(index.childrenOf('country:missing')).toEqual([]);
  });

  it('walks parents for flag and fact', () => {
    const index = indexed();
    const warsaw = index.byId.get('city:ne:1');
    const california = index.byId.get('admin1:US-CA');
    expect(warsaw && regionFlag(index, warsaw)?.id).toBe('flag:pl');
    expect(warsaw && regionFact(index, warsaw)?.title).toBe('Польша');
    expect(california && regionFlag(index, california)?.id).toBe('flag:us');
  });
});

describe('loadWorld', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches catalog.json and indexes it', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(JSON.stringify(TINY_CATALOG), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    const index = await loadWorld();
    expect(index.countries).toHaveLength(3);
    expect(index.byId.get('city:ne:2')?.nameLocal).toBe('Москва');
  });
});

describe('findOrigin', () => {
  it('matches Warsaw, Москва, and US-CA with city > admin1 > country', () => {
    const index = indexed();
    expect(findOrigin(index, 'Warsaw')?.id).toBe('city:ne:1');
    expect(findOrigin(index, 'москва')?.id).toBe('city:ne:2');
    expect(findOrigin(index, 'US-CA')?.id).toBe('admin1:US-CA');
    expect(findOrigin(index, 'pl')?.id).toBe('country:pl');
    expect(findOrigin(index, '')).toBeNull();
  });
});

describe('originFromLonLat', () => {
  it('picks the smallest containing city, else admin1, else country', () => {
    const index = indexed();
    expect(originFromLonLat(index, 21.01, 52.23)?.id).toBe('city:ne:1');
    expect(originFromLonLat(index, 20.2, 52.0)?.id).toBe('admin1:PL-MZ');
    expect(originFromLonLat(index, 15.0, 50.0)?.id).toBe('country:pl');
    expect(originFromLonLat(index, -118.24, 34.05)?.id).toBe('city:ne:3');
    expect(originFromLonLat(index, -120.0, 38.0)?.id).toBe('admin1:US-CA');
    expect(originFromLonLat(index, 0, 0)).toBeNull();
  });
});
