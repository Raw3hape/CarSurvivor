import * as THREE from 'three/webgpu';
import type { GameState } from '../sim/types';
import type { WorldIndex } from '../world/catalog';
import { cityVisualKm } from '../world/cityScale';
import { pointInRegion, smallestRegionAt } from '../world/geo';
import { haversineKm, worldToLonLat } from '../world/project';
import { isCircleGeom, type LonLat, type Region } from '../world/types';

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

export function visibleRegions(index: WorldIndex, state: GameState): Region[] {
  if (state.lod === 'city' && state.focusedAdminId) {
    const cities = index.childrenOf(state.focusedAdminId).filter((region) => region.kind === 'city');
    if (cities.length) return cities;
  }
  if (state.lod !== 'country' && state.focusedCountryId) {
    const admin = index.childrenOf(state.focusedCountryId).filter((region) => region.kind === 'admin1');
    if (admin.length) return admin;
  }
  return index.countries;
}

export function pickRegionId(
  camera: THREE.Camera,
  sphere: THREE.Object3D,
  ndcX: number,
  ndcY: number,
  index: WorldIndex,
  state: GameState,
): string | null {
  const lonLat = pickLonLat(camera, sphere, ndcX, ndcY);
  if (!lonLat) return null;
  if (!state.originId) {
    const city = smallestHit(lonLat, index.catalog.regions, new Set(['city']));
    if (city) return city.id;
    const admin = smallestHit(lonLat, index.catalog.regions, new Set(['admin1']));
    if (admin) return admin.id;
    return smallestHit(lonLat, index.countries)?.id ?? null;
  }
  const visible = visibleRegions(index, state);
  const hit = smallestHit(lonLat, visible);
  if (hit) return hit.id;
  if (state.lod === 'city' && state.focusedAdminId) return state.focusedAdminId;
  if (state.focusedCountryId) {
    const admin = smallestHit(
      lonLat,
      index.childrenOf(state.focusedCountryId).filter((region) => region.kind === 'admin1'),
    );
    if (admin) return admin.id;
  }
  return smallestRegionAt(lonLat, index.countries)?.id ?? null;
}

function hitsRegion(point: LonLat, region: Region): boolean {
  if (region.kind === 'city' && isCircleGeom(region.geom)) {
    return haversineKm(point, region.geom.circle.center) <= cityVisualKm(region.geom.circle.radiusKm);
  }
  return pointInRegion(point, region);
}

function smallestHit(point: LonLat, regions: readonly Region[], kinds?: ReadonlySet<Region['kind']>): Region | null {
  let best: Region | null = null;
  for (const region of regions) {
    if (kinds && !kinds.has(region.kind)) continue;
    if (!hitsRegion(point, region)) continue;
    if (!best || region.areaKm2 < best.areaKm2) best = region;
  }
  return best;
}
