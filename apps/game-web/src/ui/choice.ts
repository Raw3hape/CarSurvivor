import { formatPaint, kindLabel } from './model';

export type UnlockOfferView = {
  id: string;
  name: string;
  kind: string;
  cost: number;
  affordable: boolean;
};

export type ChoiceView = {
  el: HTMLElement;
  update: (offers: UnlockOfferView[]) => void;
};

export function mountChoice(handlers: { onUnlock: (id: string) => void }): ChoiceView {
  const el = document.createElement('section');
  el.className = 'hud-panel hud-choice';
  el.innerHTML = `
    <div class="hud-offers"></div>
    <p class="hud-soon">Широкая кисть — скоро</p>
  `;
  const list = el.querySelector('.hud-offers');
  if (!(list instanceof HTMLElement)) {
    throw new Error('choice markup incomplete');
  }

  list.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button[data-id]');
    if (!(button instanceof HTMLButtonElement) || button.disabled) return;
    const id = button.dataset.id;
    if (id) handlers.onUnlock(id);
  });

  let key = '';

  return {
    el,
    update: (offers) => {
      const shown = offers.slice(0, 4);
      const next = shown
        .map((offer) => `${offer.id}\0${offer.name}\0${offer.kind}\0${offer.cost}\0${offer.affordable ? 1 : 0}`)
        .join('|');
      if (next === key) return;
      key = next;
      list.replaceChildren(
        ...shown.map((offer) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'hud-offer';
          button.dataset.id = offer.id;
          button.disabled = !offer.affordable;
          const name = document.createElement('span');
          name.className = 'hud-offer-name';
          name.textContent = offer.name;
          const kind = document.createElement('span');
          kind.className = 'hud-offer-kind';
          kind.textContent = kindLabel(offer.kind);
          const cost = document.createElement('span');
          cost.className = 'hud-offer-cost';
          cost.textContent = `Открыть · ${formatPaint(offer.cost)}`;
          button.append(name, kind, cost);
          return button;
        }),
      );
    },
  };
}
