import { describe, expect, it } from 'vitest';
import { flagPngUrl, isoFromFlag } from './flagUrl';

describe('flag urls', () => {
  it('builds a flagcdn png and reads iso from flag id', () => {
    expect(isoFromFlag({ id: 'flag:pl', pattern: 'horizontal', colors: ['#fff'] })).toBe('pl');
    expect(isoFromFlag({ id: 'flag:xx', pattern: 'solid', colors: [] }, { iso2: 'US' })).toBe('us');
    expect(flagPngUrl('pl', 80)).toBe('https://flagcdn.com/w80/pl.png');
    expect(flagPngUrl('gb')).toBe('https://flagcdn.com/w320/gb.png');
  });
});
