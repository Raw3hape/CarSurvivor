---
name: web-game-prototype
description: >
  Fast 3D web prototypes for CarSurvivor in apps/game-web (Vite, Three.js WebGPU, Rapier).
  Use when iterating feel in the browser, driving the web lab, loading GLB from art/published-web,
  verifying with Chrome DevTools, or preparing a later Unity port. Triggers: web prototype, web lab,
  browser game, three.js, WebGPU, Rapier, /web-game-prototype.
---

# Web game prototype

Read `docs/WEB.md` for stack and folders. Do not load Unity or Blender unless the task needs them.

## When this lane vs Unity

- Feel, camera, input, loop, numbers: `apps/game-web`.
- Shipping build, C#, URP scene: `apps/game-unity`.
- Do not export Unity WebGL to prototype. Do not copy `Game_road_fury` or `World_Map_game`.

## Run

```bash
cd apps/game-web
npm run dev
```

URL is `http://127.0.0.1:5173`. Stop Vite at handoff. One server on that port.

## Verify

Canvas has no accessibility tree.

1. Open the lab in Chrome DevTools MCP.
2. Wait for HUD text `web lab`.
3. `evaluate_script` `() => window.__CS_WEB__` — `ready` must be true.
4. To drive: `window.__CS_WEB_INPUT__ = { throttle: 1, steer: 0 }` then screenshot. WASD also works for a human.
5. Check console for errors.

## Art

Publish validated GLB to `art/published-web`. The lab serves it at `/models/<file>.glb`. Same `.blend` as Unity; Unity still gets FBX from `art/published`. 1 unit = 1 meter, Y-up.

## Port later

Rewrite systems in C#. Carry feel and numbers, not Three/Rapier code.
