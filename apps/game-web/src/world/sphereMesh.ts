import { Earcut } from 'three/src/extras/Earcut.js';
import type { LonLat, Polygon } from './types';

export type SphereMeshData = {
  positions: number[];
  uvs: number[];
  indices: number[];
};

export function unwrapRing(ring: LonLat[]): LonLat[] {
  if (!ring.length) return [];
  const first = ring[0]!;
  const out: LonLat[] = [{ lon: first.lon, lat: first.lat }];
  for (let i = 1; i < ring.length; i += 1) {
    const p = ring[i]!;
    let lon = p.lon;
    const prev = out[out.length - 1]!.lon;
    while (lon - prev > 180) lon -= 360;
    while (lon - prev < -180) lon += 360;
    out.push({ lon, lat: p.lat });
  }
  const a = out[0]!;
  const b = out[out.length - 1]!;
  if (out.length > 1 && Math.hypot(a.lon - b.lon, a.lat - b.lat) < 1e-8) out.pop();
  return out;
}

export function densifyRing(ring: LonLat[], maxStepDeg = 1.6): LonLat[] {
  if (ring.length < 2) return ring.slice();
  const out: LonLat[] = [];
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const dLon = b.lon - a.lon;
    const dLat = b.lat - a.lat;
    const dist = Math.hypot(dLon, dLat);
    const steps = Math.max(1, Math.ceil(dist / maxStepDeg));
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      out.push({ lon: a.lon + dLon * t, lat: a.lat + dLat * t });
    }
  }
  return out;
}

export function lonLatToEllipsoid(lon: number, lat: number, radius: number, flattenY: number): { x: number; y: number; z: number } {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi) * flattenY,
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

function projectOntoEllipsoid(x: number, y: number, z: number, radius: number, flattenY: number): { x: number; y: number; z: number } {
  const ny = y / flattenY;
  const len = Math.hypot(x, ny, z) || 1;
  return { x: (x / len) * radius, y: (ny / len) * radius * flattenY, z: (z / len) * radius };
}

export function tessellatePolygons(
  polygons: Polygon[],
  radius: number,
  flattenY: number,
  maxChord: number,
): SphereMeshData | null {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const polygon of polygons) {
    const rings = polygon.rings
      .map(unwrapRing)
      .map((ring) => densifyRing(ring))
      .filter((ring) => ring.length >= 3);
    if (!rings.length) continue;

    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (const ring of rings) {
      for (const p of ring) {
        minLon = Math.min(minLon, p.lon);
        maxLon = Math.max(maxLon, p.lon);
        minLat = Math.min(minLat, p.lat);
        maxLat = Math.max(maxLat, p.lat);
      }
    }
    const lonSpan = Math.max(1e-4, maxLon - minLon);
    const latSpan = Math.max(1e-4, maxLat - minLat);

    const data: number[] = [];
    const holes: number[] = [];
    const verts: LonLat[] = [];
    for (let r = 0; r < rings.length; r += 1) {
      const ring = rings[r]!;
      if (r > 0) holes.push(verts.length);
      for (const p of ring) {
        data.push(p.lon, p.lat);
        verts.push(p);
      }
    }
    let tris: number[] = [];
    try {
      tris = Earcut.triangulate(data, holes, 2);
    } catch {
      continue;
    }
    if (tris.length < 3) continue;
    const base = positions.length / 3;
    for (const p of verts) {
      const w = lonLatToEllipsoid(p.lon, p.lat, radius, flattenY);
      positions.push(w.x, w.y, w.z);
      uvs.push((p.lon - minLon) / lonSpan, (p.lat - minLat) / latSpan);
    }
    for (const idx of tris) indices.push(base + idx);
  }

  if (indices.length < 3) return null;
  subdivideToSphere(positions, uvs, indices, radius, flattenY, maxChord);
  ensureOutward(positions, indices);
  return { positions, uvs, indices };
}

export function subdivideToSphere(
  positions: number[],
  uvs: number[],
  indices: number[],
  radius: number,
  flattenY: number,
  maxChord: number,
  maxPasses = 7,
): void {
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const mids = new Map<string, number>();
    const next: number[] = [];
    let splits = 0;
    const splitEdge = (a: number, b: number): number => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      const hit = mids.get(key);
      if (hit !== undefined) return hit;
      const ax = positions[a * 3]!;
      const ay = positions[a * 3 + 1]!;
      const az = positions[a * 3 + 2]!;
      const bx = positions[b * 3]!;
      const by = positions[b * 3 + 1]!;
      const bz = positions[b * 3 + 2]!;
      const p = projectOntoEllipsoid((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5, radius, flattenY);
      const i = positions.length / 3;
      positions.push(p.x, p.y, p.z);
      uvs.push(((uvs[a * 2] ?? 0) + (uvs[b * 2] ?? 0)) * 0.5, ((uvs[a * 2 + 1] ?? 0) + (uvs[b * 2 + 1] ?? 0)) * 0.5);
      mids.set(key, i);
      return i;
    };
    const dist = (a: number, b: number) => {
      const dx = positions[a * 3]! - positions[b * 3]!;
      const dy = positions[a * 3 + 1]! - positions[b * 3 + 1]!;
      const dz = positions[a * 3 + 2]! - positions[b * 3 + 2]!;
      return Math.hypot(dx, dy, dz);
    };
    for (let t = 0; t < indices.length; t += 3) {
      const a = indices[t]!;
      const b = indices[t + 1]!;
      const c = indices[t + 2]!;
      const ab = dist(a, b);
      const bc = dist(b, c);
      const ca = dist(c, a);
      if (ab <= maxChord && bc <= maxChord && ca <= maxChord) {
        next.push(a, b, c);
        continue;
      }
      splits += 1;
      const abI = splitEdge(a, b);
      const bcI = splitEdge(b, c);
      const caI = splitEdge(c, a);
      next.push(a, abI, caI, b, bcI, abI, c, caI, bcI, abI, bcI, caI);
    }
    indices.length = 0;
    indices.push(...next);
    if (!splits) break;
  }
}

function ensureOutward(positions: number[], indices: number[]): void {
  if (indices.length < 3) return;
  const a = indices[0]!;
  const b = indices[1]!;
  const c = indices[2]!;
  const ax = positions[a * 3]!;
  const ay = positions[a * 3 + 1]!;
  const az = positions[a * 3 + 2]!;
  const e1x = positions[b * 3]! - ax;
  const e1y = positions[b * 3 + 1]! - ay;
  const e1z = positions[b * 3 + 2]! - az;
  const e2x = positions[c * 3]! - ax;
  const e2y = positions[c * 3 + 1]! - ay;
  const e2z = positions[c * 3 + 2]! - az;
  const nx = e1y * e2z - e1z * e2y;
  const ny = e1z * e2x - e1x * e2z;
  const nz = e1x * e2y - e1y * e2x;
  if (nx * ax + ny * ay + nz * az >= 0) return;
  for (let i = 0; i < indices.length; i += 3) {
    const tmp = indices[i + 1]!;
    indices[i + 1] = indices[i + 2]!;
    indices[i + 2] = tmp;
  }
}
