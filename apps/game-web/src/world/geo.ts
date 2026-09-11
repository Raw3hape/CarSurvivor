import type { LonLat, Polygon, Region, RegionGeom } from './types';
import { isCircleGeom } from './types';
import { haversineKm } from './project';

export function pointInRing(point: LonLat, ring: LonLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const hit =
      a.lat > point.lat !== b.lat > point.lat &&
      point.lon < ((b.lon - a.lon) * (point.lat - a.lat)) / (b.lat - a.lat + 1e-12) + a.lon;
    if (hit) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(point: LonLat, polygon: Polygon): boolean {
  const outer = polygon.rings[0];
  if (!outer || !pointInRing(point, outer)) return false;
  for (let i = 1; i < polygon.rings.length; i += 1) {
    const hole = polygon.rings[i];
    if (hole && pointInRing(point, hole)) return false;
  }
  return true;
}

export function pointInGeom(point: LonLat, geom: RegionGeom): boolean {
  if (isCircleGeom(geom)) {
    return haversineKm(point, geom.circle.center) <= geom.circle.radiusKm;
  }
  return geom.polygons.some((polygon) => pointInPolygon(point, polygon));
}

export function pointInRegion(point: LonLat, region: Region): boolean {
  const [w, s, e, n] = region.bbox;
  if (point.lon < w || point.lon > e || point.lat < s || point.lat > n) return false;
  return pointInGeom(point, region.geom);
}

export function smallestRegionAt(point: LonLat, regions: readonly Region[], kinds?: ReadonlySet<Region['kind']>): Region | null {
  let best: Region | null = null;
  for (const region of regions) {
    if (kinds && !kinds.has(region.kind)) continue;
    if (!pointInRegion(point, region)) continue;
    if (!best || region.areaKm2 < best.areaKm2) best = region;
  }
  return best;
}
