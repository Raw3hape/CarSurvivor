import * as THREE from 'three/webgpu';
import { LOOK } from './look';

export function createStars(): THREE.Points {
  const count = LOOK.starCount;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const star = new THREE.Color(LOOK.star);
  for (let i = 0; i < count; i += 1) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = 18 + Math.random() * 22;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const dim = 0.35 + Math.random() * 0.65;
    colors[i * 3] = star.r * dim;
    colors[i * 3 + 1] = star.g * dim;
    colors[i * 3 + 2] = star.b * dim;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsNodeMaterial({
    size: 0.035,
    vertexColors: true,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
