import { LOOK } from './look';
import { displayRadius } from '../world/project';

export function closeFactor(distance: number, radius = displayRadius()): number {
  const ratio = distance / radius;
  const a = LOOK.height.closeStart;
  const b = LOOK.height.closeFull;
  if (ratio >= a) return 0;
  if (ratio <= b) return 1;
  return (a - ratio) / (a - b);
}

export function landScale(distance: number, radius = displayRadius()): number {
  return 1 + LOOK.height.maxDisplacement * closeFactor(distance, radius);
}
