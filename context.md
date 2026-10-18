# mora - context

A quiet focus timer for one user. Web app + PWA only (the Tauri desktop
build was removed 2026-10-18). Google sign-in, data synced with Firebase.
Plan and decisions: `PLAN-improve.md`.

## Stack

Vite 5 + React 18 + TypeScript, Zustand 4, Tailwind v4, Vitest + Testing
Library (jsdom). Firebase (Auth, Firestore, Storage, Functions).

## Layout of `src/`

- `core/` pure logic, no React, no device APIs: `timer` (format, remaining),
  `sessionTimer`, `pomodoro` (break lengths), `format` (dates, minutes),
  `soundFormat`, `uid`.
- `platform/` everything that touches the device or Firebase:
  `persistence` + `persist` (localStorage / memory), `audio`, `notify`,
  `customTrackDb` (IndexedDB, only for the one-time move to the cloud),
  `prefs` (theme), `firebase` / `firestore` / `storage` / `functions`.
- `store/useStore.ts` the single store: tasks, sessions, sound, setup,
  session runtime, pomodoro phase.
- `hooks/` `useSessionRuntime` (wall-clock sync, wake lock, chime +
  notification), `useGlobalAudio`, `useCloudSync`, `useIdle`.
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
- Sheet swipe (`ui/Sheet.tsx`): on phones (<768px) a sheet with `onClose`
  follows a drag down from its handle, or from anywhere when scrolled to the
  top; closes past 25% of its height or a flick over 0.5 px/ms, else springs
  back. ReviewSheet has no `onClose`, so it cannot be swiped away.
- Task done: a hairline strike scales across the name (`.strike`), the
  checkbox dot pops; rows already done on open show no effect.
- A finished focus block (focus -> review) makes the ring settle (`.ring-settle`)
  and send one ripple (`settleKey` from `FocusView` to `Ring`).
- Break: a faint circle breathes behind the ring text (`breath`, 4s in, 6s
  out, `Ring` prop `breath`); hidden under reduced motion.
- Minute/hour digits roll when they change (`ui/RollingDigits.tsx`); seconds
  do not, and rolling is off while the clock waits (drag, picker). The whole
  time is in an `sr-only` span.
- Scene parallax (`hooks/useParallax.ts`, used by `SceneLayer`): mouse devices
  only; the slide layer moves up to 12px against the mouse, eased in rAF,
  style written by ref. It settles back after 4s without input while the
  clock runs or in fullscreen.
- Ring drag (`ui/Ring.tsx`, `adjust` prop): while the clock waits, drag the
  band (outside 34% of the width) to pick 5-120 min in 5 min steps; the
  middle stays clickable. Also `role="slider"` with arrow keys. Haptic 4ms
  per step (`navigator.vibrate?.`, Android only).
- `stop` is a hold button (`ui/HoldButton.tsx`, 800ms with a growing hairline;
  a quick tap shows `hold`; keyboard click acts at once; reduced motion shows
  `holding…`).
- Audio: play fades in (800ms), pause fades out (450ms) before pausing,
  track changes fade the old track out first (350ms). See
  `platform/audio.ts`.

## PWA (web build)

- `public/manifest.webmanifest`, icons in `public/icons/` (made by
  `npm run icons` from `app-icon.svg`).
- `public/sw.js`: HTML stale-while-revalidate, `/assets` `/icons`
  `/scenes/*.jpg` cache-first, audio/video never cached (size, Range
  requests). Bump `CACHE` when the strategy changes.
- `platform/pwa.ts`: register the SW (production only),
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

Google sign-in with the one allowed email is always required
(`platform/auth.ts`, `ui/SignInView.tsx`). `platform/firebase.ts` is lazy (nothing loads on import),
uses a persistent offline cache, and its auth domain is the page host on
https (proxied by `vercel.json` to `kyphan38-mora-app.firebaseapp.com`) so
iPhone Safari sign-in works. Rules: edit `firestore.rules.template`, run
`npm run rules`, deploy with `firebase deploy --only firestore:rules`.
Emulators: `npm run emu`, then `npm run dev:emu`. Tests mock
`platform/auth` in `src/test/setup.ts`. Plan: `PLAN-sync.md`.

## Cloud sync

`hooks/useCloudSync.ts` lazy-loads `platform/sync.ts` once signed in.
Firestore `users/{uid}/tasks|sessions|notes/{id}` and `prefs/main`;
doc shapes in `core/syncModel.ts` (clamped to what the rules accept).
Snapshots apply through `store.applyRemote`; local changes are diffed by
fingerprint against the last remote copy and written in batches (deletes
included). First sync per device merges by id (`mora.synced.<uid>` in
localStorage). Device-only: mute, theme (the chosen track and "send to logi" sync).
Integration tests: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run
test:emu` (emulators: auth 9199, firestore 8180, storage 9399; rules from the
`*.emu.rules` files). `npm run emu` + launch config `mora-emu` (port 1430)
for trying the app against the emulators.

## Live timer across devices

`platform/liveSync.ts` shares the timer in `users/{uid}/live/current`
(`core/liveModel.ts`): elapsed at an anchor time, written on actions only
(`actionKey`), never on ticks. A device applying another's timer becomes a
follower (`liveFollower`): at the end it waits up to `TAKEOVER_SEC` for the
leader to log the block, then finishes it itself. Each device has a random
`mora.deviceId`. Natural ends carry `event`, so followers chime too.

## Deploy (web)

Vercel project `mora` from GitHub `kyphan38/mora`, single Vite app (not
"Services"). `vercel.json`:
SPA rewrite to `index.html`, `sw.js` and `index.html` never cached,
`/assets` immutable. Domain: `mora.kyphan38.com` (CNAME to Vercel). No
Firebase project kyphan38-mora-app (env `VITE_FIREBASE_*`, `VITE_ALLOWED_USER_EMAIL`).

## Link to logi

Live (PLAN-live-logi.md), off by default (Settings, synced per account): every run of the clock has a `runId`.
Function `liveToLogi` watches `live/current` and calls logi
`/api/ingest/mora/live` start/stop (one logi record `mora_<runId>` per
run, token `MORA_INGEST_TOKEN`). Stopping a mora record in logi triggers
logi's `moraStopped`, which calls mora's `stopFromLogi` (token
`LOGI_CONTROL_TOKEN`): the timer stops on every device and the block is
saved. Rules in `functions/src/live.ts` (tested from src/test). Status in
`users/{uid}/meta/logi`.

## Commands

- `npm run dev` web dev server (port 1420)
- `npm test` all tests; `npm run build` type check + build
- `npm run test:emu` emulator tests (Java 21, see Cloud sync)

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
(`hiddenScenes`, synced in prefs). New scenes from a downloaded file: `python3 scripts/import_scene.py <file>
"Title" [source]` (video: seamless crossfade loop; photo: still scene with
a slow CSS drift, `still: true`). Portrait screens use `<id>.portrait.mp4|jpg` when the scene has
`portrait: true` (`scripts/make-portrait.sh` cuts 9:16 from the middle).
Scene video is saved on the device after the first play
(`platform/mediaCache.ts`, Cache Storage, 500 MB LRU) and plays offline. Own music: `ui/MusicPicker.tsx` + `platform/trackUpload.ts`, Storage
`users/{uid}/audio/`, Firestore `users/{uid}/tracks`; the chosen track id
syncs in prefs; a device-saved track (IndexedDB) moves up once
(`migrateLocalTrack`).
Sounds: Cloud Storage `defaults/audio/ambient|music/<slug>.mp3` (slug from
`core/soundFormat.slug`), staged in `media/audio/`, uploaded with
`scripts/upload-defaults.sh audio`; the engine plays the device copy when
saved (same cache as scenes). Missing files degrade to a
gradient or silence. Scene tools live in `scripts/`.
