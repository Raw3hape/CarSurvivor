import * as THREE from 'three/webgpu';
import { lonLatToWorld } from '../world/project';
import { LOOK } from './look';

export type GlobeCamera = {
  camera: THREE.PerspectiveCamera;
  lon: number;
  lat: number;
  radius: number;
  orbit: (dx: number, dy: number) => void;
  dolly: (logDelta: number) => void;
  flyTo: (lon: number, lat: number, distance: number) => void;
  tick: (dt: number) => void;
  distance: () => number;
  resize: () => void;
};

export function createGlobeCamera(): GlobeCamera {
  const camera = new THREE.PerspectiveCamera(
    LOOK.camera.fov,
    window.innerWidth / Math.max(1, window.innerHeight),
    LOOK.camera.near,
    LOOK.camera.far,
  );
  let lon = 20;
  let lat = 18;
  let radius: number = LOOK.camera.spaceDistance;
  let tLon = lon;
  let tLat = lat;
  let tRadius: number = radius;

  const apply = () => {
    const pos = lonLatToWorld({ lon, lat }, radius);
    camera.position.set(pos.x, pos.y, pos.z);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 1, 0);
  };
  apply();

  return {
    camera,
    get lon() {
      return lon;
    },
    get lat() {
      return lat;
    },
    get radius() {
      return radius;
    },
    orbit: (dx, dy) => {
      tLon -= dx * 0.18;
      tLat = Math.min(88, Math.max(-88, tLat + dy * 0.14));
    },
    dolly: (logDelta) => {
      tRadius = Math.min(LOOK.camera.maxDistance, Math.max(LOOK.camera.minDistance, tRadius * Math.exp(logDelta)));
    },
    flyTo: (nextLon, nextLat, distance) => {
      tLon = nextLon;
      tLat = Math.min(88, Math.max(-88, nextLat));
      tRadius = Math.min(LOOK.camera.maxDistance, Math.max(LOOK.camera.minDistance, distance));
    },
    tick: (dt) => {
      const k = 1 - Math.exp(-dt * 3.1);
      lon = lerpAngle(lon, tLon, k);
      lat += (tLat - lat) * k;
      radius += (tRadius - radius) * k;
      apply();
    },
    distance: () => radius,
    resize: () => {
      camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
      camera.updateProjectionMatrix();
    },
  };
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = ((b - a + 540) % 360) - 180;
  return a + d * t;
}
