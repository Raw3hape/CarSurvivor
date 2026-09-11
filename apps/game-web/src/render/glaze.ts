import type { FlagVisual } from '../world/types';
import { LOOK } from './look';

export function parseHex(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace('#', '').trim();
  const n = raw.length === 3
    ? parseInt(raw.split('').map((ch) => ch + ch).join(''), 16)
    : parseInt(raw.padEnd(6, '0').slice(0, 6), 16);
  if (!Number.isFinite(n)) return { r: 0.45, g: 0.38, b: 0.32 };
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function flagSample(flag: FlagVisual | undefined, u: number, v: number): { r: number; g: number; b: number } {
  const colors = flag?.colors.length ? flag.colors.map(parseHex) : [{ r: 0.55, g: 0.48, b: 0.4 }];
  const pattern = flag?.pattern ?? 'solid';
  let t = 1 - v;
  if (pattern === 'vertical' || pattern === 'pale') t = u;
  else if (pattern === 'cross' || pattern === 'saltire') t = Math.abs(u - 0.5) < 0.12 || Math.abs(v - 0.5) < 0.12 ? 0 : 1;
  else if (pattern === 'canton') t = u < 0.38 && v > 0.55 ? 0 : Math.max(u, 1 - v);
  else if (pattern === 'horizontal' || pattern === 'fess' || pattern === 'solid') t = 1 - v;
  const x = Math.min(colors.length - 1, Math.max(0, Math.floor(t * colors.length)));
  return colors[x] ?? colors[0]!;
}

export function mixClay(flag: { r: number; g: number; b: number }, progress: number, painting: boolean): {
  r: number;
  g: number;
  b: number;
  roughness: number;
} {
  const t = Math.min(1, Math.max(0, progress));
  const wet = painting ? LOOK.glaze.wetEdge * 8 : 0;
  const clay = {
    r: ((LOOK.clay.unpainted >> 16) & 255) / 255,
    g: ((LOOK.clay.unpainted >> 8) & 255) / 255,
    b: (LOOK.clay.unpainted & 255) / 255,
  };
  const lip = t > 0 && t < 1 ? 1 + wet : 1;
  return {
    r: Math.min(1, (clay.r + (flag.r - clay.r) * t) * lip),
    g: Math.min(1, (clay.g + (flag.g - clay.g) * t) * lip),
    b: Math.min(1, (clay.b + (flag.b - clay.b) * t) * lip),
    roughness: LOOK.clay.roughness + (LOOK.glaze.roughness - LOOK.clay.roughness) * t,
  };
}
