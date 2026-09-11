import * as THREE from 'three/webgpu';
import type { GameState } from '../sim/types';
import type { WorldIndex } from '../world/catalog';
import { smallestRegionAt } from '../world/geo';
import { worldToLonLat } from '../world/project';

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

export function pickLonLat(
  camera: THREE.Camera,
  sphere: THREE.Object3D,
  ndcX: number,
  ndcY: number,
): { lon: number; lat: number } | null {
  ndc.set(ndcX, ndcY);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(sphere, false);
  const hit = hits[0];
  if (!hit) return null;
  return worldToLonLat(hit.point.x, hit.point.y, hit.point.z);
}

export function pickRegionId(
  camera: THREE.Camera,
  land: THREE.Object3D,
  sphere: THREE.Object3D,
  ndcX: number,
  ndcY: number,
  index: WorldIndex,
  _state: GameState,
): string | null {
  ndc.set(ndcX, ndcY);
  raycaster.setFromCamera(ndc, camera);
  const meshHits = raycaster.intersectObject(land, true);
  for (const hit of meshHits) {
    const id = hit.object.userData.regionId;
    if (typeof id === 'string' && index.byId.has(id)) return id;
  }
  const lonLat = pickLonLat(camera, sphere, ndcX, ndcY);
  if (!lonLat) return null;
  return smallestRegionAt(lonLat, index.countries)?.id ?? null;
}
