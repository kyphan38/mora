# mora - context

A quiet focus timer. Local-first, single user, no account. Runs as a desktop
app (Tauri v2) today; the same build is meant to become a PWA for phones.
Plan and decisions: `PLAN-improve.md`.

## Stack

Vite 5 + React 18 + TypeScript, Zustand 4, Tailwind v4, Vitest + Testing
Library (jsdom). Tauri plugins: store, global-shortcut, notification.

## Layout of `src/`

- `core/` pure logic, no React, no device APIs: `timer` (format, remaining),
  `sessionTimer`, `pomodoro` (break lengths), `format` (dates, minutes),
  `trayFormat`, `soundFormat`, `uid`.
- `platform/` everything that touches the device, each with a no-op or web
  fallback, loaded with dynamic imports (never a top-level `@tauri-apps/*`
  import): `persistence` + `persist` (Tauri store / localStorage / memory),
  `audio`, `notify`, `os` (tray + hotkey), `customTrackDb` (IndexedDB),
  `prefs` (theme).
- `store/useStore.ts` the single store: tasks, sessions, sound, setup,
  session runtime, pomodoro phase.
- `hooks/` `useSessionRuntime` (wall-clock sync, chime + notification,
  hotkey + tray), `useGlobalAudio`, `useOsSync`, `useIdle`.
- `ui/` components. `data/` scenes, sounds, durations. `styles/globals.css`
  tokens and motion.

## UI

The clock is the screen (`FocusView`): a hairline `Ring` with the task,
time and phase inside, duration words before a block starts, one filled
Play button, `done` / `stop` / `skip break` as words. A bottom bar of small
icons (history, tasks count, sound, settings) fades while a block runs.
Tasks, sound + scene, review, history and settings are `Sheet`s (bottom
sheet on phones, centered panel on wide screens). Screen state:
`'focus' | 'history' | 'settings'`.

Look: gray tokens from `ws/app/DESIGN.md`, system font, theme
`system · light · dark` (`mora.theme` in localStorage, applied by an inline
script in `index.html`). Scene mode (`data-scene` on the root) draws
`SceneLayer` (photo + muted video + scrim) and swaps tokens to light text.

## Motion

Short, opacity/transform only, all in `styles/globals.css` (`fade-in`,
`fade-out`, `sheet-up`, `sheet-down`, `rise`, `pop`, `row-out`,
`scene-in`, `breathe`). `prefers-reduced-motion` turns them off; JS exit
delays (`usePresence`, task removal, `useFlip`) are skipped then too.

- Sheets slide in and out (`usePresence` keeps them mounted 200ms).
- Scenes cross-fade (`SceneLayer` keeps the old slide under the new one);
  the video fades in once it plays; plain/scene fades the whole layer.
- Task rows: FLIP slide on reorder (`useFlip`), fade out on remove.
- The ring fills smoothly; the ring middle cross-fades on phase or task
  change; Play/Pause icon pops.
- Audio: play fades in (800ms), pause fades out (450ms) before pausing,
  track changes fade the old track out first (350ms). See
  `platform/audio.ts`.

## Timer rules

- Time follows the wall clock: `syncClock(now)` adds whole seconds since
  `runSyncAt`; `useSessionRuntime` calls it every 250ms and on
  `visibilitychange`. `tickSession(delta)` applies the time.
- A focus block is logged once, when it ends (`enterReview`), or on stop.
  Blocks under 60s are not logged. Start time is the first Play.
- Changing the active task mid-block logs the old block and restarts at 0;
  removing a task discards its time. Break time is never logged.
- A restored session is always paused. Clock-only changes are saved at
  most every 15s.

## Commands

- `npm run dev` web dev server (port 1420)
- `npm test` all tests; `npm run build` type check + build
- `npm run tauri dev` desktop dev; `npm run build:desktop` bundle (see
  `RELEASE.md`)

## Assets

`public/scenes/<id>.jpg|mp4` listed in `public/scenes/metadata.json`
(descriptions in `data/corners.ts`). `public/audio/ambient|music/<slug>.mp3`
where slug comes from `core/soundFormat.slug`. Missing files degrade to a
gradient or silence. Scene tools live in `scripts/`.
