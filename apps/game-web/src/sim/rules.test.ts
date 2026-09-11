import { describe, expect, it } from 'vitest';
import { paintRate, unlockCost, yieldOf } from './rules';
import type { SimRules } from '../world/types';

const rules: SimRules = {
  paintPerSecondAt1km2: 1,
  areaExponent: 0.5,
  boostMultiplier: 2,
  boostSeconds: 2,
  yieldPerKm2PerSecond: 0.5,
  unlockCostPerSqrtKm2: 10,
  minUnlockCost: 8,
  originGrant: 40,
};

describe('paintRate', () => {
  it('is paintPerSecondAt1km2 at 1 km² and slower for larger area', () => {
    expect(paintRate(rules, 1, false)).toBe(1);
    expect(paintRate(rules, 4, false)).toBe(0.5);
    expect(paintRate(rules, 16, false)).toBe(0.25);
  });

  it('applies boost after the 0.002 floor', () => {
    expect(paintRate(rules, 4, true)).toBe(1);
    expect(paintRate(rules, 1e12, false)).toBe(0.002);
    expect(paintRate(rules, 1e12, true)).toBe(0.004);
  });
});

describe('unlockCost', () => {
  it('uses sqrt area and minUnlockCost', () => {
    expect(unlockCost(rules, 16)).toBe(40);
    expect(unlockCost(rules, 0.25)).toBe(10);
    expect(unlockCost({ ...rules, minUnlockCost: 50 }, 1)).toBe(50);
  });
});

describe('yieldOf', () => {
  it('is zero until complete, then sqrt area', () => {
    expect(yieldOf(rules, 4, 0.99)).toBe(0);
    expect(yieldOf(rules, 4, 1)).toBe(1);
  });
});
