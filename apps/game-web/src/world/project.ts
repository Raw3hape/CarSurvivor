import { LOOK } from '../render/look';
import type { LonLat } from './types';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export function displayRadius(): number {
  return LOOK.globe.displayRadius;
}

export function lonLatToUnit(lonLat: LonLat): { x: number; y: number; z: number } {
  const phi = (90 - lonLat.lat) * DEG;
  const theta = (lonLat.lon + 180) * DEG;
  return {
    x: -Math.sin(phi) * Math.cos(theta),
    y: Math.cos(phi) * LOOK.globe.flattenY,
    z: Math.sin(phi) * Math.sin(theta),
  };
}

export function lonLatToWorld(lonLat: LonLat, radius = displayRadius()): { x: number; y: number; z: number } {
  const u = lonLatToUnit(lonLat);
  return { x: u.x * radius, y: u.y * radius, z: u.z * radius };
}

export function worldToLonLat(x: number, y: number, z: number): LonLat {
  const ny = y / LOOK.globe.flattenY;
  const len = Math.hypot(x, ny, z) || 1;
  const lat = Math.asin(ny / len) * RAD;
  const lon = Math.atan2(z, -x) * RAD;
  return { lon, lat };
}

export function haversineKm(a: LonLat, b: LonLat, radiusKm = 6371): number {
  const p1 = a.lat * DEG;
  const p2 = b.lat * DEG;
  const dp = (b.lat - a.lat) * DEG;
  const dl = (b.lon - a.lon) * DEG;
  const s = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.min(1, Math.sqrt(s)));
}
