# Art: Clay Earth

Art director owns this file, `apps/game-web/src/render/look.ts`, `apps/game-web/src/ui/tokens.css`, fonts in `apps/game-web/index.html`. Code reads numbers from `look.ts`. HUD CSS reads `tokens.css`. Do not scatter hex in shaders.

## North star

A hand-sized pale ceramic globe on a paper table in daylight. Bisque, linen, even north light. Not a kiln void. Not Google photoreal. Not Play-Under cheap white plaster. Not a UI map on a page. Not a casino idle. Color lives on the planet as thin flag glaze. The HUD is dark ink on ivory plates.

## Space

- Ground is `--space` `#E7E2D8`. Warm linen paper. Never black, never violet void, never studio gray, never milky fog, never `#ffffff`.
- No floor plane, no grid, no HDRI skybox, no atmosphere shell. The clear color is the room.
- Specks are graphite on paper: `LOOK.star` `#8A847A`, count `360`. Sparse, almost still. Not a starfield, not kiln ash.
- Light is even and matte. Soft warm key, almost-matching cool fill, faint cool rim. Daylight on ceramic, not a spotlight in a shed. Clay reads as a pale volume, not a sticker.

## Clay

- Unpainted land is pale bisque: `LOOK.clay.unpainted` `#F4EFE6`. Paper-warm, high roughness. Not plaster, not terracotta, not chocolate, not underpainting white.
- Seams are leather-hard grooves: `LOOK.clay.groove` `#D4CCBF`. A shade, not a black line.
- Close: gentle relief along the normal. Still clay, not rock photogrammetry.
- Globe is a slightly thrown form (`flattenY` 0.96). Silhouette from space is a disc.
- Ocean is the same bisque, a touch cooler. Not a water shader.

## Glaze

- Painted land is a thin flag glaze. Flag hues come from world data, never from this file.
- Glaze is wetter than clay, still ceramic (roughness ~0.34), not chrome, not plastic.
- Fill crawls 0→100% with a wet lip. The lip is `--glaze` `#C5D2DC`, width `LOOK.glaze.wetEdge`. Cool celadon. This is the only gloss in the universe.
- On the HUD, glaze as type is `--cool` (glaze mixed toward ink) so it reads on ivory. The planet lip stays the pale cool hex.
- Hard wipe, dissolve, or progress bar on the planet is wrong.

## HUD

Cartographic instrument on the table. Not a SaaS card. Not a newspaper. Not an idle shop. Not black type on `#ffffff`.

- Dark ink `--ink` `#2A261F` on cream plates `--panel` `#F7F3EC`. A plate is a sheet of ivory, ~90% opaque, 1px `--ink` hairline. No blur, no drop shadow, no accent bar, no radius above 2px.
- Pointer-events only on controls.
- Visible kicker, exact string, never translate: `web lab`.
- No HUD accent color. The wet glaze is the chromatic event. Actions are type in `--cool`, not buttons that glow.

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

- Camera is heavy. Orbit around an object on a table, not a flight sim.
- Glaze crawl is viscous, 0.4–1.2s by area, ease-out. Wet lip leads the fill.
- Specks barely drift. Dust on paper, not a planetarium spin.
- HUD numbers tick. No slot-machine count-up, no bounce, no pulse CTA.
- Reduced motion: camera snaps, fill still happens, lip does not shimmer.

## Do-not

- Dark kiln void, violet-black clear color, bone ink on a void.
- White floor, plaster underpainting, Play-Under cheap white, `#ffffff` land.
- Terracotta-on-cream. Vermilion or acid-green accent. Gold casino chrome.
- Generic SaaS light theme (white cards, blue link, Inter, drop shadow).
- Broadsheet template (dense columns, 01 / 02 / 03, hairline grid).
- Photoreal Earth, clouds, buildings, trees, cars, water shader oceans.
- HDRI sky, ground plane, fog to gray.
- Hex values copied into materials. Read `LOOK` and `tokens.css`.
