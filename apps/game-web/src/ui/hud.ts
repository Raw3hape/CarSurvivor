import { mountChoice } from './choice';
import { formatPaint, kindLabel } from './model';
import { mountOrigin } from './origin';
import { mountRegionCard } from './regionCard';

export type HudHandlers = {
  onOriginQuery: (query: string) => void;
  onOriginGeo: () => void;
  onBoost: () => void;
  onUnlock: (id: string) => void;
  onDismiss: () => void;
};

export type HudModel = {
  backend: string;
  fps: number;
  paint: number;
  yieldPerSec: number;
  lod: string;
  originName: string | null;
  selected: null | {
    id: string;
    name: string;
    kind: string;
    parentName: string | null;
    areaKm2: number;
    progress: number;
    unlocked: boolean;
    painting: boolean;
    facts: string[];
    flagColors: string[];
    flagSrc: string | null;
  };
  offers: Array<{ id: string; name: string; kind: string; cost: number; affordable: boolean }>;
  phase: 'origin' | 'play';
};

export type HudView = {
  update: (model: HudModel) => void;
};

export function mountHud(root: HTMLElement, handlers: HudHandlers): HudView {
  root.replaceChildren();

  const shell = document.createElement('div');
  shell.className = 'hud-shell';
  shell.lang = 'ru';
  shell.dataset.phase = 'origin';

  const kicker = document.createElement('div');
  kicker.className = 'hud-kicker';
  kicker.textContent = 'web lab';

  const origin = mountOrigin(handlers);
  const instrument = mountInstrument();
  const card = mountRegionCard(handlers);
  const choice = mountChoice(handlers);

  const play = document.createElement('div');
  play.className = 'hud-play';
  const left = document.createElement('div');
  left.className = 'hud-play-left';
  left.append(instrument.el, card.el);
  const right = document.createElement('div');
  right.className = 'hud-play-right';
  right.append(choice.el);
  play.append(left, right);

  shell.append(kicker, origin.el, play);
  root.append(shell);

  return {
    update: (model) => {
      if (shell.dataset.phase !== model.phase) {
        shell.dataset.phase = model.phase;
      }
      instrument.update(model);
      card.update(model.selected);
      choice.update(model.offers);
    },
  };
}

function mountInstrument(): {
  el: HTMLElement;
  update: (model: HudModel) => void;
} {
  const el = document.createElement('section');
  el.className = 'hud-panel hud-instrument';
  el.innerHTML = `
    <p class="hud-home" hidden></p>
    <div class="hud-metrics">
      <div class="hud-metric">
        <b class="hud-paint">0</b>
        <span>глазурь</span>
      </div>
      <div class="hud-metric">
        <b class="hud-yield">0</b>
        <span>в секунду</span>
      </div>
      <div class="hud-metric">
        <b class="hud-lod">—</b>
        <span>масштаб</span>
      </div>
    </div>
    <p class="hud-lab"><span class="hud-fps">0</span> fps · <span class="hud-backend">…</span></p>
  `;
  const home = el.querySelector('.hud-home');
  const paint = el.querySelector('.hud-paint');
  const yieldEl = el.querySelector('.hud-yield');
  const lod = el.querySelector('.hud-lod');
  const fps = el.querySelector('.hud-fps');
  const backend = el.querySelector('.hud-backend');
  if (
    !(home instanceof HTMLElement) ||
    !(paint instanceof HTMLElement) ||
    !(yieldEl instanceof HTMLElement) ||
    !(lod instanceof HTMLElement) ||
    !(fps instanceof HTMLElement) ||
    !(backend instanceof HTMLElement)
  ) {
    throw new Error('instrument markup incomplete');
  }

  return {
    el,
    update: (model) => {
      if (model.originName) {
        home.hidden = false;
        write(home, `дом · ${model.originName}`);
      } else {
        home.hidden = true;
      }
      write(paint, formatPaint(model.paint));
      write(yieldEl, formatPaint(model.yieldPerSec));
      write(lod, kindLabel(model.lod));
      write(fps, String(model.fps));
      write(backend, model.backend);
    },
  };
}

function write(node: HTMLElement, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}
