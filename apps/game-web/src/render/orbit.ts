import type { GlobeCamera } from './camera';

export function applyOrbit(camera: GlobeCamera, dx: number, dy: number, wheel: number): void {
  if (dx || dy) camera.orbit(dx, dy);
  if (wheel) camera.dolly(wheel);
}
