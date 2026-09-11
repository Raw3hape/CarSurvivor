import type { WorldIndex } from '../world/catalog';
import type { LodLevel } from '../world/types';
import type { GameState } from './types';

export function selectRegion(state: GameState, index: WorldIndex, regionId: string | null): void {
  if (regionId === null) {
    state.selectedId = null;
    return;
  }
  if (!index.byId.has(regionId)) return;
  state.selectedId = regionId;
}

export function setLod(state: GameState, lod: LodLevel): void {
  state.lod = lod;
}

export function focusFrom(state: GameState, index: WorldIndex, regionId: string): void {
  if (!index.byId.has(regionId)) return;
  let focusedCountryId: string | null = null;
  let focusedAdminId: string | null = null;
  let id: string | null = regionId;
  while (id) {
    const region = index.byId.get(id);
    if (!region) break;
    if (region.kind === 'country') focusedCountryId = region.id;
    else if (region.kind === 'admin1') focusedAdminId = region.id;
    id = region.parentId;
  }
  state.focusedCountryId = focusedCountryId;
  state.focusedAdminId = focusedAdminId;
}
