import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

declare global {
  interface Window {
    __CS_WEB__?: {
      ready: boolean;
      backend: string;
      physics: boolean;
      fps: number;
      playable: 'clay-earth';
      originId: string | null;
      selectedId: string | null;
      paint: number;
      lod: string;
      progress: number;
    };
    __CS_WEB_CMD__?: {
      originQuery?: string;
      tap?: boolean;
      boost?: boolean;
      unlockId?: string;
    } | null;
  }
}

export type Probe = NonNullable<Window['__CS_WEB__']>;

export function probe(page: Page) {
  return page.evaluate(() => window.__CS_WEB__);
}

export function evidencePng(name: `pw-${string}.png`) {
  const dir = path.resolve(process.cwd(), '../../artifacts/evidence');
  mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}

export async function waitReady(page: Page, timeout = 60_000) {
  await page.waitForFunction(() => window.__CS_WEB__?.ready === true, undefined, { timeout });
}

function parseRgb(color: string): [number, number, number] | null {
  const m = color.match(/rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function isDarkRgb(color: string): boolean {
  const rgb = parseRgb(color);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 48;
}
