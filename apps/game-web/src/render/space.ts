import * as THREE from 'three/webgpu';
import { LOOK } from './look';

export function applySpace(scene: THREE.Scene): void {
  scene.background = new THREE.Color(LOOK.space);
  scene.fog = null;

  const ambient = new THREE.AmbientLight(LOOK.light.ambient.color, LOOK.light.ambient.intensity);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(LOOK.light.key.color, LOOK.light.key.intensity);
  key.position.set(LOOK.light.key.x, LOOK.light.key.y, LOOK.light.key.z);
  scene.add(key);

  const fill = new THREE.DirectionalLight(LOOK.light.fill.color, LOOK.light.fill.intensity);
  fill.position.set(LOOK.light.fill.x, LOOK.light.fill.y, LOOK.light.fill.z);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(LOOK.light.rim.color, LOOK.light.rim.intensity);
  rim.position.set(LOOK.light.rim.x, LOOK.light.rim.y, LOOK.light.rim.z);
  scene.add(rim);
}
