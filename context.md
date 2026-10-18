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

## PWA (web build)

- `public/manifest.webmanifest`, icons in `public/icons/` (made by
  `npm run icons` from `app-icon.svg`).
- `public/sw.js`: HTML stale-while-revalidate, `/assets` `/icons`
  `/scenes/*.jpg` cache-first, audio/video never cached (size, Range
  requests). Bump `CACHE` when the strategy changes.
- `platform/pwa.ts`: register the SW (production web only, never in Tauri),
  ask for persistent storage, ask notification permission on the first
  Play, hold a screen wake lock while running.
- Notifications on the web go through the SW registration when there is
  one (needed for iOS home-screen apps).

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

## Sign-in and Firebase

Web/PWA require Google sign-in with the one allowed email
(`platform/auth.ts`, `ui/SignInView.tsx`); the Tauri build skips it and
stays local. `platform/firebase.ts` is lazy (nothing loads on import),
uses a persistent offline cache, and its auth domain is the page host on
https (proxied by `vercel.json` to `kyphan38-mora-app.firebaseapp.com`) so
iPhone Safari sign-in works. Rules: edit `firestore.rules.template`, run
`npm run rules`, deploy with `firebase deploy --only firestore:rules`.
Emulators: `npm run emu`, then `npm run dev:emu`. Tests mock
`platform/auth` in `src/test/setup.ts`. Plan: `PLAN-sync.md`.

## Cloud sync (web/PWA, signed in)

`hooks/useCloudSync.ts` lazy-loads `platform/sync.ts` once signed in.
Firestore `users/{uid}/tasks|sessions|notes/{id}` and `prefs/main`;
doc shapes in `core/syncModel.ts` (clamped to what the rules accept).
Snapshots apply through `store.applyRemote`; local changes are diffed by
fingerprint against the last remote copy and written in batches (deletes
included). First sync per device merges by id (`mora.synced.<uid>` in
localStorage). Device-only: custom track, mute, theme, logi token.
Integration tests: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run
test:emu` (emulators: auth 9199, firestore 8180, storage 9399; rules from the
`*.emu.rules` files). `npm run emu` + launch config `mora-emu` (port 1430)
for trying the app against the emulators.

## Deploy (web)

Vercel project `mora` from GitHub `kyphan38/mora`, single Vite app (not
"Services"; `src-tauri` is ignored via `.vercelignore`). `vercel.json`:
SPA rewrite to `index.html`, `sw.js` and `index.html` never cached,
`/assets` immutable. Domain: `mora.kyphan38.com` (CNAME to Vercel). No
Firebase project kyphan38-mora-app (env `VITE_FIREBASE_*`, `VITE_ALLOWED_USER_EMAIL`).

## Link to logi

Off by default (Settings → send to logi). Each logged session becomes a
block `{id, kind, label, startAt, endAt}` in a persisted `outbox`
(`core/logiLink.ts`); the block ends at the session end and lasts its
focused minutes. `hooks/useLogiSync.ts` queues sessions that just ended
(not history loaded from storage), sends up to 50 per request to
`<logi>/api/ingest/mora` with `Bearer <token>`, retries on `online` and
every 5 minutes, drops accepted and permanently rejected blocks, keeps
`write-failed` ones. logi stores each block as doc `mora_<id>` (resends
are safe), source `mora`. Edits or deletes in mora History after sending
are not synced. logi side: `logi/src/app/api/ingest/mora/route.ts`, env
`MORA_INGEST_TOKEN`.

## Commands

- `npm run dev` web dev server (port 1420)
- `npm test` all tests; `npm run build` type check + build
- `npm run tauri dev` desktop dev; `npm run build:desktop` bundle (see
  `RELEASE.md`)

## Assets

Scenes: list in `src/data/scenes.json` (descriptions in
`data/corners.ts`); files in Cloud Storage `defaults/scenes/<id>.mp4|jpg`
(public read, URLs from `data/sceneManifest.ts`). Local staging in
`media/scenes/` (git-ignored); `scripts/upload-defaults.sh` uploads new
files (gsutil, long cache). Bucket CORS: `storage.cors.json`
(`gsutil cors set storage.cors.json gs://kyphan38-mora-app.firebasestorage.app`).
Owner uploads (`ui/ScenePicker.tsx`, `platform/sceneUpload.ts`): Storage
`users/{uid}/scenes/<id>.mp4|jpg` (thumbnail taken in the browser),
listed in Firestore `users/{uid}/scenes`; defaults can only be hidden
(`hiddenScenes`, synced in prefs). Scene video is saved on the device after the first play
(`platform/mediaCache.ts`, Cache Storage, 500 MB LRU) and plays offline. `public/audio/ambient|music/<slug>.mp3`
where slug comes from `core/soundFormat.slug`. Missing files degrade to a
gradient or silence. Scene tools live in `scripts/`.
