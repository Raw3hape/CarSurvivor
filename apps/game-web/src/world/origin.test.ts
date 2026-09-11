import { describe, expect, it } from 'vitest';
import { TINY_CATALOG } from './catalog.test';
import { indexWorld } from './catalog';
import { countryOf } from './origin';

describe('countryOf', () => {
  const index = indexWorld(TINY_CATALOG);

  it('walks a city up to its country', () => {
    const warsaw = index.byId.get('city:ne:1');
    expect(warsaw).toBeDefined();
    expect(countryOf(index, warsaw!).id).toBe('country:pl');
  });

  it('keeps a country as itself', () => {
    const poland = index.byId.get('country:pl');
    expect(poland).toBeDefined();
    expect(countryOf(index, poland!).id).toBe('country:pl');
  });
});
