import { describe, expect, it } from 'vitest';
import { densifyRing, tessellatePolygons, unwrapRing } from './sphereMesh';
import type { LonLat } from './types';

const RADIUS = 2;
const FLATTEN = 0.96;

function square(w: number, s: number, e: number, n: number, close = false): LonLat[] {
  const ring = [
    { lon: w, lat: s },
    { lon: e, lat: s },
    { lon: e, lat: n },
    { lon: w, lat: n },
  ];
  if (close) ring.push({ lon: w, lat: s });
  return ring;
}

function signedArea(ring: LonLat[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    sum += a.lon * b.lat - b.lon * a.lat;
  }
  return sum;
}

function reverse(ring: LonLat[]): LonLat[] {
  return [ring[0]!, ...ring.slice(1).reverse()];
}

function containsInOrder(original: LonLat[], densified: LonLat[]): boolean {
  let j = 0;
  for (const p of original) {
    const hit = densified.findIndex((q, i) => i >= j && q.lon === p.lon && q.lat === p.lat);
    if (hit < 0) return false;
    j = hit + 1;
  }
  return true;
}

function ellipsoidRadius(x: number, y: number, z: number, flattenY: number): number {
  return Math.hypot(x, y / flattenY, z);
}

function triArea(positions: number[], ia: number, ib: number, ic: number): number {
  const ax = positions[ia * 3]!;
  const ay = positions[ia * 3 + 1]!;
  const az = positions[ia * 3 + 2]!;
  const e1x = positions[ib * 3]! - ax;
  const e1y = positions[ib * 3 + 1]! - ay;
  const e1z = positions[ib * 3 + 2]! - az;
  const e2x = positions[ic * 3]! - ax;
  const e2y = positions[ic * 3 + 1]! - ay;
  const e2z = positions[ic * 3 + 2]! - az;
  const nx = e1y * e2z - e1z * e2y;
  const ny = e1z * e2x - e1x * e2z;
  const nz = e1x * e2y - e1y * e2x;
  return 0.5 * Math.hypot(nx, ny, nz);
}

describe('unwrapRing / densifyRing', () => {
  it('does not reverse ring winding or vertex order', () => {
    const ccw = square(0, 0, 4, 3);
    const cw = reverse(ccw);
    const closed = square(0, 0, 4, 3, true);
    const pacific = [
      { lon: 170, lat: 1 },
      { lon: -170, lat: 1 },
      { lon: -170, lat: 8 },
      { lon: 170, lat: 8 },
    ];

    const unwrappedCcw = unwrapRing(ccw);
    const unwrappedCw = unwrapRing(cw);
    const unwrappedClosed = unwrapRing(closed);
    const unwrappedPacific = unwrapRing(pacific);

    expect(unwrappedCcw.map((p) => p.lat)).toEqual(ccw.map((p) => p.lat));
    expect(unwrappedCcw[0]).toEqual(ccw[0]);
    expect(Math.sign(signedArea(unwrappedCcw))).toBe(1);

    expect(unwrappedCw.map((p) => p.lat)).toEqual(cw.map((p) => p.lat));
    expect(unwrappedCw[0]).toEqual(cw[0]);
    expect(Math.sign(signedArea(unwrappedCw))).toBe(-1);

    expect(unwrappedClosed).toEqual(unwrappedCcw);
    expect(unwrappedPacific.map((p) => p.lat)).toEqual(pacific.map((p) => p.lat));
    expect(unwrappedPacific[0]).toEqual(pacific[0]);
    expect(unwrappedPacific[1]!.lon).toBeGreaterThan(unwrappedPacific[0]!.lon);
    expect(Math.sign(signedArea(unwrappedPacific))).toBe(1);

    const denseCcw = densifyRing(unwrappedCcw);
    const denseCw = densifyRing(unwrappedCw);
    const densePacific = densifyRing(unwrappedPacific, 4);

    expect(denseCcw.length).toBeGreaterThan(ccw.length);
    expect(containsInOrder(unwrappedCcw, denseCcw)).toBe(true);
    expect(containsInOrder(unwrappedCw, denseCw)).toBe(true);
    expect(Math.sign(signedArea(denseCcw))).toBe(1);
    expect(Math.sign(signedArea(denseCw))).toBe(-1);
    expect(Math.sign(signedArea(densePacific))).toBe(1);
    expect(denseCcw[0]).toEqual(unwrappedCcw[0]);
    expect(denseCw[0]).toEqual(unwrappedCw[0]);
  });
});

describe('tessellatePolygons', () => {
  it('emits triangles with vertices on the flattened globe radius', () => {
    const mesh = tessellatePolygons([{ rings: [square(10, 10, 14, 14, true)] }], RADIUS, FLATTEN, 0.08);
    expect(mesh).not.toBeNull();
    const { positions, indices } = mesh!;
    expect(indices.length % 3).toBe(0);
    expect(indices.length).toBeGreaterThanOrEqual(3);
    expect(positions.length % 3).toBe(0);

    const verts = positions.length / 3;
    for (let i = 0; i < verts; i += 1) {
      const r = ellipsoidRadius(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!, FLATTEN);
      expect(r).toBeCloseTo(RADIUS, 5);
    }
    for (const idx of indices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(verts);
    }
  });

  it('tessellates a lon/lat square without zero-area triangles', () => {
    const mesh = tessellatePolygons([{ rings: [square(20, 40, 24, 44)] }], RADIUS, FLATTEN, 0.12);
    expect(mesh).not.toBeNull();
    const { positions, indices } = mesh!;
    expect(indices.length % 3).toBe(0);

    for (let t = 0; t < indices.length; t += 3) {
      const area = triArea(positions, indices[t]!, indices[t + 1]!, indices[t + 2]!);
      expect(area).toBeGreaterThan(1e-10);
    }
  });
});
