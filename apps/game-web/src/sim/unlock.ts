import type { WorldIndex } from '../world/catalog';
import { unlockCost } from './rules';
import type { GameState, UnlockOffer } from './types';

function isComplete(state: GameState, regionId: string): boolean {
  const runtime = state.regions[regionId];
  return !!runtime && runtime.progress >= 1;
}

export function canUnlock(state: GameState, index: WorldIndex, regionId: string): boolean {
  const region = index.byId.get(regionId);
  const runtime = state.regions[regionId];
  if (!region || !runtime || runtime.unlocked) return false;

  if (region.parentId && isComplete(state, region.parentId)) return true;

  for (const child of index.childrenOf(region.id)) {
    if (isComplete(state, child.id)) return true;
  }

  for (const other of index.catalog.regions) {
    if (other.id === region.id) continue;
    if (!isComplete(state, other.id)) continue;
    if (region.neighborIds.includes(other.id) || other.neighborIds.includes(region.id)) return true;
  }

  return false;
}

export function offers(state: GameState, index: WorldIndex): UnlockOffer[] {
  const rules = index.catalog.rules;
  const list: UnlockOffer[] = [];
  for (const region of index.catalog.regions) {
    if (!canUnlock(state, index, region.id)) continue;
    const cost = unlockCost(rules, region.areaKm2);
    list.push({
      id: region.id,
      cost,
      affordable: state.economy.paint >= cost,
    });
  }
  list.sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));
  return list.slice(0, 8);
}

export function unlockRegion(state: GameState, index: WorldIndex, regionId: string): boolean {
  if (!canUnlock(state, index, regionId)) return false;
  const region = index.byId.get(regionId);
  const runtime = state.regions[regionId];
  if (!region || !runtime) return false;
  const cost = unlockCost(index.catalog.rules, region.areaKm2);
  if (state.economy.paint < cost) return false;
  state.economy.paint -= cost;
  runtime.unlocked = true;
  return true;
}
