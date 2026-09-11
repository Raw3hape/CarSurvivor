# Art: Clay Earth

Art director owns this file, `apps/game-web/src/render/look.ts`, `apps/game-web/src/ui/tokens.css`, fonts in `apps/game-web/index.html`. Code reads numbers from `look.ts`. HUD CSS reads `tokens.css`. Do not scatter hex in shaders.

## North star

A hand-sized ceramic globe hanging in a dark kiln void. Not Google photoreal. Not a white underpainting. Not a UI map on a page. Not a casino idle. Color lives on the planet. The HUD is bone ink on the void.

## Space

- Ground is `--space` `#08070F`. Cool violet-black. Never white, never studio gray, never milky fog.
- No floor, no grid, no HDRI skybox, no atmosphere shell.
- Stars are kiln-ash motes: `LOOK.star` `#D2CBB8`, count `820`. Sparse dust, almost still.
- Light is matte and low. Warm key (distant sun on clay), weak cool fill, faint rim on the limb. Clay reads as a volume, not a sticker.

## Clay

- Unpainted land is raw dark stoneware: `LOOK.clay.unpainted` `#1F1914`. Iron, dusty, high roughness. Not plaster, not terracotta, not chocolate.
- Seams are leather-hard grooves: `LOOK.clay.groove` `#110D0B`.
- Close: gentle relief along the normal. Still clay, not rock photogrammetry.
- Globe is a slightly thrown form (`flattenY` 0.96). Silhouette from space is a disc.

## Glaze

- Painted land is a thin flag glaze. Flag hues come from world data, never from this file.
- Glaze is wetter than clay, still ceramic (roughness ~0.34), not chrome, not plastic.
- Fill crawls 0→100% with a wet lip. The lip is `--glaze` `#C5D2DC`, width `LOOK.glaze.wetEdge`. This is the only gloss in the universe.
- Hard wipe, dissolve, or progress bar on the planet is wrong.

## HUD

Cartographic instrument hanging in the void. Not a SaaS card. Not a newspaper. Not an idle shop.

- Type floats on `--space`. A plate is optional: `--panel` at ~60%, 1px `--ink` at 14% opacity. No blur, no drop shadow, no accent bar, no radius above 2px.
- Pointer-events only on controls.
- Visible kicker, exact string, never translate: `web lab`.
- No HUD accent color. The wet glaze is the chromatic event. Actions are type, not buttons that glow.

Player-facing copy, Russian:

| Slot | Copy |
|---|---|
| kicker | `web lab` |
| origin | Где ты |
| search | Найти место |
| country | Страна |
| admin1 | Регион |
| city | Город |
| unpainted | Сырая глина |
| painted | Покрыто |
| tap | Нажми, чтобы покрыть |
| paint | Краска |
| area | Площадь |
| neighbors | Соседи |
| unlock | Открыть соседа |
| hold | Оставить краску |
| locked | Закрыто |
| done | Готово |
| tools | Инструменты · позже |
| km² | км² |

Voice: short, calm, sentence case. No «забери», no «награда», no Get started.

## Type

- Place names: Piazzolla, optical size 30, weight 400–600. Compact gazetteer serif, Cyrillic.
- Numbers, kicker, facts: Martian Mono, `wdth` 87.5, weight 400. Quiet instrument, not a code editor.
- CSS: `--font-display`, `--font-mono` on `:root` from `index.html`.
- Do not use Inter, Roboto, Arial, IBM Plex.

## Motion

- Camera is heavy. Orbit around an object on a shelf, not a flight sim.
- Glaze crawl is viscous, 0.4–1.2s by area, ease-out. Wet lip leads the fill.
- Stars barely drift. Dust in a dark room, not a planetarium spin.
- HUD numbers tick. No slot-machine count-up, no bounce, no pulse CTA.
- Reduced motion: camera snaps, fill still happens, lip does not shimmer.

## Do-not

- White floor, plaster underpainting, `#ffffff` land.
- Terracotta-on-cream. Vermilion or acid-green accent. Gold casino chrome.
- Generic SaaS dark theme (blur cards, blue link, Inter).
- Broadsheet template (dense columns, 01 / 02 / 03, hairline grid).
- Photoreal Earth, clouds, buildings, trees, cars, water shader oceans.
- HDRI sky, ground plane, fog to gray.
- Hex values copied into materials. Read `LOOK` and `tokens.css`.
