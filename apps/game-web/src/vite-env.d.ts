/// <reference types="vite/client" />

type WebLabBackend = 'webgpu' | 'webgl2';

type WebLabCmd = {
  originQuery?: string;
  originLonLat?: { lon: number; lat: number };
  tap?: boolean;
  boost?: boolean;
  unlockId?: string;
  pickNdc?: { x: number; y: number };
};

interface Window {
  __CS_WEB__?: {
    ready: boolean;
    backend: WebLabBackend;
    physics: boolean;
    fps: number;
    speed: number;
    position: { x: number; y: number; z: number };
    playable: 'clay-earth';
    originId: string | null;
    selectedId: string | null;
    paint: number;
    lod: string;
    progress: number;
  };
  /** @deprecated car lab hold. Ignored by Clay Earth. */
  __CS_WEB_INPUT__?: { throttle: number; steer: number } | null;
  __CS_WEB_CMD__?: WebLabCmd | null;
}
