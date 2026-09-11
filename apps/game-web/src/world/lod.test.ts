import { describe, expect, it } from 'vitest';
import { LOOK } from '../render/look';
import { lodForDistance } from './lod';

describe('lodForDistance', () => {
  it('lands flyTo distances on the matching lod', () => {
    expect(lodForDistance(LOOK.camera.spaceDistance)).toBe('country');
    expect(lodForDistance(LOOK.camera.countryDistance)).toBe('country');
    expect(lodForDistance(LOOK.camera.adminDistance)).toBe('admin1');
    expect(lodForDistance(LOOK.camera.cityDistance)).toBe('city');
  });
});
