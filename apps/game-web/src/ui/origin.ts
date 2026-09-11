export type OriginView = {
  el: HTMLElement;
};

export function mountOrigin(handlers: {
  onOriginQuery: (query: string) => void;
  onOriginGeo: () => void;
}): OriginView {
  const el = document.createElement('div');
  el.className = 'hud-origin';
  el.innerHTML = `
    <form class="hud-origin-form" autocomplete="off">
      <label class="hud-origin-title" for="hud-origin-query">Откуда ты?</label>
      <div class="hud-origin-row">
        <input
          id="hud-origin-query"
          class="hud-origin-input"
          name="origin"
          type="text"
          placeholder="город, страна"
          spellcheck="false"
          autocapitalize="words"
        />
        <button class="hud-origin-submit" type="submit">Выбрать</button>
      </div>
      <button class="hud-origin-geo" type="button">Моё место</button>
      <p class="hud-origin-help">тап по планете тоже выбирает</p>
    </form>
  `;

  const form = el.querySelector('form');
  const input = el.querySelector('input');
  const geo = el.querySelector('.hud-origin-geo');
  if (!(form instanceof HTMLFormElement) || !(input instanceof HTMLInputElement) || !(geo instanceof HTMLButtonElement)) {
    throw new Error('origin markup incomplete');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    handlers.onOriginQuery(query);
  });
  geo.addEventListener('click', () => {
    handlers.onOriginGeo();
  });

  return { el };
}
