import { LOOK } from '../render/look';
import type { LodLevel } from './types';

export function lodForDistance(distance: number): LodLevel {
  if (distance >= LOOK.camera.countryDistance) return 'country';
  if (distance >= LOOK.camera.adminDistance) return 'admin1';
  return 'city';
}
