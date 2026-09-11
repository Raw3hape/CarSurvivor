import type { LodLevel } from '../world/types';

export type ToolId = 'finger' | 'brush' | 'roller' | 'flood';

export type RegionRuntime = {
  id: string;
  unlocked: boolean;
  progress: number;
  painting: boolean;
  boostUntil: number;
};

export type Economy = {
  paint: number;
};

export type UnlockOffer = {
  id: string;
  cost: number;
  affordable: boolean;
};

export type GameState = {
  originId: string | null;
  selectedId: string | null;
  focusedCountryId: string | null;
  focusedAdminId: string | null;
  lod: LodLevel;
  economy: Economy;
  toolId: ToolId;
  time: number;
  regions: Record<string, RegionRuntime>;
};
