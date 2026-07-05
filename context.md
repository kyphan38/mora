# mora - Project Context

## Overview
Local-first, single-user desktop focus app (Pomodoro-style). Offline, English-only, no auth.
Flow: Landing → Corner → Sound → Session → Room → History. Core rule: 1 task = 1 session; sessions saved locally.

## Stack
Tauri v2 · React 18 · TypeScript 5 · Vite 5 · Zustand 4 · Vitest 2. Font: Hanken Grotesk (bundled). Theme: "Paper" (light neutral), accent sage #748158.

## Design tokens
See src/styles/tokens.css (source of truth). Radius 12px (pills for nav/chips), soft-fill buttons, minimal timer (label + time + "Time left"), calm motion (600ms), breathing accent dot, icons stroke 1.4.

## Phase roadmap
- [x] Phase 1 - Foundation & App Shell
- [x] Phase 2 - Setup flow (Corner/Sound/Session + Stepper)
- [x] Phase 3 - Focus Room + timer engine (1 task = 1 session)
- [x] Phase 4 - Local persistence + History
- [x] Phase 5 - OS integration (global hotkey, menu-bar timer, floating widget)
- [x] Phase 6 - Sound engine (ambient+music+volume, end-of-session chime)
- [x] Phase 7 - Packaging (macOS + Linux)

- [x] Pomodoro patch - Break scaling, review sheet, autoContinue loop

**Project complete - v0.1.0**

## Project structure
- `context.md` - project memory (this file)
- `package.json` - deps & scripts (added @tauri-apps/plugin-store)
- `vite.config.ts` - Vite + Vitest config with react plugin, jsdom env
- `tsconfig.json` - TypeScript config (strict, react-jsx)
- `index.html` - HTML entry point
- `src-tauri/tauri.conf.json` - Tauri config (window 1120×760, min 900×640)
- `src-tauri/Cargo.toml` - Rust deps (added tauri-plugin-store)
- `src-tauri/src/lib.rs` - Tauri builder (registered store plugin)
- `src-tauri/src/main.rs` - Tauri Rust shell entry
- `src-tauri/capabilities/default.json` - permissions (added store:default)
- `src/main.tsx` - React mount, font imports, global CSS imports, calls initPersistence()
- `src/App.tsx` - screen router (switch on store.screen), wraps in AppShell
- `src/styles/tokens.css` - design tokens (Paper theme)
- `src/styles/globals.css` - CSS reset, body styles, .app frame
- `src/store/useStore.ts` - Zustand store (all state + Phase 1–4 actions incl. hydrate, clearSessions)
- `src/types/index.ts` - all shared TypeScript types (Screen, Corner, Task, Session, SoundConfig, SessionSetup)
- `src/lib/uid.ts` - unique ID helper (crypto.randomUUID fallback)
- `src/lib/timer.ts` - pure timer engine (TimerState, createTimer, start, pause, reset, tick, remainingSec, isComplete, formatTime)
- `src/lib/persistence.ts` - StorageAdapter interface, adapters (memory/localStorage/tauri), PersistedState, toPersisted, migrate, selectAdapter
- `src/lib/persist.ts` - initPersistence() wiring (load→hydrate, subscribe→debounced save, saveNow)
- `src/data/corners.ts` - 9 corner definitions (CORNERS array)
- `src/data/sound.ts` - 12 ambient names (AMBIENTS) + 6 music styles (MUSIC_STYLES)
- `src/data/durations.ts` - 5 duration options (DURATIONS: Count Up/25m/50m/1.5h/2h)
- `src/components/AppShell.tsx` - top nav: logo + pill tab group (Start/Focus/History), hidden on landing
- `src/components/Stepper.tsx` - 3-step progress indicator (Focus corner / Sound / Session)
- `src/screens/Landing.tsx` - kicker + h1 + CTA button (fully implemented)
- `src/screens/Corner.tsx` - 9-corner grid with gradient thumbnails, descriptions, ambient tags
- `src/screens/Sound.tsx` - ambient chips, music style cards, volume sliders, preset hint, back/continue
- `src/screens/Session.tsx` - duration pills, task list with add/remove, Start focus (gated on ≥1 task)
- `src/screens/Room.tsx` - focus room: timer card (play/pause/complete/stop, state pill, scene tint) + task panel
- `src/screens/History.tsx` - session list (newest-first), today stats, empty state, Clear button, deterministic date helpers
- `src/lib/osFormat.ts` - pure OS formatting helpers (trayTitle, buildTick, widgetVisible) and event constants
- `src/lib/os.ts` - OsBridge interface and implementation (guarded with isTauri, lazy tray icon)
- `src/hooks/useOsSync.ts` - main window hook for hotkey, remote control, and tick pushing
- `src/test/setup.ts` - Vitest setup (jest-dom matchers)
- `src/test/store.test.ts` - store unit tests (Phase 1)
- `src/test/shell.test.tsx` - AppShell + navigation integration tests (Phase 1)
- `src/test/setup.test.tsx` - Phase 2 setup flow tests (Corner/Sound/Session/Stepper)
- `src/test/timer.test.ts` - pure timer engine unit tests (Phase 3)
- `src/test/room.test.tsx` - Room screen + session logic tests (Phase 3)
- `src/test/persistence.test.tsx` - persistence layer tests (adapters, hydrate, save, side-effect free)
- `src/test/history.test.tsx` - History screen + helper function tests
- `src/test/osFormat.test.ts` - pure OS formatting helper tests
- `src/test/osSync.test.tsx` - integration tests for useOsSync and WidgetView using Mock OsBridge
- `src/lib/soundFormat.ts` - pure sound formatting and notification payload builders
- `src/lib/audio.ts` - AudioEngine interface and HTMLAudioElement/WebAudio implementations
- `src/lib/notify.ts` - NotifyBridge interface and Tauri/browser Notification implementations
- `src/data/audioManifest.ts` - mappings from sound names to audio asset URLs
- `public/audio/README.md` - guide for dropping local audio files into the app
- `src/hooks/useSound.ts` - React hook connecting sound config changes and timer states to audio/notify
- `src/test/soundFormat.test.ts` - unit tests for pure sound formatting and manifest mapping
- `src/test/sound.test.tsx` - integration tests for useSound and mock audio/notify engine setups
- `app-icon.svg` - high resolution source logo SVG
- `src-tauri/icons/` - platform target icon sets generated from `app-icon.svg`
- `.github/workflows/release.yml` - GitHub Actions release workflow for automated cross-compiling
- `RELEASE.md` - localized manual build, Gatekeeper bypass, signing environment vars, and release workflow instructions
- `src/test/config.test.ts` - test verifying packaging configuration files
- `src/data/sceneManifest.ts` — maps corner scene names to image URLs
- `public/scenes/README.md` — user instructions for scene image local storage
- `src/test/scene.test.tsx` — unit tests for scene image path mappers and preview background rendering
- `src/test/roomBg.test.tsx` — unit and integration tests for Room background settings
- `src/test/roomScene.test.tsx` — unit and integration tests for immersive Room Scene mode
- `src/test/audioEngineUnit.test.ts` — unit tests for the AudioEngine singleton and dispose behaviors
- `src/lib/pomodoro.ts` — pure break-scaling helper (breakForSeconds, NEXT_DURATIONS)
- `src/test/pomodoro.test.tsx` — pomodoro phase machine tests (break mapping, review, break, autoContinue, Room render)

## Data model
```ts
type Screen = 'landing' | 'corner' | 'sound' | 'session' | 'room' | 'history';

interface Corner { id, name, description, ambient, gradient }
interface Task { id, name, done, createdAt }
interface Session { id, taskName, minutes, startedAt, endedAt, corner, ambient }
interface SoundConfig { ambient, musicStyle, ambientVolume, musicVolume }
interface SessionSetup { durationLabel, durationSec }
```

## Persistence
`PersistedState` shape (version 1): `{ version, tasks, sessions, sound, setup, corner, elapsedSec, isRunning, sessionActive, activeTaskId, audioActive, autoContinue }`.

Adapters:
- `createMemoryAdapter(seed?)` - in-closure, deep-cloned on save/load. Used by tests.
- `createLocalStorageAdapter(key='mora-state')` - JSON in localStorage. Used in web-dev mode.
- `createTauriAdapter(file='mora.json')` - dynamic import of `@tauri-apps/plugin-store`. Used in Tauri runtime.
- `selectAdapter()` - picks Tauri adapter if `__TAURI_INTERNALS__` in window, else localStorage.

`initPersistence(adapter?, {debounceMs?})`:
- Loads from adapter → `migrate()` → `hydrate()` into store.
- Subscribes to store changes → debounced `save()` (default 300ms).
- Returns `{ unsubscribe, saveNow }`. `saveNow()` cancels pending debounce and saves immediately.
- Swallows errors on save (no throw).
- Called once from `main.tsx` at runtime. Never called during tests (tests inject memory adapter explicitly).
- On window close event (`onCloseRequested`), `isRunning` is forced to `false` so the session resumes paused.

`toPersisted(storeSnapshot)` - stamps `PERSIST_VERSION` and carries fields.
`migrate(raw)` - null→null; stamps current version on any version mismatch.

Rule: **no auto-run on import**. Persistence only activates via explicit `initPersistence()` call.

## Timer engine
`src/lib/timer.ts` - pure, framework-agnostic, immutable functions:
```ts
type TimerMode = 'countdown' | 'countup';
interface TimerState { mode, totalSec, elapsedSec, running }
```
- `createTimer(totalSec)` - >0 = countdown, 0 = countup; elapsed 0, not running.
- `start(s)` / `pause(s)` - toggle running.
- `reset(s)` - elapsed 0, not running, keep mode/totalSec.
- `tick(s, deltaSec=1)` - if running, advance elapsed; countdown clamps at totalSec and stops.
- `remainingSec(s)` - countdown: total−elapsed (min 0); countup: elapsed.
- `isComplete(s)` - countdown && elapsed≥total; always false for countup.
- `formatTime(sec)` - mm:ss zero-padded.

## Store
State: `screen` (Screen), `corner` (Corner|null), `sound` (SoundConfig), `setup` (SessionSetup), `tasks` (Task[]), `sessions` (Session[]), `elapsedSec` (number), `isRunning` (boolean), `sessionActive` (boolean), `activeTaskId` (string|null), `audioActive` (boolean).

Implemented actions:
- `setScreen(s: Screen)` - navigates between screens
- `setCorner(corner: Corner)` - sets corner AND pairs sound.ambient = corner.ambient
- `setAmbient(name: string)` - sets sound.ambient
- `setMusicStyle(name: string)` - sets sound.musicStyle
- `setAmbientVolume(v: number)` - clamped 0–100
- `setMusicVolume(v: number)` - clamped 0–100
- `setDuration(label: string)` - looks up DURATIONS, sets setup.durationLabel + durationSec
- `addTask(name: string)` - trims, ignores empty, pushes new Task with uid()
- `removeTask(id: string)` - removes task by id
- `activeTask()` - getter: first task where !done (undefined if all done)
- `addSession(s: Session)` - unshift into sessions array
- `toggleTask(id: string)` - flips done boolean
- `completeActive(elapsedSec: number)` - finds first !done task, logs Session, marks task done
- `stopActive(elapsedSec: number) → boolean` - ≥60s: partial log, no done; <60s: no-op
- `hydrate(p: Partial<PersistedState>)` - sets tasks/sessions/sound/setup/corner/etc from p when present
- `clearSessions()` - empties sessions array
- `startFocus()` - sets sessionActive=true, elapsedSec=0, isRunning=false, activeTaskId to first undone task, and navigates to room
- `setIsRunning(b)` - toggles isRunning state
- `tickSession()` - increments elapsedSec by 1 while running, and completes current task when duration is reached
- `completeCurrent()` - completes current active task, resets elapsedSec and isRunning, and sets activeTaskId to next undone task
- `stopFocus()` - terminates current session and logs partial session if elapsedSec >= 60s
- `setAudioActive(b)` - sets audioActive flag for setup previews

Pomodoro phase machine:
- `phase: 'focus' | 'break' | 'review'` — current session phase
- `lastFocusSec: number` — duration of the last focus session (used to compute break length)
- `autoContinue: boolean` — when true, skips review sheet (focus→break→focus automatically); default false
- `setAutoContinue(b)` — toggle autoContinue
- `enterReview()` — called on focus completion (natural countdown or "Complete now"): if autoContinue, auto-logs session + enters break; else shows review sheet
- `reviewMarkDone(done)` — done=true: logs session, marks task done, advances activeTaskId; done=false: no-op (keep working)
- `startBreak()` — enters break phase, starts break timer
- `finishBreak()` — ends break: if autoContinue, auto-starts next focus; else returns to focus paused
- `focusAgain(durationSec)` — sets new duration and returns to focus phase
- `stopAllSessions()` — stops focus, navigates to history

Derived: `canStart()` - true when tasks.length > 0.
`shouldPlayAudio(state)` - selector function determining if audio should play based on screen and active flags.

## Decisions / notes
- No third-party router - screen switching via Zustand `screen` state + simple object map in App.tsx.
- No "Sign in" or "EN"/language control anywhere (explicit anti-regression requirement).
- Font loaded via @fontsource/hanken-grotesk (weights 300–700), never CDN.
- App frame uses `.app` class with max-width 1120px, border-radius 18px, centered on #d8dbde background.
- Tab group hidden on landing screen; visible on all other screens.
- Tab-to-screen mapping: Start → corner/sound/session; Focus → room; History → history.
- 1 task = 1 session: each task runs as its own timed session.
- Start focus requires ≥1 task (button disabled when tasks empty).
- Complete → logs Session + marks task done + advances to next task.
- Stop ≥60s → logs partial Session, task NOT marked done; <60s → no-op.
- Minutes rounding: max(1, Math.round(elapsedSec/60)) - minimum 1 minute logged.
- Room state pill: Ready (initial), Focusing (running), Paused (started but not running), Done (all tasks complete).
- Scene tint: subtle rgba overlay from corner gradient's first hex color.
- Persisted data = tasks, sessions, sound, setup, corner (version 1).
- Persistence activates only via `initPersistence()` from `main.tsx` - no auto-run, tests inject memory adapter.
- History helpers use manual date formatting (getHours/getMinutes, not toLocaleTimeString) for test determinism.
- Tauri store plugin wired: Cargo.toml, lib.rs plugin registration, capabilities/default.json store:default permission.
- OS integration:
  - All OS APIs (tray, menu, global shortcut, windows, events) are abstracted behind the `OsBridge` interface.
  - Off Tauri, `createOsBridge()` returns a no-op implementation and does not perform any dynamic imports, preventing runtime errors.
  - Global hotkey `CmdOrCtrl+Shift+M` registers from JS via Rust plugin and toggles play/pause of the active session.
  - Tray icon displays countdown as `"● mm:ss"` (when running) or `"mm:ss"` (when paused). Created lazily on first update.
  - Tray menu includes: Resume/Pause, Open mora, and Quit (using native `PredefinedMenuItem`).
- Sound:
  - Looping ambient track and background music are played using `HTMLAudioElement` instances.
  - Missing audio files are silently ignored, tolerating 404 load errors without breaking session logic.
  - Sound volume (0-100) is mapped to linear gain (0.0-1.0) and dynamically set via `.volume` changes.
  - Completion chime is synthesized dynamically offline using Web Audio API (Quick-attack oscillator sequence), requiring no static file assets.
  - On session completion (natural or manual click), a native OS notification is sent through `NotifyBridge` alongside the completion chime.
  - Audio and Notification components are fully stubbed/noop-ed in non-browser contexts (e.g., jsdom during tests) and off-Tauri.
- Packaging & Release:
  - Bundle identifier is set exactly to `space.mora` (reverse-DNS).
  - Target bundle config is set to `"all"`, allowing Tauri to build native DMG/App for macOS and AppImage/Debian for Linux.
  - High resolution `app-icon.svg` containing the rounded-square branding centered crescent moon glyph is used to generate the system target icons.
  - Distribution build relies on GitHub Actions matrix runner (`macos-latest` and `ubuntu-22.04`) to build native unsigned or signed installer bundles upon tagged release trigger.
- Scene Images & Room Background:
  - Corner cards show `/scenes/<slug>.jpg` layered over the gradient fallback (graceful if missing).
  - Scene slugs match audio slugs via `slug()`.
  - Paper theme remains unchanged.
  - Focus Room supports a background toggle: Color (flat theme) or Scene (immersive full-bleed image/video background + frosted glassmorphism timer card anchored bottom-left).
  - Scene mode plays optional loop-muted `<slug>.mp4` videos with graceful image/gradient fallbacks on error.
- Layout & Sizing:
  - Default window dimensions are updated to `1280×800` (min `900×640`), fully resizable and fullscreen-enabled in Tauri.
  - The application shell fills the entire window (width: 100%, min-height: 100vh) rather than being a centered card.
  - The Focus Room container stretches to the full height and width of the application viewport.
  - Non-Room screens are wrapped in a centered container capped at `max-width: 1160px` to maintain optimal readability on wide desktop monitors.
- Resumable Session & Continuous Audio:
  - The session runtime lives in the Zustand store (`elapsedSec`, `isRunning`, `sessionActive`, `activeTaskId`, `audioActive`), surviving page navigation and app quits (resuming paused on relaunch).
  - Landing screen displays a "Continue a previous session" widget when `sessionActive` is true, allowing quick resume or dismissal.
  - A single global `AudioEngine` singleton manages audio, and `useGlobalAudio()` mounted on `App.tsx` handles continuous play across screens without cutting/restarting.
  - In-Room Sound & Scene panel: Accessible via a gear button in the Room top bar, permitting live changes to ambient, music, volume, and scenes.

## How to run / test
- dev: `npm run tauri dev`
- web-only dev: `npm run dev`
- test: `npm test`

## How to build / release
- Compile native desktop bundles: `npm run build:desktop`
  - macOS output: `src-tauri/target/release/bundle/dmg/*.dmg` and `src-tauri/target/release/bundle/macos/mora.app`
  - Linux output: `src-tauri/target/release/bundle/appimage/*.AppImage` and `src-tauri/target/release/bundle/deb/*.deb`
- CI packaging: Release tags (`v*`) trigger GHA workflow matrix runner to compile target installers.

## Test inventory
### `src/test/store.test.ts` (5 tests)
- initial screen is 'landing'
- setScreen updates screen
- initial sound defaults (Wind, Nature, 18, 6)
- initial setup is 50 min / 3000s
- tasks and sessions start empty

### `src/test/shell.test.tsx` (6 tests)
- renders Landing by default (h1 + CTA present)
- tabs hidden on landing (Start/Focus/History not in DOM)
- CTA navigates to corner (placeholder shown, tabs visible)
- tabs are exactly Start, Focus, History (correct order, no extras)
- NO Sign in / EN (anti-regression on all tested screens)
- logo returns to landing (tabs hidden again)

### `src/test/setup.test.tsx` (16 tests)
Corner (4): renders all 9 corners; heading + subtitle; clicking corner sets store + navigates; corner pairing sets ambient.
Sound (5): renders 12 ambient chips + 6 music styles; selecting ambient; selecting music; default selections; preset hint.
Session (5): duration selection; add task; remove task; Start focus disabled/enabled; Start focus navigates.
Stepper (1): step=2 marks step 1 done + step 2 active.
Anti-regression (1): no Sign in / EN on setup screens.

### `src/test/timer.test.ts` (13 tests)
createTimer countdown/countup; tick no-op when not running; start/pause; tick advances; countdown clamps; remainingSec; isComplete; formatTime; purity; reset.

### `src/test/room.test.tsx` (13 tests)
Store logic (7): activeTask; completeActive logs+marks; minutes rounds; no-op when done; stopActive ≥60s; stopActive <60s; toggleTask.
Room screen (5): renders active+Play; Play/Pause pill; Complete now; all done; adding task.
Anti-regression (1): no Sign in / EN on Room.

### `src/test/persistence.test.tsx` (10 tests)
- memory adapter round-trip (deep-equal, different reference)
- toPersisted stamps version and carries fields
- migrate(null) === null
- migrate wrong version → current version
- localStorage adapter round-trip
- localStorage missing key → null
- localStorage corrupt JSON → null
- initPersistence hydrates store from adapter
- initPersistence saves on change
- import side-effect free (no auto-run)

### `src/test/history.test.tsx` (10 tests)
Helpers (5): formatMinutes (45m, 1h 0m, 1h 30m); formatClock (HH:MM); isToday/dayLabel today; dayLabel yesterday; dayLabel older date.
Screen (4): renders sessions newest-first; today stats correct; empty state; Clear empties sessions.
Anti-regression (1): no Sign in / EN on History.

### `src/test/osFormat.test.ts` (4 tests)
- EV constants have the exact string values
- trayTitle formats correctly
- buildTick with null timer
- buildTick with active timer

### `src/test/osSync.test.tsx` (7 tests)
- pushTick running -> updateTray with dot, emit TICK
- pushTick paused -> updateTray without dot
- pushTick(null, "") -> updateTray "mora"
- hotkey registered
- remote TOGGLE triggers onToggle
- remote STOP triggers onStop
- cleanup unlistens and unregisters hotkey

### `src/test/soundFormat.test.ts` (4 tests)
- volumeToGain converts correctly
- sessionCompleteNotification returns correct title and body
- slug converts names to lower kebab case
- audioManifest returns correct URLs

### `src/test/sound.test.tsx` (6 tests)
- initial config applied on mount
- changing store.sound updates engine
- setRunning play/pause controls loops
- complete("Write") triggers chime and notify
- noop engine safe
- createNotifyBridge off-Tauri without permission

### `src/test/config.test.ts` (6 tests)
- conf.productName is mora
- conf.identifier is space.mora and valid format
- conf.version matches package.json version
- windows config includes label main
- bundle config is active and valid
- bundle.icon contains .icns and .ico

### `src/test/scene.test.tsx` (2 tests)
- sceneUrl maps names correctly
- Corner thumbnails render with two-layer background

### `src/test/roomBg.test.tsx` (4 tests)
- default roomBackground is color
- setRoomBackground("scene") updates store
- toggling background option changes Room UI
- persistence includes roomBackground

### `src/test/audioEngineUnit.test.ts` (4 tests)
- creates a singleton AudioEngine
- sets track URLs correctly based on name
- play triggers play on mock audio elements
- dispose pauses mock audio elements but keeps src

### `src/test/roomScene.test.tsx` (4 tests)
- sceneVideoUrl maps corner names to mp4 files
- renders Room in scene mode with correct elements
- sets data-scene="true" on app root in scene mode and removes it in color mode
- toggles Tasks panel display in scene mode

### `src/test/session.test.tsx` (9 tests)
- startFocus sets sessionActive, activeTaskId=first undone, screen=room, elapsed 0, isRunning false
- tickSession increments elapsed only when running; does nothing when paused
- tickSession completes at durationSec
- completeCurrent logs + advances + resets
- stopFocus clears sessionActive/elapsed and applies partial-log rule
- shouldPlayAudio selector maps correctly
- runtime persists via toPersisted and hydrate
- Landing shows Resume when sessionActive and hides it otherwise
- navigate room->landing->room preserves elapsed

### `src/test/roomSettings.test.tsx` (5 tests)
- open/close settings panel toggle works
- changing ambient sound in panel updates store
- changing music style in panel updates store
- volume sliders in panel update store
- selecting a corner updates corner immediately

### `src/test/cornerPagination.test.tsx` (2 tests)
- sorts corners alphabetically and splits them into 8-item pages
- clicking Next and Prev navigates correctly

### `src/test/appearance.test.tsx` (7 tests)
- default roomBackground is color and app root has no data-scene
- switching to scene sets data-scene app-wide (including Landing)
- randomScene picks a corner from CORNERS and pairs ambient
- entering scene with no corner auto-randomizes
- appearance toggle renders on Landing and switches mode on click; scene-shuffle visible only in scene mode
- SceneBackground renders image + gradient (+ video source); graceful when corner null
- Color mode: .screen-content has no glass; Scene mode under [data-scene]: glass class is mounted

### Core UI Improvements
- Redesigned volume sliders app-wide (Sound screen + Room settings panel) into a minimalist 2px line and 10px circular thumb dot (`.`) with custom hover transitions and dark/light modes.
- Upgraded the in-Room settings panel scene selector to render miniature cards showing actual background image thumbnails and corner names instead of plain text/icons.
- Shared exact same layout/geometry between Color and Scene modes: reset `.screen-content` to `background: transparent`, `backdrop-filter: none`, and `padding: 0` in Scene mode to let setup content float naturally on the background.
- Overrode color tokens in Scene mode under `[data-scene="true"]` to render setup panels with translucent dark glass (`rgba(18,20,18,0.42)` with `16px` blur) and light text, keeping all text highly readable over any photo.
- Restored top navigation (`nav-bar`) to normal document flow (`position: relative`) in both modes to resolve vertical overlaps, while retaining custom dark-glass backings and white tab pills for Scene mode.
- Styled native range inputs (`input[type=range].volume-slider`) into custom volume sliders in both modes: 2px track (Color: `rgba(0,0,0,0.1)`, Scene: `rgba(255,255,255,0.22)`), 12px sage accent thumb, and a 2px boundary ring matching the surface.
- Removed all original 9 mock corners that did not have video files. Also removed the 3 missing scene corners (`Autumn Lakeside Cabin`, `Autumn River Campfire`, and `Cozy Cabin Thunderstorm`) since their source video files did not exist, keeping only the 24 actual scene corners in `src/data/corners.ts`.
- Updated test files (`setup.test.tsx`, `scene.test.tsx`, `roomSettings.test.tsx`, `cornerPagination.test.tsx` (updated to 3 pages), `appearance.test.tsx`) to assert on the new set of 24 corners.

### Start-flow polish
- **Live background preview**: `SceneBackground` video now uses `key={corner.id}` to force reload when the selected corner changes, so the background updates instantly on Corner/Sound/Session steps during preview.
- **Minimized corner cards**: Removed the `Ambient: X` pill from corner cards (both Color and Scene modes). Cards now show only: image thumbnail + name + description. Default ambient pairing still happens via `setCorner` logic.
- **Top-right wizard navigation**: Forward action relocated to a labeled button in the `nav-actions` area of `AppShell`:
  - Corner step → **"Sound →"**
  - Sound step → **"Session & tasks →"**
  - Session step → **"Start focus"** (disabled when `tasks.length === 0`)
  - Bottom primary buttons (`Continue`, `Start focus`) removed from `Sound.tsx` and `Session.tsx`; each step retains a bottom-left `Back` button.
- **Drag-to-reorder tasks**: Added `reorderTasks(from, to)` store action (immutable splice). Task rows in both `Session.tsx` and `Room.tsx` are now `draggable` with native HTML5 drag events. A subtle 6-dot grip handle (`⋮⋮`) appears faint and darkens on row hover (styled via `.task-row .drag-handle` in `globals.css`).
- **New tests**: Added `src/test/reorder.test.tsx` (2 tests): store-level `reorderTasks` action + component-level drag-and-drop UI verification.

### `src/test/pomodoro.test.tsx` (20 tests)
breakForSeconds mapping (6): 25m→5m, 50m→10m, 1.5h→15m, 2h→20m, Count Up→10m, fallback ratio clamped.
NEXT_DURATIONS (1): correct labels and seconds.
enterReview (2): sets review phase when manual; uses elapsedSec for count-up.
reviewMarkDone (2): true logs+marks+advances; false keeps current.
startBreak (1): sets break phase running.
finishBreak (2): manual returns paused; autoContinue auto-starts focus.
focusAgain (1): sets new duration + resets to focus.
stopAllSessions (1): stops + navigates to history.
autoContinue path (2): skips review (focus→break→focus); stops when no undone tasks.
break phase in tickSession (1): countdown + auto-finish.
Room review-phase render (1): renders review sheet with all elements.

### Note on updated tests
- `room.test.tsx`: "Complete now" test updated to verify review sheet appears; "all tasks done" test updated to go through review flow.
- `session.test.tsx`: "tickSession completes at durationSec" updated to verify review phase instead of direct completion.

### Pomodoro patch (break scaling + review sheet + loop)
- **Phase machine**: focus → review (or auto-continue: focus → break → focus). On focus completion (natural countdown to 0 or "Complete now"), `enterReview()` is called.
- **Review sheet**: renders in both Color and Scene modes. Row A: "Mark done" / "Keep working". Row B: "Take a break {Xm}" / "Focus again" (expands duration chips 25/50/1.5h/2h) / "Stop".
- **Break phase**: amber-tinted timer, "Rest a little" label, "Skip break" control. Auto-calls `finishBreak()` when countdown reaches 0.
- **autoContinue** (default off, persisted): when on, skips review sheet — focus→break→focus until no undone tasks remain or user stops.
- **stopAllSessions()**: routes to History screen.
- **Break scaling** (`breakForSeconds`): 25m→5m, 50m→10m, 1.5h→15m, 2h→20m, Count Up→10m, fallback ratio clamped 5–20m.

**Total: 159 tests (11 Phase 1 + 16 Phase 2 + 26 Phase 3 + 20 Phase 4 + 11 Phase 5 + 10 Phase 6 + 6 Phase 7 + 37 Patches + 2 Reorder + 20 Pomodoro)**

### Scene Corners List Update
- **Added 20 new scene corners** (deduplicated and renamed from `scene_xxxxxx.mp4` files using `rename_scenes.py` with custom under-5-word names and descriptions).
- **Total active corners increased to 44**, mapped dynamically in `src/data/corners.ts` and `metadata.json`.
- **Deduplication**: Removed the duplicate scene files (`scene_a8a4be.mp4` / `scene_9c7745.mp4` for countryside-morning-river).
- **Pagination tests**: Updated `src/test/cornerPagination.test.tsx` to handle 6 pages (44 corners) alphabetically and verify correct next/prev page navigation.

### Pagination Styling Fix (Color & Scene Mode Mapping)
- **Resolved Scene Mode override conflict**: Replaced custom inline styles for pagination buttons with the `.pagination-btn` CSS class to prevent general `[data-scene="true"]` button overrides (e.g. `background: var(--surface) !important`) from rendering active and inactive buttons identically in Scene Mode.
- **Enhanced hover states**: Added hover overrides in `globals.css` for both modes.
- **Removed unused hooks/variables**: Cleaned up the unused variables (`roomBackground`, `isSceneMode`, and `setScreen`) from `Corner.tsx`. (Note: `setScreen` was later restored to support the relocated bottom navigation button).

### Setup Flow Layout Polish
- **Simplified Corner Pagination**: Removed the page number list buttons and the page text indicator. Now only shows centered `"Prev"` and `"Next"` buttons directly next to each other.
- **Relocated Navigation Buttons**:
  - Moved `"Sound →"` button from the top-right header in `AppShell.tsx` to the bottom-right corner of `Corner.tsx` using a balanced three-column flex layout (Spacer on the left, centered pagination in the middle, `"Sound →"` button on the right).
  - Moved `"Session & tasks →"` button from the top-right header in `AppShell.tsx` to the bottom-right corner of `Sound.tsx` (using the existing bottom bar alongside the `"Back"` button).
  - Keeps only `"Start focus"` button in the top-right header (disabled when `tasks.length === 0`).
  - Adjusted unit tests in `src/test/cornerPagination.test.tsx` to align with the simplified pagination.

### Height Constraint & Overflow Scrolling Fixes
- **Refactoring to Fixed Bottom Bar & Scrollable Content Split**:
  - Re-structured `Corner.tsx`, `Sound.tsx`, and `Session.tsx` to have a top-level flex column wrapper (`flex: 1`, `minHeight: 0`, `width: 100%`, and no height percentage). Removing the `height: 100%` prevents infinite content layout expansion issues in browsers when nested under parent containers with auto-calculated height.
  - Separated the layout into a **Scrollable Content Area** (`flex: 1`, `overflowY: 'auto'`, `minHeight: 0`, `paddingBottom: '24px'`) and a **Fixed Bottom Bar Area** (`flexShrink: 0`, `paddingTop: '16px'`).
  - By establishing a fully bounded flex chain from the root down to the screens, the bottom bar naturally stays pinned to the bottom of `.screen-content` (width <= 1160px) in both Color and Scene Mode. This ensures 100% pixel-perfect identical alignment and positioning across both modes.
  - Removed all loose `marginTop: 'auto'` references on the bottom bars to avoid flex conflicts.
- **Global Layout Constraints**:
  - Configured the top navbar style (`navStyle` in `AppShell.tsx`) with `flexShrink: 0` to prevent the navigation bar from compressing or shifting content height.
  - Added `minHeight: 0` to the `<main>` tag inside `AppShell.tsx` to prevent the flex container from expanding to fit its child contents, ensuring the flex height boundary is respected by the browser.
  - Updated `nonRoomWrapperStyle` and `nonRoomInnerStyle` (which contains class `.screen-content`) in `App.tsx` with `minHeight: 0` to properly function as bounded flex children, allowing child components to scroll contents instead of overflowing.
- **Flex Container constraints**: Explicitly configured `[data-scene="true"] .screen-content` in `globals.css` with `display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; height: auto !important; overflow: hidden !important;` to establish a stable bounding box in Scene Mode without inheriting `100vh` blindly under the navbar.
- **Solid Primary Action Buttons**: Ensured `.btn-primary` retains its solid green style (`background: var(--accent) !important; color: #ffffff !important;`) in both modes so it stands out clearly over any scene backdrop. Infused high-priority inline styles directly to primary buttons on all three wizard screens for guaranteed visibility.

## Reset Phase 1: Bounded Layout & CSS Purge
Marked as [Completed].
- Purged broad button selector overrides from `src/styles/globals.css` (specifically commented out catch-all button overrides under `[data-scene="true"] .screen-content button` to prevent conflicting with button states in Scene Mode).
- Declared a protected, solid style rule for `.btn-primary` at the bottom of `globals.css` to safeguard primary next action visibility across both Color and Scene Modes.
- Validated the root bounded flex container chain:
  - `<main>` tag wrapping children in `src/components/AppShell.tsx` uses strict flex item constraints (`flex: 1, display: "flex", flexDirection: "column", minHeight: 0`).
  - `nonRoomWrapperStyle` and `nonRoomInnerStyle` in `src/App.tsx` strictly enforce flex column direction and `min-height: 0` without hardcoded percentage heights.
  - Checked that `[data-scene="true"] .screen-content` in `globals.css` acts as a pure bounded pass-through container.
- Verified compilation with `npm run build` and tests with `npm test -- --run` successfully.

## Reset Phase 2: Screen Layout & Divider Unification
Marked as [Completed].
- Refactored `Corner.tsx`, `Sound.tsx`, and `Session.tsx` to enforce identical outer wrapper and scrollable content area layouts.
- Replaced custom or double-nested bottom bar wrapper structures with a single `unifiedBottomBarStyle` container on all three setup flow screens, forcing a uniform gray divider line (`borderTop: '1px solid var(--line)'`) across both Color and Scene Modes.
- Established correct horizontal element distribution inside the bottom bar:
  - `Corner.tsx`: 3-column layout (Empty spacer on the left, centered pagination with `Prev` and `Next` buttons in the middle, primary action `Sound →` button on the right).
  - `Sound.tsx` & `Session.tsx`: 2-column layout (Summary text on the left, buttons aligned right with `gap: '12px'`).
- Deleted unused style definitions (`bottomBarStyle`, `btnGroupStyle`) in screen components to prevent TypeScript compilation warnings.
- Ran production build `npm run build` and tests `npm test -- --run` successfully with zero regressions.
