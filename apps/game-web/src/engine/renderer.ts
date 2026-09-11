import * as THREE from 'three/webgpu';

export type LabBackend = 'webgpu' | 'webgl2';

export type LabRenderer = {
  renderer: THREE.WebGPURenderer;
  backend: LabBackend;
  resize: () => void;
  dispose: () => void;
};

export async function createLabRenderer(canvas: HTMLCanvasElement): Promise<LabRenderer> {
  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = false;
  await renderer.init();

  const backend: LabBackend = isWebGLBackend(renderer) ? 'webgl2' : 'webgpu';

  const resize = () => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };

  return {
    renderer,
    backend,
    resize,
    dispose: () => {
      renderer.setAnimationLoop(null);
      renderer.dispose();
    },
  };
}

function isWebGLBackend(renderer: THREE.WebGPURenderer): boolean {
  const backend = renderer.backend as { isWebGLBackend?: boolean; constructor?: { name?: string } };
  if (backend.isWebGLBackend) return true;
  return (backend.constructor?.name ?? '').toLowerCase().includes('webgl');
}
