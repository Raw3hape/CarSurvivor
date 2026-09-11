/** Clay Earth look. Art direction numbers. Do not scatter hex in shaders. */

export const LOOK = {
  space: 0xe7e2d8,
  star: 0xb9b3a6,
  starCount: 220,
  clay: {
    unpainted: 0xf4efe6,
    groove: 0xc9c0b4,
    roughness: 0.82,
    metalness: 0.02,
  },
  glaze: {
    roughness: 0.42,
    metalness: 0.03,
    wetEdge: 0.04,
  },
  height: {
    maxDisplacement: 0,
    closeStart: 2.4,
    closeFull: 1.15,
  },
  light: {
    key: { color: 0xfff6ea, intensity: 1.15, x: 5.5, y: 6.2, z: 3.2 },
    fill: { color: 0xe8f0ff, intensity: 0.95, x: -5.2, y: 3.4, z: -4.1 },
    rim: { color: 0xffffff, intensity: 0.7, x: -1.4, y: -5.5, z: 2.2 },
    back: { color: 0xfff3e0, intensity: 0.65, x: 2.2, y: -3.8, z: -5.6 },
    ambient: { color: 0xfffaf3, intensity: 0.85 },
  },
  ocean: 0xd5e4ee,
  globe: {
    displayRadius: 2,
    flattenY: 1,
  },
  camera: {
    fov: 40,
    near: 0.05,
    far: 80,
    spaceDistance: 11,
    countryDistance: 4.2,
    adminDistance: 3.55,
    cityDistance: 3.25,
    minDistance: 2.95,
    maxDistance: 14,
    spin: {
      autoDegPerSec: 9,
      inertia: 1.55,
      sensitivity: 0.26,
    },
  },
  exposure: 1.12,
} as const;
