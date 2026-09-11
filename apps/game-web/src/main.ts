import { attachPointer } from './engine/pointer';
import { createLabRenderer } from './engine/renderer';
import { consumeCmd, writeProbe } from './probe';
import { LOOK } from './render/look';
import { createGlobeScene } from './render/scene';
import {
  boostPaint,
  chooseOrigin,
  createGame,
  offers,
  selectRegion,
  setLod,
  startPaint,
  tick,
  unlockRegion,
  yieldOf,
  focusFrom,
} from './sim';
import type { GameState } from './sim/types';
import { mountHud, type HudModel } from './ui/hud';
import { loadWorld, regionFact, regionFlag, type WorldIndex } from './world/catalog';
import { lodForDistance } from './world/lod';
import { findOrigin, originFromLonLat } from './world/origin';
import './styles.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const hudRoot = document.querySelector<HTMLElement>('#hud');
if (!canvas || !hudRoot) {
  throw new Error('web lab markup missing #game or #hud');
}

const lab = await startLab(canvas, hudRoot);

if (import.meta.hot) {
  import.meta.hot.dispose(() => lab.dispose());
}

async function startLab(canvasEl: HTMLCanvasElement, hudEl: HTMLElement) {
  const { renderer, backend, resize, dispose: disposeRenderer } = await createLabRenderer(canvasEl);
  renderer.toneMappingExposure = LOOK.exposure;
  renderer.shadowMap.enabled = false;

  const globe = createGlobeScene();
  const index = await loadWorld();
  globe.attach(index);
  const state = createGame(index);
  const pointer = attachPointer(canvasEl);

  const hud = mountHud(hudEl, {
    onOriginQuery: (query) => {
      const region = findOrigin(index, query);
      if (region) takeOrigin(region.id);
      else hintOrigin('нет такого места');
    },
    onOriginGeo: () => {
      if (!navigator.geolocation) {
        hintOrigin('нет геолокации');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const region = originFromLonLat(index, pos.coords.longitude, pos.coords.latitude);
          if (region) takeOrigin(region.id);
          else hintOrigin('не вижу сушу');
        },
        () => hintOrigin('не вижу место'),
        { enableHighAccuracy: false, timeout: 8000 },
      );
    },
    onBoost: () => {
      if (state.selectedId) startPaint(state, index, state.selectedId);
      boostPaint(state);
    },
    onUnlock: (id) => {
      if (unlockRegion(state, index, id)) {
        selectRegion(state, index, id);
        focusFrom(state, index, id);
        const region = index.byId.get(id);
        if (region) flyToRegion(region.id);
      }
    },
    onDismiss: () => selectRegion(state, index, null),
  });

  function hintOrigin(text: string): void {
    const help = hudEl.querySelector('.hud-origin-help');
    if (help) help.textContent = text;
  }

  function takeOrigin(regionId: string): void {
    if (state.originId) return;
    chooseOrigin(state, index, regionId);
    flyToRegion(regionId);
  }

  function flyToRegion(regionId: string): void {
    const region = index.byId.get(regionId);
    if (!region) return;
    const distance =
      region.kind === 'city'
        ? LOOK.camera.cityDistance
        : region.kind === 'admin1'
          ? LOOK.camera.adminDistance
          : LOOK.camera.countryDistance;
    globe.flyTo(region.centroid.lon, region.centroid.lat, distance);
  }

  function onTap(ndc: { x: number; y: number }): void {
    const id = globe.pickRegion(ndc.x, ndc.y, index, state);
    if (!id) return;
    if (!state.originId) {
      takeOrigin(id);
      return;
    }
    const runtime = state.regions[id];
    selectRegion(state, index, id);
    focusFrom(state, index, id);
    if (runtime?.unlocked && (runtime.progress ?? 0) < 1) {
      if (runtime.painting) boostPaint(state);
      else startPaint(state, index, id);
    }
  }

  const DT = 1 / 60;
  let last = performance.now();
  let acc = 0;
  let fps = 0;
  let fpsFrames = 0;
  let fpsStamp = last;
  let running = true;

  const onResize = () => {
    resize();
    globe.resize();
  };
  window.addEventListener('resize', onResize);

  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    fpsFrames += 1;
    if (now - fpsStamp >= 500) {
      fps = Math.round((fpsFrames * 1000) / (now - fpsStamp));
      fpsFrames = 0;
      fpsStamp = now;
    }

    const cmd = consumeCmd();
    if (cmd?.originQuery) {
      const region = findOrigin(index, cmd.originQuery);
      if (region) takeOrigin(region.id);
      else hintOrigin('нет такого места');
    }
    if (cmd?.originLonLat) {
      const region = originFromLonLat(index, cmd.originLonLat.lon, cmd.originLonLat.lat);
      if (region) takeOrigin(region.id);
    }
    if (cmd?.pickNdc) onTap(cmd.pickNdc);
    if (cmd?.tap && state.selectedId) {
      const runtime = state.regions[state.selectedId];
      if (runtime?.unlocked && (runtime.progress ?? 0) < 1) {
        if (runtime.painting) boostPaint(state);
        else startPaint(state, index, state.selectedId);
      }
    }
    if (cmd?.boost) {
      if (state.selectedId) startPaint(state, index, state.selectedId);
      boostPaint(state);
    }
    if (cmd?.unlockId) unlockRegion(state, index, cmd.unlockId);

    const sample = pointer.sample();
    globe.orbit(sample.dx, sample.dy);
    globe.dolly(sample.wheel);
    if (sample.tapNdc) onTap(sample.tapNdc);

    acc += dt;
    while (acc >= DT) {
      tick(state, index, DT);
      acc -= DT;
    }

    const lod = lodForDistance(globe.distance());
    if (lod !== state.lod) setLod(state, lod);
    globe.tickCamera(dt);
    globe.sync(state, index);
    hud.update(toHud(state, index, backend, fps));

    const selected = state.selectedId ? state.regions[state.selectedId] : undefined;
    writeProbe({
      ready: true,
      backend,
      physics: false,
      fps,
      speed: 0,
      position: { x: globe.camera.position.x, y: globe.camera.position.y, z: globe.camera.position.z },
      playable: 'clay-earth',
      originId: state.originId,
      selectedId: state.selectedId,
      paint: state.economy.paint,
      lod: state.lod,
      progress: selected?.progress ?? 0,
    });
    renderer.render(globe.scene, globe.camera);
  };

  writeProbe({
    ready: false,
    backend,
    physics: false,
    fps: 0,
    speed: 0,
    position: { x: 0, y: 0, z: 0 },
    playable: 'clay-earth',
    originId: null,
    selectedId: null,
    paint: 0,
    lod: 'country',
    progress: 0,
  });
  renderer.setAnimationLoop(frame);

  return {
    dispose: () => {
      running = false;
      window.removeEventListener('resize', onResize);
      renderer.setAnimationLoop(null);
      pointer.dispose();
      globe.dispose();
      disposeRenderer();
    },
  };
}

function toHud(state: GameState, index: WorldIndex, backend: string, fps: number): HudModel {
  const selected = state.selectedId ? index.byId.get(state.selectedId) : undefined;
  const runtime = state.selectedId ? state.regions[state.selectedId] : undefined;
  const origin = state.originId ? index.byId.get(state.originId) : undefined;
  let yieldPerSec = 0;
  for (const region of index.catalog.regions) {
    const row = state.regions[region.id];
    if (!row) continue;
    yieldPerSec += yieldOf(index.catalog.rules, region.areaKm2, row.progress);
  }
  const offerRows = offers(state, index).map((offer) => {
    const region = index.byId.get(offer.id);
    return {
      id: offer.id,
      name: region?.nameLocal ?? region?.name ?? offer.id,
      kind: region?.kind ?? 'country',
      cost: offer.cost,
      affordable: offer.affordable,
    };
  });
  return {
    backend,
    fps,
    paint: state.economy.paint,
    yieldPerSec,
    lod: state.lod,
    originName: origin ? (origin.nameLocal ?? origin.name) : null,
    selected: selected && runtime
      ? {
          id: selected.id,
          name: selected.nameLocal ?? selected.name,
          kind: selected.kind,
          parentName: selected.parentId
            ? (index.byId.get(selected.parentId)?.nameLocal ?? index.byId.get(selected.parentId)?.name ?? null)
            : null,
          areaKm2: selected.areaKm2,
          progress: runtime.progress,
          unlocked: runtime.unlocked,
          painting: runtime.painting,
          facts: regionFact(index, selected)?.lines ?? [],
          flagColors: regionFlag(index, selected)?.colors ?? [],
        }
      : null,
    offers: offerRows,
    phase: state.originId ? 'play' : 'origin',
  };
}
