/** Clay Earth look. Art direction numbers. Do not scatter hex in shaders. */

export const LOOK = {
  space: 0x08070f,
  star: 0xd2cbb8,
  starCount: 820,
  clay: {
    unpainted: 0x1f1914,
    groove: 0x110d0b,
    roughness: 0.96,
    metalness: 0.02,
  },
  glaze: {
    roughness: 0.34,
    metalness: 0.04,
    wetEdge: 0.05,
  },
  height: {
    maxDisplacement: 0.03,
    closeStart: 2.4,
    closeFull: 1.15,
  },
  light: {
    key: { color: 0xe8c4a4, intensity: 1.2, x: 6.2, y: 4.4, z: 2.8 },
    fill: { color: 0x4e5d74, intensity: 0.38, x: -4.5, y: 1.2, z: -3.2 },
    rim: { color: 0x8fa0b5, intensity: 0.4, x: -2.2, y: 3.6, z: -5.4 },
    ambient: { color: 0x12131a, intensity: 0.32 },
  },
  ocean: 0x1a1822,
  globe: {
    displayRadius: 2,
    flattenY: 0.96,
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
  exposure: 1.02,
} as const;
