# Web lab

Fast 3D prototypes in the browser. Shipping game stays Unity.

## Stack

Versions live in `apps/game-web/package.json`. Shape:

- Vite + TypeScript
- Three.js `WebGPURenderer` (`three/webgpu`), falls back to WebGL2
- Rapier 3D for collisions
- Chrome DevTools MCP to play, screenshot, and read `window.__CS_WEB__`

This is not Unity WebGL, PlayCanvas, or a copy of `Game_road_fury` / `World_Map_game`.

## Folders

| What | Path |
|---|---|
| Web app | `apps/game-web` |
| Dev URL | `http://127.0.0.1:5173` |
| Preview URL | `http://127.0.0.1:4173` |
| Web GLB handoff | `art/published-web` served as `/models/` |
| Unity FBX handoff | `art/published` (unchanged) |
| Evidence | `artifacts/evidence` |

Author in `art/blender`. Same `.blend` can export FBX for Unity and GLB for the lab. 1 unit = 1 meter, Y-up in both runtimes.

## Commands

From `apps/game-web`:

```
npm run dev
npm run verify
npm run e2e
npm run preview
```

Stop the Vite process at handoff. One lab server on 5173.

## Agent probe

Canvas has no accessibility tree. After Clay Earth is up, HUD includes `web lab`. `window.__CS_WEB__` has `ready`, `backend`, `physics: false`, `fps`, `playable: "clay-earth"`, `originId`, `selectedId`, `paint`, `lod`, `progress`, `position`. Commands: `window.__CS_WEB_CMD__` (`originQuery`, `tap`, `boost`, `unlockId`, `pickNdc`).

## What transfers to Unity

Feel, numbers, camera, loops, input. Not the renderer, not Rapier, not this TypeScript. Rewrite systems in C# when a playable is named.

## Skill

`.grok/skills/web-game-prototype/SKILL.md`
