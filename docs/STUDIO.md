# Studio

How this machine talks to Blender and Unity for CarSurvivor.

## What is already on the machine

| Piece | Status |
|---|---|
| Blender MCP (Grok) | Configured. 26 tools. Interactive needs Blender on port 9876. |
| Unity MCP (Grok) | Configured in repo `.grok/config.toml` to `apps/game-unity`. Tools appear only when an Editor with Pipeline is up. |
| Unity CLI | `unity` 1.0.0-beta.8 · `unity-mcp-session` · `unity-mcp-agent` |
| Blender | 5.2.0 LTS · `blender-mcp-session` · `blender-mcp-agent` |
| Editors | `6000.3.22f1` (Android, iOS, Windows) · `6000.5.8f1` (Web only, do not pin) |
| Skills | `blender-unity-studio`, `unity-cli`, `web-game-prototype`, `game-asset-core` + animation/tiles/UI/character |
| Web lab | `apps/game-web` · Vite + Three WebGPU + Rapier · Chrome DevTools MCP |
| Grok plugins | No Unity/Blender plugin. Connectors are MCP + skills, not marketplace plugins. |

Global `unity-mcp-agent` still defaults to World Racing. This repo overrides it. Always pass `apps/game-unity` to Unity session commands.

## Start / stop (only for the active task)

```bash
# Blender GUI + interactive MCP
blender-mcp-session start
blender-mcp-session status
blender-mcp-session stop

# Unity Editor + live commands (Pipeline is temporary)
unity-mcp-session start /Users/nikita/Documents/My_Projects/CarSurvivor/apps/game-unity
unity-mcp-session status /Users/nikita/Documents/My_Projects/CarSurvivor/apps/game-unity
unity-mcp-session stop /Users/nikita/Documents/My_Projects/CarSurvivor/apps/game-unity
```

Headless Blender does not need a session: use MCP `*_for_cli` with `art/blender/CarSurvivor.blend`.

Web lab (feel first, then Unity):

```bash
cd apps/game-web && npm run dev
# http://127.0.0.1:5173
```

Details: [WEB.md](WEB.md).

At handoff: Unity, Blender, and the Vite lab **stop**. Do not leave them running.

## Folder contract

```
art/blender/          authoring .blend  (not under Assets)
art/export/staging/   one writer per job, throwaway
art/published/        only validated FBX + textures (Unity)
art/published-web/    only validated GLB (web lab, served as /models/)
apps/game-unity/      Unity project, version 6000.3.22f1
apps/game-unity/Assets/CarSurvivor/Art/   imports from published only
apps/game-web/        browser feel lab
artifacts/evidence/   frames, logs, player builds
drafts/               human drafts, not game content
```

Unity handoff is FBX. Web lab handoff is GLB. No Unity glTF importer unless a later task adds one.

## Unity libraries

URP blank already includes Universal RP 17.3, Input System 1.20, uGUI, Timeline, Test Framework. Extra packages (Cinemachine, etc.) are added when a task needs them. Pipeline stays session-only via `unity-mcp-session`.
