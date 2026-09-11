import type { SimRules } from '../world/types';

export const ORIGIN_PAINT_MUL = 4;

export function paintRate(rules: SimRules, areaKm2: number, boosting: boolean, origin = false): number {
  const base = rules.paintPerSecondAt1km2 / Math.pow(Math.max(areaKm2, 0.5), rules.areaExponent);
  return Math.max(0.002, base) * (boosting ? rules.boostMultiplier : 1) * (origin ? ORIGIN_PAINT_MUL : 1);
}

export function unlockCost(rules: SimRules, areaKm2: number): number {
  return Math.round(Math.max(rules.minUnlockCost, rules.unlockCostPerSqrtKm2 * Math.sqrt(Math.max(areaKm2, 1))));
}

export function yieldOf(rules: SimRules, areaKm2: number, progress: number): number {
  if (progress < 1) return 0;
  return rules.yieldPerKm2PerSecond * Math.sqrt(areaKm2);
}
