import { describe, expect, it } from 'vitest';
import type { WorldIndex } from '../world/catalog';
import type { Region, SimRules, WorldCatalog } from '../world/types';
import {
  boostPaint,
  canUnlock,
  chooseOrigin,
  createGame,
  offers,
  paintRate,
  startPaint,
  tick,
  unlockCost,
  unlockRegion,
  yieldOf,
} from './index';
import type { GameState } from './types';

const RULES: SimRules = {
  paintPerSecondAt1km2: 1,
  areaExponent: 0.5,
  boostMultiplier: 2,
  boostSeconds: 2,
  yieldPerKm2PerSecond: 0.5,
  unlockCostPerSqrtKm2: 10,
  minUnlockCost: 8,
  originGrant: 40,
};

function region(
  id: string,
  kind: Region['kind'],
  name: string,
  parentId: string | null,
  areaKm2: number,
  neighborIds: string[],
  lon: number,
  lat: number,
): Region {
  return {
    id,
    kind,
    name,
    parentId,
    areaKm2,
    centroid: { lon, lat },
    bbox: [lon - 1, lat - 1, lon + 1, lat + 1],
    neighborIds,
    geom: { circle: { center: { lon, lat }, radiusKm: Math.sqrt(areaKm2 / Math.PI) } },
  };
}

function makeIndex(): WorldIndex {
  const catalog: WorldCatalog = {
    version: 1,
    planet: { id: 'earth', name: 'Earth', radiusKm: 6371 },
    rules: RULES,
    regions: [
      region('country:AA', 'country', 'Aland', null, 400, ['country:BB'], 0, 10),
      region('admin1:AA-1', 'admin1', 'Aland North', 'country:AA', 100, ['admin1:BB-1'], 0, 10.2),
      region('city:a1', 'city', 'Aport', 'admin1:AA-1', 4, ['city:a2'], 0.1, 10.3),
      region('city:a2', 'city', 'Awick', 'admin1:AA-1', 16, ['city:a1'], 0.2, 10.1),
      region('country:BB', 'country', 'Borea', null, 1600, ['country:AA'], 8, 10),
      region('admin1:BB-1', 'admin1', 'Borea West', 'country:BB', 100, ['admin1:AA-1'], 8, 10.2),
      region('city:b1', 'city', 'Bport', 'admin1:BB-1', 4, ['city:b2'], 8.1, 10.3),
      region('city:b2', 'city', 'Bwick', 'admin1:BB-1', 36, ['city:b1'], 8.2, 10.1),
    ],
    flags: [],
    facts: [],
  };
  const byId = new Map(catalog.regions.map((item) => [item.id, item]));
  const children = new Map<string | null, Region[]>();
  for (const item of catalog.regions) {
    const list = children.get(item.parentId);
    if (list) list.push(item);
    else children.set(item.parentId, [item]);
  }
  return {
    catalog,
    byId,
    childrenOf: (parentId) => children.get(parentId) ?? [],
    flagById: new Map(),
    factById: new Map(),
    countries: catalog.regions.filter((item) => item.kind === 'country'),
  };
}

function runtime(state: GameState, id: string) {
  const value = state.regions[id];
  if (!value) throw new Error(`missing runtime ${id}`);
  return value;
}

describe('clay earth sim', () => {
  it('starts locked and grants origin paint once', () => {
    const index = makeIndex();
    const state = createGame(index);
    expect(state.toolId).toBe('finger');
    expect(state.lod).toBe('country');
    expect(state.economy.paint).toBe(0);
    expect(state.originId).toBeNull();
    for (const regionState of Object.values(state.regions)) {
      expect(regionState.unlocked).toBe(false);
      expect(regionState.progress).toBe(0);
      expect(regionState.painting).toBe(false);
    }
    expect(startPaint(state, index, 'city:a1')).toBe(false);

    chooseOrigin(state, index, 'city:a1');
    expect(state.originId).toBe('city:a1');
    expect(state.selectedId).toBe('city:a1');
    expect(state.focusedCountryId).toBe('country:AA');
    expect(state.focusedAdminId).toBe('admin1:AA-1');
    expect(runtime(state, 'city:a1').unlocked).toBe(true);
    expect(state.economy.paint).toBe(RULES.originGrant);

    chooseOrigin(state, index, 'city:a2');
    expect(state.originId).toBe('city:a1');
    expect(state.economy.paint).toBe(RULES.originGrant);
    expect(runtime(state, 'city:a2').unlocked).toBe(false);
  });

  it('paints to 1 and is slower on larger area', () => {
    const index = makeIndex();
    const small = createGame(index);
    const large = createGame(index);
    chooseOrigin(small, index, 'city:a1');
    chooseOrigin(large, index, 'city:b2');
    expect(startPaint(small, index, 'city:a1')).toBe(true);
    expect(startPaint(large, index, 'city:b2')).toBe(true);

    tick(small, index, 1);
    tick(large, index, 1);
    expect(runtime(small, 'city:a1').progress).toBeCloseTo(paintRate(RULES, 4, false));
    expect(runtime(large, 'city:b2').progress).toBeCloseTo(paintRate(RULES, 36, false));
    expect(runtime(small, 'city:a1').progress).toBeGreaterThan(runtime(large, 'city:b2').progress);

    tick(small, index, 1);
    expect(runtime(small, 'city:a1').progress).toBe(1);
    expect(runtime(small, 'city:a1').painting).toBe(false);
    expect(startPaint(small, index, 'city:a1')).toBe(false);
  });

  it('boost without startPaint still paints', () => {
    const index = makeIndex();
    const state = createGame(index);
    chooseOrigin(state, index, 'city:a1');
    boostPaint(state);
    tick(state, index, 0.2);
    expect(runtime(state, 'city:a1').painting).toBe(true);
    expect(runtime(state, 'city:a1').progress).toBeGreaterThan(0);
  });

  it('boosts the selected paint', () => {
    const index = makeIndex();
    const plain = createGame(index);
    const boosted = createGame(index);
    chooseOrigin(plain, index, 'city:a1');
    chooseOrigin(boosted, index, 'city:a1');
    startPaint(plain, index, 'city:a1');
    startPaint(boosted, index, 'city:a1');
    boostPaint(boosted);

    tick(plain, index, 1);
    tick(boosted, index, 1);
    expect(runtime(plain, 'city:a1').progress).toBeCloseTo(0.5);
    expect(runtime(boosted, 'city:a1').progress).toBeCloseTo(1);
    expect(runtime(boosted, 'city:a1').painting).toBe(false);
  });

  it('yields paint from completed regions', () => {
    const index = makeIndex();
    const state = createGame(index);
    chooseOrigin(state, index, 'city:a1');
    startPaint(state, index, 'city:a1');
    tick(state, index, 2);
    expect(runtime(state, 'city:a1').progress).toBe(1);
    const paintAtComplete = state.economy.paint;
    tick(state, index, 1);
    expect(state.economy.paint).toBeCloseTo(paintAtComplete + yieldOf(RULES, 4, 1));
  });

  it('cannot unlock a non-neighbor, can unlock a neighbor after complete', () => {
    const index = makeIndex();
    const state = createGame(index);
    chooseOrigin(state, index, 'city:a1');
    expect(canUnlock(state, index, 'city:a2')).toBe(false);
    expect(canUnlock(state, index, 'city:b1')).toBe(false);

    startPaint(state, index, 'city:a1');
    tick(state, index, 2);
    expect(runtime(state, 'city:a1').progress).toBe(1);
    expect(canUnlock(state, index, 'city:a2')).toBe(true);
    expect(canUnlock(state, index, 'admin1:AA-1')).toBe(true);
    expect(canUnlock(state, index, 'city:b1')).toBe(false);
    expect(canUnlock(state, index, 'country:BB')).toBe(false);

    expect(unlockRegion(state, index, 'city:a2')).toBe(true);
    expect(runtime(state, 'city:a2').unlocked).toBe(true);
    expect(state.economy.paint).toBeCloseTo(RULES.originGrant + yieldOf(RULES, 4, 1) * 2 - unlockCost(RULES, 16));
  });

  it('cannot unlock if not enough paint', () => {
    const index = makeIndex();
    const state = createGame(index);
    chooseOrigin(state, index, 'city:a1');
    startPaint(state, index, 'city:a1');
    tick(state, index, 2);
    state.economy.paint = 10;
    expect(canUnlock(state, index, 'city:a2')).toBe(true);
    expect(unlockRegion(state, index, 'city:a2')).toBe(false);
    expect(runtime(state, 'city:a2').unlocked).toBe(false);
    expect(state.economy.paint).toBe(10);
  });

  it('lists unlock offers by cost, cap 8, with affordable flag', () => {
    const index = makeIndex();
    const state = createGame(index);
    chooseOrigin(state, index, 'city:a1');
    startPaint(state, index, 'city:a1');
    tick(state, index, 2);
    const listed = offers(state, index);
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.length).toBeLessThanOrEqual(8);
    expect(listed.map((row) => row.id)).toEqual(['city:a2', 'admin1:AA-1']);
    expect(listed[0]).toEqual({ id: 'city:a2', cost: unlockCost(RULES, 16), affordable: true });
    expect(listed[1]).toEqual({ id: 'admin1:AA-1', cost: unlockCost(RULES, 100), affordable: false });
    for (let i = 1; i < listed.length; i += 1) {
      expect(listed[i]!.cost).toBeGreaterThanOrEqual(listed[i - 1]!.cost);
    }
  });
});
