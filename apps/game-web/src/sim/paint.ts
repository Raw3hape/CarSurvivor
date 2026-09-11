import type { WorldIndex } from '../world/catalog';
import { rulesFor } from './state';
import type { GameState } from './types';

export function startPaint(state: GameState, index: WorldIndex, regionId: string): boolean {
  if (!index.byId.has(regionId)) return false;
  const runtime = state.regions[regionId];
  if (!runtime || !runtime.unlocked || runtime.progress >= 1) return false;
  runtime.painting = true;
  return true;
}

export function boostPaint(state: GameState): void {
  if (!state.selectedId) return;
  const runtime = state.regions[state.selectedId];
  if (!runtime) return;
  if (!runtime.unlocked || runtime.progress >= 1) return;
  runtime.painting = true;
  const rules = rulesFor(state);
  if (!rules) return;
  runtime.boostUntil = state.time + rules.boostSeconds;
}
