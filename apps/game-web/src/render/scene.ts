import * as THREE from 'three/webgpu';
import type { GameState } from '../sim/types';
import type { WorldIndex } from '../world/catalog';
import { createGlobeCamera } from './camera';
import { createGlobe } from './globe';
import { applyOrbit } from './orbit';
import { pickLonLat as pickLonLatAt, pickRegionId } from './picking';
import { applySpace } from './space';
import { createStars } from './stars';

export type GlobeScene = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  attach: (index: WorldIndex) => void;
  sync: (state: GameState, index: WorldIndex) => void;
  pickLonLat: (ndcX: number, ndcY: number) => { lon: number; lat: number } | null;
  pickRegion: (ndcX: number, ndcY: number, index: WorldIndex, state: GameState) => string | null;
  orbit: (dx: number, dy: number) => void;
  dolly: (logDelta: number) => void;
  setHeld: (held: boolean) => void;
  flyTo: (lon: number, lat: number, distance: number) => void;
  tickCamera: (dt: number) => void;
  distance: () => number;
  resize: () => void;
  dispose: () => void;
};

export function createGlobeScene(): GlobeScene {
  const scene = new THREE.Scene();
  applySpace(scene);
  const stars = createStars();
  scene.add(stars);
  const globe = createGlobe();
  scene.add(globe.group);
  const rig = createGlobeCamera();

  return {
    scene,
    camera: rig.camera,
    attach: (index) => globe.attach(index),
    sync: (state, index) => globe.sync(state, index, rig.distance()),
    pickLonLat: (x, y) => pickLonLatAt(rig.camera, globe.pickSphere, x, y),
    pickRegion: (x, y, index, state) => pickRegionId(rig.camera, globe.land, globe.pickSphere, x, y, index, state),
    orbit: (dx, dy) => applyOrbit(rig, dx, dy, 0),
    dolly: (logDelta) => applyOrbit(rig, 0, 0, logDelta),
    setHeld: (held) => rig.setHeld(held),
    flyTo: (lon, lat, distance) => rig.flyTo(lon, lat, distance),
    tickCamera: (dt) => {
      stars.rotation.y += dt * 0.0035;
      rig.tick(dt);
    },
    distance: () => rig.distance(),
    resize: () => rig.resize(),
    dispose: () => {
      globe.dispose();
      stars.geometry.dispose();
      const mat = stars.material;
      if (!Array.isArray(mat)) mat.dispose();
    },
  };
}
