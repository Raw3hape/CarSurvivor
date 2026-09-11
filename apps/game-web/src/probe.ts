import type { LabBackend } from './engine/renderer';

export type ProbeState = {
  ready: boolean;
  backend: LabBackend;
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

export function writeProbe(state: ProbeState): void {
  window.__CS_WEB__ = state;
}

export function consumeCmd(): WebLabCmd | null {
  const cmd = window.__CS_WEB_CMD__;
  if (!cmd) return null;
  window.__CS_WEB_CMD__ = null;
  return cmd;
}
