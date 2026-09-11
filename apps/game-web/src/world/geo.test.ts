import { describe, expect, it } from 'vitest';
import { TINY_CATALOG } from './catalog.test';
import { pointInRegion, smallestRegionAt } from './geo';
import type { Region } from './types';

const regions = TINY_CATALOG.regions;
const byId = new Map(regions.map((r) => [r.id, r]));

function must(id: string): Region {
  const region = byId.get(id);
  if (!region) throw new Error(id);
  return region;
}

describe('pointInRegion', () => {
  it('accepts a point inside a country polygon and rejects outside', () => {
    const poland = must('country:pl');
    expect(pointInRegion({ lon: 21, lat: 52 }, poland)).toBe(true);
    expect(pointInRegion({ lon: 0, lat: 0 }, poland)).toBe(false);
  });

  it('treats city circles by radius', () => {
    const warsaw = must('city:ne:1');
    expect(pointInRegion({ lon: 21.01, lat: 52.23 }, warsaw)).toBe(true);
    expect(pointInRegion({ lon: 21.8, lat: 52.23 }, warsaw)).toBe(false);
  });

  it('excludes holes', () => {
    const outer: Region = {
      ...must('country:pl'),
      id: 'hole-test',
      geom: {
        polygons: [
          {
            rings: [
              [
                { lon: 0, lat: 0 },
                { lon: 10, lat: 0 },
                { lon: 10, lat: 10 },
                { lon: 0, lat: 10 },
                { lon: 0, lat: 0 },
              ],
              [
                { lon: 4, lat: 4 },
                { lon: 6, lat: 4 },
                { lon: 6, lat: 6 },
                { lon: 4, lat: 6 },
                { lon: 4, lat: 4 },
              ],
            ],
          },
        ],
      },
      bbox: [0, 0, 10, 10],
    };
    expect(pointInRegion({ lon: 1, lat: 1 }, outer)).toBe(true);
    expect(pointInRegion({ lon: 5, lat: 5 }, outer)).toBe(false);
  });
});

describe('smallestRegionAt', () => {
  it('picks the smallest matching region from the fixture', () => {
    const atWarsaw = smallestRegionAt({ lon: 21.01, lat: 52.23 }, regions);
    expect(atWarsaw?.id).toBe('city:ne:1');
    const mazovia = smallestRegionAt({ lon: 20.2, lat: 52 }, regions);
    expect(mazovia?.id).toBe('admin1:PL-MZ');
    const citiesOnly = smallestRegionAt({ lon: 20.2, lat: 52 }, regions, new Set(['city']));
    expect(citiesOnly).toBeNull();
  });
});
