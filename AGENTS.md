# AGENTS.md — PCBox

Electron desktop player that pairs with TV-K (Android TVBox app) via WebSocket. The PC app does NOT parse video sources itself — all parsing is delegated to the connected TV-K device.

## Commands

```bash
pnpm dev          # start dev (main tsc --watch + vite renderer on :5173)
pnpm build        # build main (tsc) then renderer (vite build) to dist/
pnpm start        # run electron from dist/
pnpm pack         # build + electron-builder (outputs to release/)
```

No lint, typecheck, or test scripts are configured. Run `npx tsc --noEmit` manually to typecheck the renderer (uses `tsconfig.json`). For the main process, `npx tsc -p tsconfig.main.json --noEmit`.

## Architecture

```
src/
  main/           # Electron main process (Node.js, commonjs)
    index.ts      # App entry, window creation, IPC handlers
    preload.ts    # contextBridge → window.electronAPI
    ws-server.ts  # WebSocket server for TV-K pairing
    client-manager.ts     # Connected TV-K device registry
    message-dispatcher.ts # Routes WS messages by code
  renderer/       # React UI (Vite, ESM, JSX)
    App.tsx       # Root component, view routing, WS init
    store/        # Zustand store (all app state + WS actions)
    lib/converter.ts  # CatVod ↔ TVBox format conversion
    components/   # Home, Search, VideoDetail, Player, History, Settings, Sidebar
    types/        # Shared TypeScript interfaces
```

**Two tsconfigs** — renderer (`tsconfig.json`, noEmit, ESM, JSX) and main (`tsconfig.main.json`, emits to `dist/main/`, commonjs). They are independent; editing one won't catch errors in the other.

## IPC Boundary

Renderer → Main via `window.electronAPI` (preload). Main → Renderer via `mainWindow.webContents.send`. Key channels: `ws-server:start`, `ws-server:stop`, `ws-server:status`, `client-connected`, `client-disconnected`, `ws-response`.

## WebSocket Protocol

The WS server (default port 9898) speaks a custom JSON protocol with numeric `code` fields (see `message-dispatcher.ts:6-36`). Requests include a `topicId`; responses echo it back for correlation. The renderer's Zustand store uses a `topicCallbacks` Map to match responses to pending requests.

## Gotchas

- Vite dev server must be running on port 5173 for `pnpm dev` to work — main process loads `http://localhost:5173` in dev mode.
- `dist/` is checked in and contains built main + renderer artifacts. Don't delete it casually.
- The `@/*` alias maps to `src/renderer/*` in both tsconfig.json and vite.config.ts.
- `noUnusedLocals` and `noUnusedParameters` are disabled — unused vars won't error.
- CSP in `src/renderer/index.html` restricts script/style sources; `img-src` and `media-src` allow `*` for streaming.
