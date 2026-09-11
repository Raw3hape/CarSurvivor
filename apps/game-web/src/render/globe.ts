import * as THREE from 'three/webgpu';
import type { GameState } from '../sim/types';
import type { WorldIndex } from '../world/catalog';
import { regionFlag } from '../world/catalog';
import { lonLatToWorld } from '../world/project';
import { tessellatePolygons, unwrapRing } from '../world/sphereMesh';
import { isCircleGeom, type Region } from '../world/types';
import { isoFromFlag } from '../world/flagUrl';
import { disposeFlagTextures, flagTexture } from './flagTextures';
import { flagSample, mixClay } from './glaze';
import { LOOK } from './look';

export type RegionMesh = {
  id: string;
  mesh: THREE.Mesh;
  kind: Region['kind'];
  lastProgress: number;
  lastPainting: boolean;
  lastTex: boolean;
};

const CLAY_RGB = {
  r: ((LOOK.clay.unpainted >> 16) & 255) / 255,
  g: ((LOOK.clay.unpainted >> 8) & 255) / 255,
  b: (LOOK.clay.unpainted & 255) / 255,
};

export function createGlobe(): {
  group: THREE.Group;
  land: THREE.Group;
  pickSphere: THREE.Mesh;
  attach: (index: WorldIndex) => void;
  sync: (state: GameState, index: WorldIndex, distance: number) => void;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const land = new THREE.Group();
  group.add(land);

  const oceanMat = new THREE.MeshStandardNodeMaterial({
    color: LOOK.ocean,
    roughness: 0.98,
    metalness: 0.04,
  });
  const pickSphere = new THREE.Mesh(
    new THREE.SphereGeometry(LOOK.globe.displayRadius * 0.992, 96, 64),
    oceanMat,
  );
  pickSphere.scale.y = LOOK.globe.flattenY;
  group.add(pickSphere);

  const grooveMat = new THREE.LineBasicNodeMaterial({ color: LOOK.clay.groove, transparent: true, opacity: 0.7 });

  const countryMeshes: RegionMesh[] = [];
  let borders: THREE.LineSegments | null = null;

  const attach = (index: WorldIndex) => {
    clearGroup(land, countryMeshes);
    if (borders) {
      group.remove(borders);
      borders.geometry.dispose();
      borders = null;
    }
    const borderPos: number[] = [];
    for (const region of index.countries) {
      const built = buildRegionMesh(region, index);
      if (!built) continue;
      land.add(built.mesh);
      countryMeshes.push(built);
      pushBorders(region, borderPos);
    }
    if (borderPos.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(borderPos, 3));
      borders = new THREE.LineSegments(geo, grooveMat);
      group.add(borders);
    }
  };

  const sync = (state: GameState, index: WorldIndex, _distance: number) => {
    for (const item of countryMeshes) paintMesh(item, state, index);
  };

  return {
    group,
    land,
    pickSphere,
    attach,
    sync,
    dispose: () => {
      oceanMat.dispose();
      grooveMat.dispose();
      pickSphere.geometry.dispose();
      borders?.geometry.dispose();
      disposeFlagTextures();
    },
  };
}

function clearGroup(group: THREE.Group, bucket: RegionMesh[]): void {
  bucket.length = 0;
  while (group.children.length) {
    const child = group.children[0];
    if (child) {
      disposeMesh(child);
      group.remove(child);
    }
  }
}

function disposeMesh(object: THREE.Object3D): void {
  if (!(object instanceof THREE.Mesh)) return;
  object.geometry.dispose();
  const mat = object.material;
  if (Array.isArray(mat)) mat.forEach((item) => item.dispose());
  else mat.dispose();
}

function makeLandMat(): THREE.MeshStandardNodeMaterial {
  return new THREE.MeshStandardNodeMaterial({
    vertexColors: true,
    roughness: LOOK.clay.roughness,
    metalness: LOOK.clay.metalness,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
}

function paintMesh(item: RegionMesh, state: GameState, index: WorldIndex): void {
  const runtime = state.regions[item.id];
  const progress = runtime?.progress ?? 0;
  const painting = runtime?.painting ?? false;
  const region = index.byId.get(item.id);
  if (!region) return;
  const flag = regionFlag(index, region);
  const iso = isoFromFlag(flag, region);
  const tex = iso ? flagTexture(iso) : null;
  const texReady = !!tex;
  if (item.lastProgress === progress && item.lastPainting === painting && item.lastTex === texReady) return;
  item.lastProgress = progress;
  item.lastPainting = painting;
  item.lastTex = texReady;
  const shown = progress;
  const mat = item.mesh.material as THREE.MeshStandardNodeMaterial;
  if (tex && shown > 0.02) {
    if (mat.map !== tex) {
      mat.map = tex;
      mat.vertexColors = false;
      mat.needsUpdate = true;
    }
    const clayR = ((LOOK.clay.unpainted >> 16) & 255) / 255;
    const clayG = ((LOOK.clay.unpainted >> 8) & 255) / 255;
    const clayB = (LOOK.clay.unpainted & 255) / 255;
    const wet = painting && shown < 1 ? 1.08 : 1;
    mat.color.setRGB(
      Math.min(1, (clayR + (1 - clayR) * shown) * wet),
      Math.min(1, (clayG + (1 - clayG) * shown) * wet),
      Math.min(1, (clayB + (1 - clayB) * shown) * wet),
    );
    mat.roughness = LOOK.clay.roughness + (LOOK.glaze.roughness - LOOK.clay.roughness) * shown;
    return;
  }
  const color = item.mesh.geometry.getAttribute('color');
  const uv = item.mesh.geometry.getAttribute('uv');
  if (!color || !uv) return;
  for (let i = 0; i < color.count; i += 1) {
    const sample = flagSample(flag, uv.getX(i), uv.getY(i));
    const mixed = mixClay(sample, shown, painting);
    color.setXYZ(i, mixed.r, mixed.g, mixed.b);
  }
  color.needsUpdate = true;
}

function buildRegionMesh(region: Region, index: WorldIndex): RegionMesh | null {
  const geometry = regionGeometry(region);
  if (!geometry) return null;
  const mesh = new THREE.Mesh(geometry, makeLandMat());
  mesh.userData.regionId = region.id;
  const built: RegionMesh = {
    id: region.id,
    mesh,
    kind: region.kind,
    lastProgress: -1,
    lastPainting: false,
    lastTex: false,
  };
  const dummy = { regions: { [region.id]: { progress: 0, painting: false } } } as unknown as GameState;
  paintMesh(built, dummy, index);
  return built;
}

function regionGeometry(region: Region): THREE.BufferGeometry | null {
  if (isCircleGeom(region.geom)) return null;
  const data = tessellatePolygons(
    region.geom.polygons,
    LOOK.globe.displayRadius * 1.004,
    LOOK.globe.flattenY,
    LOOK.globe.displayRadius * 0.055,
  );
  if (!data) return null;
  const colors = new Float32Array((data.positions.length / 3) * 3);
  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = CLAY_RGB.r;
    colors[i + 1] = CLAY_RGB.g;
    colors[i + 2] = CLAY_RGB.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
  geometry.setIndex(data.indices);
  geometry.computeVertexNormals();
  return geometry;
}

function pushBorders(region: Region, into: number[]): void {
  if (isCircleGeom(region.geom)) return;
  const polygons = region.geom.polygons;
  const radius = LOOK.globe.displayRadius * 1.003;
  for (const polygon of polygons) {
    const outer = polygon.rings[0];
    if (!outer || outer.length < 2) continue;
    const ring = unwrapRing(outer);
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      const pa = lonLatToWorld(a, radius);
      const pb = lonLatToWorld(b, radius);
      into.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
    }
  }
}
