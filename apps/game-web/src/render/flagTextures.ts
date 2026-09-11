import * as THREE from 'three/webgpu';
import { flagPngUrl } from '../world/flagUrl';

const loader = new THREE.TextureLoader();
loader.setCrossOrigin('anonymous');

const cache = new Map<string, THREE.Texture | 'loading' | 'fail'>();

export function flagTexture(iso: string): THREE.Texture | null {
  const hit = cache.get(iso);
  if (hit instanceof THREE.Texture) return hit;
  if (hit === 'loading' || hit === 'fail') return null;
  cache.set(iso, 'loading');
  loader.load(
    flagPngUrl(iso, 320),
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
      cache.set(iso, texture);
    },
    undefined,
    () => {
      cache.set(iso, 'fail');
    },
  );
  return null;
}

export function disposeFlagTextures(): void {
  for (const value of cache.values()) {
    if (value instanceof THREE.Texture) value.dispose();
  }
  cache.clear();
}
