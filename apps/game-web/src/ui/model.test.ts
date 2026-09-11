import { describe, expect, it } from 'vitest';
import { formatArea, formatPaint, kindLabel } from './model';

describe('kindLabel', () => {
  it('maps playable kinds to Russian', () => {
    expect(kindLabel('country')).toBe('страна');
    expect(kindLabel('admin1')).toBe('провинция');
    expect(kindLabel('city')).toBe('город');
  });
});

describe('formatArea', () => {
  it('uses Russian grouping and a unit', () => {
    expect(formatArea(0)).toBe('—');
    expect(formatArea(3.2)).toBe('3,2\u00a0км²');
    expect(formatArea(1240)).toBe('1\u00a0240\u00a0км²');
    expect(formatArea(17_098_246)).toBe('17,1\u00a0млн км²');
  });
});

describe('formatPaint', () => {
  it('keeps small fractions and groups large totals', () => {
    expect(formatPaint(0)).toBe('0');
    expect(formatPaint(0.4)).toBe('0,4');
    expect(formatPaint(12.4)).toBe('12,4');
    expect(formatPaint(1240)).toBe('1\u00a0240');
  });
});
