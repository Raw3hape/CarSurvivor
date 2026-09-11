# CarSurvivor agent contract

This is the repository-local operating contract for AI agents. User and system instructions have higher authority. Report to Nikita in Russian, short, with paths.

## Mission

New Unity + Blender game studio with a browser feel lab. This repo is empty of gameplay on purpose until a first playable is named. Do not import World Racing, Godot `Car_Survivors`, or `Game_road_fury` unless Nikita asks.

## Cold start

Read in this order, then stop:

1. This file
2. `PROJECT_STATE.json`
3. `docs/INDEX.md` if routing is still unclear

Do not load World Racing docs. Do not start Blender or Unity until the task needs them.

## Paths

| What | Path |
|---|---|
| Unity project | `apps/game-unity` |
| Unity version | `6000.3.22f1` (URP blank) |
| Web lab | `apps/game-web` · `http://127.0.0.1:5173` |
| Blender sources | `art/blender` — never inside `Assets` |
| Export staging | `art/export/staging` |
| Published handoff | `art/published` (FBX for Unity) |
| Web GLB handoff | `art/published-web` |
| Unity import dest | `apps/game-unity/Assets/CarSurvivor/Art/` |
| Evidence | `artifacts/evidence` |
| Human map | `README.md` |
| Connector map | `docs/STUDIO.md` |
| Web lab map | `docs/WEB.md` |

## Tools

- Skills: `blender-unity-studio`, `unity-cli`, `web-game-prototype`, plus game-asset skills for 2D/UI/sprites.
- Interactive Blender: `blender-mcp-session start` → work → `blender-mcp-session stop`.
- Headless Blender: MCP tools ending in `_for_cli` on a declared `.blend`.
- Live Unity Editor: `unity-mcp-session start apps/game-unity` → work → `unity-mcp-session stop`.
- Web lab: `npm run dev` in `apps/game-web`. Chrome DevTools MCP to play and screenshot. Probe: `window.__CS_WEB__`.
- Do not leave Pipeline in the project. Do not leave Editor, Blender, or the Vite lab running at handoff.
- One Unity Editor on this project path. Never share `Library/` across checkouts.

## Art handoff

- Author in Blender. Publish FBX to `art/published` for Unity, GLB to `art/published-web` for the lab. Import only published files.
- Preserve Unity `.meta` GUIDs. Move asset + `.meta` together.
- Validate names, scale (1 unit = 1 meter), Y-up, pivot, bounds, UVs, materials, missing textures before import.

## Autonomy

Inside the current task, implement without asking routine technical questions. Escalate product, platform, money, legal, destructive git, or anything that would copy another game into this repo.

## Evidence

A visual or gameplay claim needs a frame from a built player (or an explicit exception in `PROJECT_STATE.json`). Geometry checks are not art quality.

## Truth language

FACT · DECISION · HYPOTHESIS · PROPOSAL · OPEN · BLOCKER. Do not promote a proposal to a decision.
