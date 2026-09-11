import { formatArea, kindLabel } from './model';

export type RegionSelected = {
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
};

export type RegionCardView = {
  el: HTMLElement;
  update: (selected: RegionSelected | null) => void;
};

export function mountRegionCard(handlers: {
  onBoost: () => void;
  onDismiss: () => void;
}): RegionCardView {
  const el = document.createElement('section');
  el.className = 'hud-panel hud-card';
  el.hidden = true;
  el.innerHTML = `
    <button class="hud-dismiss" type="button">снять</button>
    <h2 class="hud-card-name"></h2>
    <p class="hud-card-kind"></p>
    <p class="hud-card-area"></p>
    <div class="hud-glaze" role="progressbar" aria-valuemin="0" aria-valuemax="100">
      <span class="hud-glaze-track"><span class="hud-glaze-fill"></span></span>
      <span class="hud-glaze-pct"></span>
    </div>
    <ul class="hud-facts"></ul>
    <div class="hud-flags"></div>
    <button class="hud-boost" type="button">Ещё слой</button>
  `;

  const nameEl = el.querySelector('.hud-card-name');
  const kindEl = el.querySelector('.hud-card-kind');
  const areaEl = el.querySelector('.hud-card-area');
  const glaze = el.querySelector('.hud-glaze');
  const fill = el.querySelector('.hud-glaze-fill');
  const pctEl = el.querySelector('.hud-glaze-pct');
  const factsEl = el.querySelector('.hud-facts');
  const flagsEl = el.querySelector('.hud-flags');
  const boost = el.querySelector('.hud-boost');
  const dismiss = el.querySelector('.hud-dismiss');
  if (
    !(nameEl instanceof HTMLElement) ||
    !(kindEl instanceof HTMLElement) ||
    !(areaEl instanceof HTMLElement) ||
    !(glaze instanceof HTMLElement) ||
    !(fill instanceof HTMLElement) ||
    !(pctEl instanceof HTMLElement) ||
    !(factsEl instanceof HTMLElement) ||
    !(flagsEl instanceof HTMLElement) ||
    !(boost instanceof HTMLButtonElement) ||
    !(dismiss instanceof HTMLButtonElement)
  ) {
    throw new Error('region card markup incomplete');
  }

  dismiss.addEventListener('click', () => handlers.onDismiss());
  boost.addEventListener('click', () => handlers.onBoost());

  let factsKey = '';
  let flagsKey = '';

  return {
    el,
    update: (selected) => {
      if (!selected) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      write(nameEl, selected.name);
      const kind = kindLabel(selected.kind);
      write(kindEl, selected.parentName ? `${kind} · ${selected.parentName}` : kind);
      write(areaEl, formatArea(selected.areaKm2));

      const progress = clamp01(selected.progress);
      const pct = Math.round(progress * 100);
      const pctText = `${pct}%`;
      write(pctEl, pctText);
      glaze.setAttribute('aria-valuenow', String(pct));
      glaze.setAttribute('aria-valuetext', pctText);
      fill.style.width = `${pct}%`;
      fill.classList.toggle('is-wet', selected.painting);
      const a = selected.flagColors[0] ?? '';
      const b = selected.flagColors[1] ?? a;
      fill.style.setProperty('--glaze-a', a || 'var(--glaze)');
      fill.style.setProperty('--glaze-b', b || 'var(--glaze)');

      const nextFacts = selected.facts.join('\n');
      if (nextFacts !== factsKey) {
        factsKey = nextFacts;
        factsEl.replaceChildren(
          ...selected.facts.map((line) => {
            const item = document.createElement('li');
            item.textContent = line;
            return item;
          }),
        );
      }
      factsEl.hidden = selected.facts.length === 0;

      const nextFlags = selected.flagColors.join(',');
      if (nextFlags !== flagsKey) {
        flagsKey = nextFlags;
        flagsEl.replaceChildren(
          ...selected.flagColors.map((color) => {
            const chip = document.createElement('span');
            chip.className = 'hud-chip';
            chip.style.background = color;
            chip.title = color;
            return chip;
          }),
        );
      }
      flagsEl.hidden = selected.flagColors.length === 0;

      boost.hidden = !(selected.unlocked && selected.progress < 1);
    },
  };
}

function write(node: HTMLElement, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
