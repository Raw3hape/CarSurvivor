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
  setHeld: (held: boolean) => void;
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
  let tRadius: number = radius;
  let vLon = 0;
  let vLat = 0;
  let held = false;
  let userSpun = false;
  let flying = false;

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
      if (!dx && !dy) return;
      const s = LOOK.camera.spin.sensitivity;
      const dLon = dx * s;
      const dLat = dy * s * 0.72;
      lon -= dLon;
      lat = Math.min(88, Math.max(-88, lat + dLat));
      vLon = -dLon * 18;
      vLat = dLat * 18;
      userSpun = true;
      flying = false;
    },
    dolly: (logDelta) => {
      tRadius = Math.min(LOOK.camera.maxDistance, Math.max(LOOK.camera.minDistance, tRadius * Math.exp(logDelta)));
    },
    flyTo: (nextLon, nextLat, distance) => {
      lon = nextLon;
      lat = Math.min(88, Math.max(-88, nextLat));
      tRadius = Math.min(LOOK.camera.maxDistance, Math.max(LOOK.camera.minDistance, distance));
      vLon = 0;
      vLat = 0;
      flying = true;
      userSpun = true;
    },
    setHeld: (next) => {
      held = next;
      if (next) {
        userSpun = true;
        vLon = 0;
        vLat = 0;
      }
    },
    tick: (dt) => {
      if (!held) {
        lon += vLon * dt;
        lat = Math.min(88, Math.max(-88, lat + vLat * dt));
        const damp = Math.exp(-dt * LOOK.camera.spin.inertia);
        vLon *= damp;
        vLat *= damp;
        if (!flying && !userSpun && radius > LOOK.camera.countryDistance) {
          lon += LOOK.camera.spin.autoDegPerSec * dt;
        }
      }
      const k = 1 - Math.exp(-dt * 3.1);
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
