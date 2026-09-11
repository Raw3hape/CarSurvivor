import type { WorldIndex } from '../world/catalog';
import type { SimRules } from '../world/types';
import { paintRate, yieldOf } from './rules';
import { focusFrom, selectRegion } from './select';
import type { GameState, RegionRuntime } from './types';

const rulesByGame = new WeakMap<GameState, SimRules>();

export function rulesFor(state: GameState): SimRules | undefined {
  return rulesByGame.get(state);
}

export function createGame(index: WorldIndex): GameState {
  const regions: Record<string, RegionRuntime> = {};
  for (const region of index.catalog.regions) {
    regions[region.id] = {
      id: region.id,
      unlocked: false,
      progress: 0,
      painting: false,
      boostUntil: 0,
    };
  }
  const state: GameState = {
    originId: null,
    selectedId: null,
    focusedCountryId: null,
    focusedAdminId: null,
    lod: 'country',
    economy: { paint: 0 },
    toolId: 'finger',
    time: 0,
    regions,
  };
  rulesByGame.set(state, index.catalog.rules);
  return state;
}

export function tick(state: GameState, index: WorldIndex, dt: number): void {
  const rules = index.catalog.rules;
  rulesByGame.set(state, rules);
  for (const runtime of Object.values(state.regions)) {
    const region = index.byId.get(runtime.id);
    if (!region) continue;
    if (runtime.painting) {
      const boosting = state.time < runtime.boostUntil;
      runtime.progress = Math.min(1, Math.max(0, runtime.progress + paintRate(rules, region.areaKm2, boosting) * dt));
      if (runtime.progress >= 1) runtime.painting = false;
    }
    state.economy.paint += yieldOf(rules, region.areaKm2, runtime.progress) * dt;
    if (state.time > runtime.boostUntil) runtime.boostUntil = 0;
  }
  state.time += dt;
}

export function chooseOrigin(state: GameState, index: WorldIndex, regionId: string): void {
  if (state.originId !== null) return;
  const region = index.byId.get(regionId);
  const runtime = state.regions[regionId];
  if (!region || !runtime) return;
  state.originId = regionId;
  state.economy.paint += index.catalog.rules.originGrant;
  runtime.unlocked = true;
  selectRegion(state, index, regionId);
  focusFrom(state, index, regionId);
}
