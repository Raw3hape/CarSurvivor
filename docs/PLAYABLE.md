# Playable: Clay Earth

First playable. Feel lives in `apps/game-web`. Unity later. Not a car sandbox.

## Fantasy

A clay planet hangs in dark space. Unpainted land is raw ceramic, not white. You start from where you are. Tap a region, glaze fills 0→100% in that region's flag. Finished land makes paint. Paint unlocks neighbors. Zoom like Google Earth: countries → provinces → cities. Streets are a layer in the schema, empty until a source exists.

Pleasure: filling area (Paper.io) + growing reach (idle). Automation must not steal the tap.

## DECISION

- Surface: web lab, Three.js WebGPU, no Rapier in this loop.
- Planet: sphere (silhouette is a disc from space). Locally flat when close. Height displaces along the normal.
- Data-driven world. Game code never lists countries, colors, or facts.
- Paintable kinds: `country` | `admin1` | `city`. `district` and `street` exist on the type, no content yet.
- Origin is a city (fallback: containing admin1, then country).
- Painting is free on an unlocked region. Unlocking neighbors costs paint.
- Tools (wide brush, stencils, helpers): interface only. HUD may show them locked.
- HUD keeps the string `web lab` (verify contract).

## OPEN

- True pancake disc vs sphere. Sphere is the current decision; disc is a renderer swap behind `project.ts`.
- Street tiles (OSM). Do not invent fake streets.
- Broader tools economy. Show the choice, do not implement the shop.

## Architecture

```
public/world/            generated catalog, never hand-edited
scripts/build-world.mjs  only writer of public/world
src/world/               load, index, lon/lat, lod, pick
src/sim/                 pure: paint, yield, unlock. no Three
src/render/              space, stars, clay globe, camera
src/ui/                  origin, region card, choice, hud
```

Sim does not import Three. Render does not own economy numbers. UI does not own region lists.

## Data

`public/world/catalog.json` is the source of truth at runtime.

Ids:

- `country:{ISO2}`
- `admin1:{ISO3166-2 or ne_id}`
- `city:ne:{id}`

Neighbors are precomputed at build time. Area is km². Flag and facts are ids into sibling arrays.

Build reads Natural Earth + REST Countries. Re-run: `npm run world` in `apps/game-web`.

## Loop

1. Space: unpainted clay Earth, stars, matte light.
2. Origin: search / tap / geolocation.
3. Fly to origin. That region unlocks.
4. Tap: paint 0→100%. Rate falls with area. Extra taps boost.
5. Done: yields paint. Neighbors become buyable.
6. Choice: unlock a neighbor now, or hold paint (tools later).
7. Select always shows geography (name, kind, parent, area, facts), even if locked.

## LOD

Camera distance to surface, not a hardcoded country list:

- far: countries
- mid: admin1 of the focused country
- near: cities of the focused admin1

## Probe

`window.__CS_WEB__` includes `ready`, `backend`, `physics: false`, `fps`, `playable: "clay-earth"`, `originId`, `selectedId`, `paint`, `lod`, `progress`, `position`.

`window.__CS_WEB_CMD__`: `{ originQuery?: string, tap?: boolean, boost?: boolean, unlockId?: string, pickNdc?: { x: number, y: number } }`.

## Evidence

A visual claim needs a Chrome frame of the clay planet in dark space, not a geometry dump.
