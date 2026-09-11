import * as THREE from 'three/webgpu';
import { Earcut } from 'three/src/extras/Earcut.js';
import type { GameState } from '../sim/types';
import type { WorldIndex } from '../world/catalog';
import { regionFlag } from '../world/catalog';
import { lonLatToWorld } from '../world/project';
import { isCircleGeom, type LonLat, type Polygon, type Region } from '../world/types';
import { cityVisualKm } from '../world/cityScale';
import { isoFromFlag } from '../world/flagUrl';
import { disposeFlagTextures, flagTexture } from './flagTextures';
import { flagSample, mixClay } from './glaze';
import { landScale } from './height';
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
  pickSphere: THREE.Mesh;
  attach: (index: WorldIndex) => void;
  sync: (state: GameState, index: WorldIndex, distance: number) => void;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const land = new THREE.Group();
  const adminGroup = new THREE.Group();
  const cityGroup = new THREE.Group();
  group.add(land, adminGroup, cityGroup);

  const oceanMat = new THREE.MeshStandardNodeMaterial({
    color: LOOK.ocean,
    roughness: 0.98,
    metalness: 0.04,
  });
  const pickSphere = new THREE.Mesh(
    new THREE.SphereGeometry(LOOK.globe.displayRadius * 0.995, 64, 48),
    oceanMat,
  );
  pickSphere.scale.y = LOOK.globe.flattenY;
  group.add(pickSphere);

  const grooveMat = new THREE.LineBasicNodeMaterial({ color: LOOK.clay.groove, transparent: true, opacity: 0.7 });

  const countryMeshes: RegionMesh[] = [];
  const extraMeshes: RegionMesh[] = [];
  let borders: THREE.LineSegments | null = null;
  let extraBorders: THREE.LineSegments | null = null;
  let builtCountry: string | null = null;
  let builtAdmin: string | null = null;

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

  const sync = (state: GameState, index: WorldIndex, distance: number) => {
    const scale = landScale(distance);
    land.scale.setScalar(scale);
    adminGroup.scale.setScalar(scale * 1.001);
    cityGroup.scale.setScalar(scale * 1.002);

    const showAdmin = state.lod === 'admin1' && !!state.focusedCountryId;
    const showCity = (state.lod === 'city' || state.lod === 'admin1') && !!state.focusedAdminId;
    adminGroup.visible = showAdmin;
    cityGroup.visible = showCity;
    land.visible = true;
    if (extraBorders) extraBorders.visible = showAdmin;

    if (showAdmin && state.focusedCountryId && builtCountry !== state.focusedCountryId) {
      rebuildExtras(adminGroup, extraMeshes, 'admin1', index, state.focusedCountryId);
      builtCountry = state.focusedCountryId;
      rebuildExtraBorders(index, state.focusedCountryId, 'admin1');
    }
    if (showCity && state.focusedAdminId && builtAdmin !== state.focusedAdminId) {
      rebuildExtras(cityGroup, extraMeshes, 'city', index, state.focusedAdminId);
      builtAdmin = state.focusedAdminId;
    }
    if (!showAdmin) {
      builtCountry = null;
    }
    if (!showCity) builtAdmin = null;

    for (const item of countryMeshes) paintMesh(item, state, index);
    for (const item of extraMeshes) paintMesh(item, state, index);
  };

  const rebuildExtraBorders = (index: WorldIndex, parentId: string, kind: Region['kind']) => {
    if (extraBorders) {
      group.remove(extraBorders);
      extraBorders.geometry.dispose();
      extraBorders = null;
    }
    const pos: number[] = [];
    for (const region of index.childrenOf(parentId)) {
      if (region.kind !== kind) continue;
      pushBorders(region, pos);
    }
    if (!pos.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    extraBorders = new THREE.LineSegments(geo, grooveMat);
    group.add(extraBorders);
  };

  return {
    group,
    pickSphere,
    attach,
    sync,
    dispose: () => {
      oceanMat.dispose();
      grooveMat.dispose();
      pickSphere.geometry.dispose();
      borders?.geometry.dispose();
      extraBorders?.geometry.dispose();
      disposeFlagTextures();
    },
  };
}

function rebuildExtras(
  group: THREE.Group,
  bucket: RegionMesh[],
  kind: Region['kind'],
  index: WorldIndex,
  parentId: string,
): void {
  const keep = bucket.filter((item) => item.kind !== kind);
  bucket.length = 0;
  bucket.push(...keep);
  while (group.children.length) {
    const child = group.children[0];
    if (child) {
      disposeMesh(child);
      group.remove(child);
    }
  }
  for (const region of index.childrenOf(parentId)) {
    if (region.kind !== kind) continue;
    const built = buildRegionMesh(region, index);
    if (!built) continue;
    group.add(built.mesh);
    bucket.push(built);
  }
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
    side: THREE.DoubleSide,
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
  const shown = region.kind === 'city' ? Math.max(progress, 0.4) : progress;
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
  const polygons = isCircleGeom(region.geom) ? [circlePolygon(region.geom.circle.center, region.geom.circle.radiusKm)] : region.geom.polygons;
  return triangulate(polygons, region.bbox);
}

function circlePolygon(center: LonLat, radiusKm: number): Polygon {
  const visualKm = cityVisualKm(radiusKm);
  const dLat = visualKm / 110.574;
  const cos = Math.cos((center.lat * Math.PI) / 180);
  const dLon = visualKm / (111.32 * Math.max(0.2, Math.abs(cos)));
  const rings: LonLat[] = [];
  for (let i = 0; i < 18; i += 1) {
    const a = (i / 18) * Math.PI * 2;
    rings.push({ lon: center.lon + Math.cos(a) * dLon, lat: center.lat + Math.sin(a) * dLat });
  }
  return { rings: [rings] };
}

function triangulate(polygons: Polygon[], bbox: Region['bbox']): THREE.BufferGeometry | null {
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const [w, s, e, n] = bbox;
  const lonSpan = Math.max(1e-4, e - w);
  const latSpan = Math.max(1e-4, n - s);

  for (const polygon of polygons) {
    const rings = polygon.rings.map(unwrapRing).filter((ring) => ring.length >= 3);
    if (!rings.length) continue;
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
    if (!tris.length) continue;
    const base = positions.length / 3;
    for (const p of verts) {
      const world = lonLatToWorld(p);
      positions.push(world.x, world.y, world.z);
      uvs.push((p.lon - w) / lonSpan, (p.lat - s) / latSpan);
      colors.push(CLAY_RGB.r, CLAY_RGB.g, CLAY_RGB.b);
    }
    for (const idx of tris) indices.push(base + idx);
  }

  if (indices.length < 3) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  spherizeLongEdges(geometry, LOOK.globe.displayRadius * 0.14);
  ensureOutward(geometry);
  geometry.computeVertexNormals();
  return geometry;
}

function ensureOutward(geometry: THREE.BufferGeometry): void {
  const pos = geometry.getAttribute('position');
  const idx = geometry.getIndex();
  if (!pos || !idx || idx.count < 3) return;
  const ax = pos.getX(idx.getX(0));
  const ay = pos.getY(idx.getX(0));
  const az = pos.getZ(idx.getX(0));
  const bx = pos.getX(idx.getX(1));
  const by = pos.getY(idx.getX(1));
  const bz = pos.getZ(idx.getX(1));
  const cx = pos.getX(idx.getX(2));
  const cy = pos.getY(idx.getX(2));
  const cz = pos.getZ(idx.getX(2));
  const e1x = bx - ax;
  const e1y = by - ay;
  const e1z = bz - az;
  const e2x = cx - ax;
  const e2y = cy - ay;
  const e2z = cz - az;
  const nx = e1y * e2z - e1z * e2y;
  const ny = e1z * e2x - e1x * e2z;
  const nz = e1x * e2y - e1y * e2x;
  if (nx * ax + ny * ay + nz * az >= 0) return;
  const arr = Array.from(idx.array as ArrayLike<number>);
  for (let i = 0; i < arr.length; i += 3) {
    const tmp = arr[i + 1]!;
    arr[i + 1] = arr[i + 2]!;
    arr[i + 2] = tmp;
  }
  geometry.setIndex(arr);
}

function spherizeLongEdges(geometry: THREE.BufferGeometry, maxChord: number): void {
  const pos = geometry.getAttribute('position');
  const col = geometry.getAttribute('color');
  const uv = geometry.getAttribute('uv');
  const idx = geometry.getIndex();
  if (!pos || !idx) return;
  const positions = Array.from(pos.array as Float32Array);
  const colors = col ? Array.from(col.array as Float32Array) : [];
  const uvs = uv ? Array.from(uv.array as Float32Array) : [];
  const indices = Array.from(idx.array as ArrayLike<number>);
  const flatten = LOOK.globe.flattenY;
  const project = (x: number, y: number, z: number) => {
    const ny = y / flatten;
    const len = Math.hypot(x, ny, z) || 1;
    const r = LOOK.globe.displayRadius;
    return { x: (x / len) * r, y: (ny / len) * r * flatten, z: (z / len) * r };
  };
  const next = [...indices];
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t]!;
    const b = indices[t + 1]!;
    const c = indices[t + 2]!;
    const ax = positions[a * 3]!;
    const ay = positions[a * 3 + 1]!;
    const az = positions[a * 3 + 2]!;
    const bx = positions[b * 3]!;
    const by = positions[b * 3 + 1]!;
    const bz = positions[b * 3 + 2]!;
    const cx = positions[c * 3]!;
    const cy = positions[c * 3 + 1]!;
    const cz = positions[c * 3 + 2]!;
    const ab = Math.hypot(ax - bx, ay - by, az - bz);
    const bc = Math.hypot(bx - cx, by - cy, bz - cz);
    const ca = Math.hypot(cx - ax, cy - ay, cz - az);
    if (ab < maxChord && bc < maxChord && ca < maxChord) continue;
    const mid = project((ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3);
    const i = positions.length / 3;
    positions.push(mid.x, mid.y, mid.z);
    if (colors.length) {
      colors.push(
        (colors[a * 3]! + colors[b * 3]! + colors[c * 3]!) / 3,
        (colors[a * 3 + 1]! + colors[b * 3 + 1]! + colors[c * 3 + 1]!) / 3,
        (colors[a * 3 + 2]! + colors[b * 3 + 2]! + colors[c * 3 + 2]!) / 3,
      );
    }
    if (uvs.length) {
      uvs.push((uvs[a * 2]! + uvs[b * 2]! + uvs[c * 2]!) / 3, (uvs[a * 2 + 1]! + uvs[b * 2 + 1]! + uvs[c * 2 + 1]!) / 3);
    }
    next[t] = a;
    next[t + 1] = b;
    next[t + 2] = i;
    next.push(b, c, i, c, a, i);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors.length) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  if (uvs.length) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(next);
}

function unwrapRing(ring: LonLat[]): LonLat[] {
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

function pushBorders(region: Region, into: number[]): void {
  const polygons = isCircleGeom(region.geom) ? [circlePolygon(region.geom.circle.center, region.geom.circle.radiusKm)] : region.geom.polygons;
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
